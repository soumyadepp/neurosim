import { describe, expect, it } from 'vitest';
import { epicenterFit } from './epicenter';
import type { SpreadParams } from './spread';

const PARAMS: SpreadParams = { spreadRate: 0.01, growthRate: 0.35, seedLevel: 0.05, years: 30, dt: 0.05, sampleEvery: 1 };

function chain(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (Math.abs(i - j) === 1 ? 1 : 0)));
}

describe('epicenterFit', () => {
  it('finds the region a damage pattern actually spread from', () => {
    const n = 8;
    const atrophy = Array.from({ length: n }, (_, i) => Math.exp(-i / 2));
    const fit = epicenterFit(chain(n), atrophy, PARAMS, 20);
    expect(fit.node).toBe(0);
    expect(fit.r).toBeGreaterThan(0.8);
  });

  it('reports a median across seeds that is below the best seed', () => {
    const n = 8;
    const atrophy = Array.from({ length: n }, (_, i) => Math.exp(-i / 2));
    const fit = epicenterFit(chain(n), atrophy, PARAMS, 20);
    expect(fit.median).toBeLessThan(fit.r);
  });

  it('returns a seed that exists in the connectome', () => {
    const fit = epicenterFit(chain(5), [1, 0.5, 0.2, 0.1, 0], PARAMS, 20);
    expect(fit.node).toBeGreaterThanOrEqual(0);
    expect(fit.node).toBeLessThan(5);
  });
});
