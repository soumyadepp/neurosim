import { pearson } from '../wholebrain/stats';
import { simulateSpread, tauAt, type SpreadParams } from './spread';

export interface EpicenterFit {
  node: number;
  r: number;
  median: number;
}

/**
 * Asks whether the spread model can reproduce a measured atrophy pattern, and from where.
 *
 * Every region in turn is used as the seed, the model is run, and the resulting damage is compared
 * with the measured map. The best-matching seed is the model's implied epicentre. The median across
 * all seeds is returned alongside it, because picking the best of 68 is a fitted choice and the
 * median says how much of the match any seed would have produced.
 */
export function epicenterFit(sc: number[][], atrophy: number[], params: SpreadParams, year: number): EpicenterFit {
  const scores = sc.map((_, node) => {
    const spread = simulateSpread({ sc, seeds: [node], params });
    return pearson(tauAt(spread, year), atrophy);
  });
  const best = scores.reduce((a, b, i) => (b > scores[a] ? i : a), 0);
  const sorted = [...scores].sort((x, y) => x - y);
  return { node: best, r: scores[best], median: sorted[Math.floor(sorted.length / 2)] };
}
