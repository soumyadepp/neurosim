import type { SpreadResult } from './spread';

/**
 * Share of a region's neurons lost at full tau saturation. Real end-stage cortex thins badly but
 * is never empty.
 */
export const ATROPHY_MAX = 0.8;

export function healthFromTau(tau: number[]): number[] {
  return tau.map(t => 1 - ATROPHY_MAX * t);
}

/**
 * Mean tau across all cortical regions at each sample: what a whole-brain tau measure tracks.
 */
export function tauBurden(res: SpreadResult): number[] {
  return res.tau.map(row => row.reduce((a, b) => a + b, 0) / row.length);
}

/**
 * Decline (0 healthy, 1 lost) of the function carried by a set of regions. Damage up to the reserve
 * buffer is absorbed; beyond it, function falls in proportion to the remaining damage.
 */
export function functionDecline(res: SpreadResult, regions: number[], reserve: number): number[] {
  return res.tau.map(row => {
    const damage = regions.reduce((a, i) => a + row[i], 0) / Math.max(1, regions.length);
    return Math.min(1, Math.max(0, (damage - reserve) / (1 - reserve)));
  });
}

/**
 * Time at which a rising curve first reaches the threshold, interpolated between samples.
 */
export function crossing(times: number[], values: number[], threshold: number): number | null {
  if (values[0] >= threshold) return times[0];
  for (let k = 1; k < values.length; k++) {
    if (values[k] >= threshold) {
      const f = (threshold - values[k - 1]) / (values[k] - values[k - 1]);
      return times[k - 1] + f * (times[k] - times[k - 1]);
    }
  }
  return null;
}

/**
 * Mean functional connectivity among a set of regions, excluding each region with itself.
 */
export function meanWithin(fc: ArrayLike<number>, n: number, nodes: number[]): number {
  let sum = 0, count = 0;
  for (const i of nodes) for (const j of nodes) if (i !== j) { sum += fc[i * n + j]; count++; }
  return count ? sum / count : 0;
}

export type ReserveLevel = 'low' | 'typical' | 'high';

/**
 * Share of damage to the symptom network that cognitive reserve absorbs before function slips
 * (Stern 2012).
 */
export const RESERVE: Record<ReserveLevel, number> = { low: 0.05, typical: 0.15, high: 0.3 };

/**
 * When each signal counts as found. Biomarker: mean cortical tau of 2 percent, about one
 * saturated region pair, which is when tau-PET and plasma p-tau turn positive. Network: a 10
 * percent drop in connectivity within the attacked network, the order of effect resting-state fMRI
 * resolves. Symptoms and care: 15 and 60 percent decline of the function that network carries.
 */
export const THRESHOLDS = { biomarker: 0.02, network: 0.1, symptoms: 0.15, care: 0.6 };

export interface Milestones {
  biomarker: number | null;
  network: number | null;
  symptoms: number | null;
  care: number | null;
}

export interface Course {
  times: number[];
  tau: number[];
  decline: number[];
  networkTimes: number[];
  network: number[];
  milestones: Milestones;
}

export type Phase = 'silent' | 'detectable' | 'symptoms' | 'care';

/**
 * Fractional loss of each value relative to the first, floored at zero.
 */
export function disruption(values: number[]): number[] {
  if (!values.length) return [];
  const base = values[0];
  return values.map(v => (base > 0 ? Math.max(0, 1 - v / base) : 0));
}

/**
 * The three curves of one disease course and the milestones where they cross their thresholds.
 * The network curve may be partial while its simulation is still running.
 */
export function buildCourse(res: SpreadResult, regions: number[], reserve: number, networkTimes: number[], networkValues: number[]): Course {
  const tau = tauBurden(res);
  const decline = functionDecline(res, regions, reserve);
  const network = disruption(networkValues);
  return {
    times: res.times,
    tau,
    decline,
    networkTimes,
    network,
    milestones: {
      biomarker: crossing(res.times, tau, THRESHOLDS.biomarker),
      network: network.length ? crossing(networkTimes.slice(0, network.length), network, THRESHOLDS.network) : null,
      symptoms: crossing(res.times, decline, THRESHOLDS.symptoms),
      care: crossing(res.times, decline, THRESHOLDS.care),
    },
  };
}

/**
 * Where a year falls in the course: before any test could find it, detectable but silent,
 * symptomatic, or needing full-time care.
 */
export function phaseAt(m: Milestones, year: number): Phase {
  if (m.care !== null && year >= m.care) return 'care';
  if (m.symptoms !== null && year >= m.symptoms) return 'symptoms';
  const found = [m.biomarker, m.network].filter((v): v is number => v !== null);
  if (found.length && year >= Math.min(...found)) return 'detectable';
  return 'silent';
}
