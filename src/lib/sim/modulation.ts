import { REGIONS, RI, type Chemistry } from './catalog';

export type ReceptorProfile = Partial<Record<string, number>>;
export type ReceptorProfiles = Partial<Record<string, ReceptorProfile>>;

/**
 * Per-region synaptic gains, threshold shift and background drive for the spiking network.
 */
export interface RegionModulation {
  exc: Float32Array;
  inh: Float32Array;
  thr: Float32Array;
  noise: Float32Array;
}

const FRONTAL = new Set([RI.prefrontal, RI.frontal, RI.motor]);

/**
 * The receptors each transmitter acts through in this model. Only receptors that push the same
 * way are grouped: 5HT1a and 5HT1b are both inhibitory autoreceptors, M1 and A4B2 both depolarise.
 * D2 is left out of the dopamine term because it opposes D1, and 5HT2a out of serotonin because it
 * opposes 5HT1a, so averaging them in would cancel the effect the model is trying to express.
 */
const FAMILIES = {
  glutamate: ['NMDA', 'mGluR5'],
  gaba: ['GABAa'],
  acetylcholine: ['M1', 'A4B2'],
  serotonin: ['5HT1a', '5HT1b'],
  dopamine: ['D1'],
} as const;

/**
 * Mean density of a transmitter's receptors in one region, relative to the cortical average.
 * Receptors the profile does not list count as average, so a missing map never shifts the result.
 */
function density(profile: ReceptorProfile, transmitter: keyof typeof FAMILIES): number {
  const names = FAMILIES[transmitter];
  let total = 0;
  for (const name of names) total += profile[name] ?? 1;
  return total / names.length;
}

/**
 * Folds chemistry, the active drug and regional receptor densities into per-region parameters.
 * Each transmitter's deviation from baseline is weighted by the density of the receptor it acts on,
 * relative to the cortical average. Without receptor data every density is 1, which reproduces the
 * original global model exactly.
 */
export function regionModulation(
  chem: Chemistry,
  drug: { thr: number; noiseMul: number },
  baseNoise: number,
  profiles: ReceptorProfiles | null,
): RegionModulation {
  const R = REGIONS.length;
  const out: RegionModulation = {
    exc: new Float32Array(R),
    inh: new Float32Array(R),
    thr: new Float32Array(R),
    noise: new Float32Array(R),
  };
  for (let r = 0; r < R; r++) {
    const p = profiles?.[REGIONS[r].id] ?? {};
    const d = (t: keyof typeof FAMILIES) => density(p, t);
    out.exc[r] = Math.max(0, 1 + (chem.glutamate - 1) * d('glutamate'));
    out.inh[r] = Math.max(0, 1 + (chem.gaba - 1) * d('gaba'));
    out.thr[r] = (chem.gaba - 1) * 5 * d('gaba') - (chem.acetylcholine - 1) * 3 * d('acetylcholine') + drug.thr;
    if (FRONTAL.has(r)) out.thr[r] -= (chem.dopamine - 1) * 4 * d('dopamine');
    out.noise[r] = Math.max(
      0,
      baseNoise * (1 - 0.35 * (chem.serotonin - 1) * d('serotonin')) * (1 + 0.5 * (chem.dopamine - 1) * d('dopamine')) * drug.noiseMul,
    );
  }
  return out;
}
