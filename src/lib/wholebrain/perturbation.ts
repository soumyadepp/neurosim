import type { ChemId, Chemistry } from '../sim/catalog';

/**
 * How a neurotransmitter level shifts a region's excitability (its Hopf bifurcation parameter),
 * weighted by that region's PET-measured density of the receptor that transmitter acts on.
 * A positive gain moves the region towards oscillation, a negative gain damps it.
 */
interface PerturbationRule {
  chem: ChemId;
  receptor: string;
  gain: number;
}

export const PERTURBATION_RULES: PerturbationRule[] = [
  { chem: 'gaba', receptor: 'GABAa', gain: -0.15 },
  { chem: 'glutamate', receptor: 'NMDA', gain: 0.1 },
  { chem: 'dopamine', receptor: 'D1', gain: 0.05 },
  { chem: 'acetylcholine', receptor: 'M1', gain: 0.05 },
  { chem: 'serotonin', receptor: '5HT1a', gain: -0.05 },
];

/**
 * Per-node bifurcation parameters under a given chemistry.
 */
export function nodeBifurcation(baseA: number, receptorNames: string[], receptors: number[][], chem: Chemistry): Float64Array {
  const a = new Float64Array(receptors.length).fill(baseA);
  for (const rule of PERTURBATION_RULES) {
    const delta = chem[rule.chem] - 1;
    const k = receptorNames.indexOf(rule.receptor);
    if (delta === 0 || k < 0) continue;
    for (let i = 0; i < receptors.length; i++) a[i] += rule.gain * delta * receptors[i][k];
  }
  return a;
}

/**
 * Long-range cortical projections are glutamatergic, so global coupling follows glutamate.
 */
export function couplingScale(chem: Chemistry): number {
  return Math.max(0, chem.glutamate);
}
