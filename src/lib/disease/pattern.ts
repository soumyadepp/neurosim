import { spearman } from '../wholebrain/stats';

export interface SpinResult {
  rho: number;
  nullMean: number;
  p: number;
}

/**
 * Rank agreement between the order in which the model reaches regions and how much tau was
 * measured in them. Positive means the regions the model reaches first are the ones carrying the
 * most tau in patients. Regions never reached rank last, tied together.
 */
export function patternAgreement(arrival: number[], measured: number[]): number {
  const finite = arrival.filter(Number.isFinite);
  const late = (finite.length ? Math.max(...finite) : 0) + 1;
  return -spearman(arrival.map(t => (Number.isFinite(t) ? t : late)), measured);
}

/**
 * Scores the model against a measured map and against spatially rotated copies of that map.
 *
 * Brain maps are smooth, so some agreement is expected from any smooth pattern. Each spin keeps
 * the measured values and their smoothness but moves them to the wrong place on the cortex, and
 * the share of spins that agree at least as well as the real map is the p-value. The real map is
 * counted among them, so the smallest possible p is one over the number of spins plus one.
 */
export function spinTest(arrival: number[], measured: number[], spins: number[][]): SpinResult {
  const rho = patternAgreement(arrival, measured);
  const nulls = spins.map(spin => patternAgreement(arrival, spin.map(i => measured[i])));
  const asGood = nulls.filter(v => v >= rho).length;
  return {
    rho,
    nullMean: nulls.reduce((a, b) => a + b, 0) / nulls.length,
    p: (1 + asGood) / (1 + nulls.length),
  };
}
