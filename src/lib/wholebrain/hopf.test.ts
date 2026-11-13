import { describe, expect, it } from 'vitest';
import { buildCoupling, simulateFc, simulateFcMean, type HopfParams } from './hopf';
import { meanUpperTriangle } from './stats';

const n = 5;
const ring = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : 1)));
const fast = { samples: 400, tr: 0.72, dt: 0.1, burnIn: 50, seed: 3 };

function params(G: number, health?: Float64Array): HopfParams {
  return {
    n,
    coupling: buildCoupling(ring, { health }),
    G,
    a: new Float64Array(n).fill(-0.3),
    omega: new Float64Array(n).fill(2 * Math.PI * 0.05),
    sigma: 0.02,
  };
}

describe('buildCoupling', () => {
  it('scales structural weights so the strongest edge is 0.2', () => {
    const c = buildCoupling([[0, 4], [4, 0]], {});
    expect(Array.from(c)).toEqual([0, 0.2, 0.2, 0]);
  });

  it('raises homotopic edges to a floor relative to the strongest edge', () => {
    const sc = [[0, 1, 0], [1, 0, 0], [0, 0, 0]];
    const c = buildCoupling(sc, { homotopic: [[0, 2]], homotopicStrength: 0.5 });
    expect(c[0 * 3 + 2]).toBeCloseTo(0.1);
    expect(c[2 * 3 + 0]).toBeCloseTo(0.1);
    expect(c[0 * 3 + 1]).toBeCloseTo(0.2);
  });

  it('silences every edge touching a dead node', () => {
    const c = buildCoupling(ring, { health: Float64Array.from([0, 1, 1, 1, 1]) });
    for (let j = 0; j < n; j++) {
      expect(c[0 * n + j]).toBe(0);
      expect(c[j * n + 0]).toBe(0);
    }
    expect(c[1 * n + 2]).toBeCloseTo(0.2);
  });
});

describe('simulateFc', () => {
  it('is reproducible for a fixed seed', () => {
    expect(Array.from(simulateFc(params(0.5), fast))).toEqual(Array.from(simulateFc(params(0.5), fast)));
  });

  it('produces near-independent nodes without coupling', () => {
    expect(Math.abs(meanUpperTriangle(simulateFc(params(0), fast), n))).toBeLessThan(0.15);
  });

  it('synchronises nodes as global coupling rises', () => {
    const weak = meanUpperTriangle(simulateFc(params(0), fast), n);
    const strong = meanUpperTriangle(simulateFc(params(1.5), fast), n);
    expect(strong).toBeGreaterThan(weak + 0.2);
  });

  it('disconnects a lesioned node from the rest of the network', () => {
    const health = Float64Array.from([0, 1, 1, 1, 1]);
    const fc = simulateFc(params(1.5, health), fast);
    const toLesion = [1, 2, 3, 4].map(j => Math.abs(fc[j]));
    const amongHealthy = fc[1 * n + 2];
    expect(Math.max(...toLesion)).toBeLessThan(0.2);
    expect(amongHealthy).toBeGreaterThan(0.3);
  });

  it('keeps a symmetric matrix with a unit diagonal', () => {
    const fc = simulateFc(params(0.8), fast);
    for (let i = 0; i < n; i++) {
      expect(fc[i * n + i]).toBeCloseTo(1);
      for (let j = 0; j < n; j++) expect(fc[i * n + j]).toBeCloseTo(fc[j * n + i]);
    }
  });
});

describe('simulateFcMean', () => {
  const params = (): HopfParams => {
    const n = 6;
    const sc = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : 1)));
    return {
      n,
      coupling: buildCoupling(sc, {}),
      G: 0.5,
      a: new Float64Array(n).fill(-0.2),
      omega: new Float64Array(n).fill(2 * Math.PI * 0.05),
      sigma: 0.02,
    };
  };
  const opts = { samples: 180, tr: 0.72, dt: 0.1, burnIn: 20, seed: 1 };

  it('matches a single run when asked for one repeat', () => {
    expect(Array.from(simulateFcMean(params(), opts, 1))).toEqual(Array.from(simulateFc(params(), opts)));
  });

  it('varies less between runs than a single simulation does', () => {
    const spread = (repeats: number) => {
      const a = simulateFcMean(params(), { ...opts, seed: 1 }, repeats);
      const b = simulateFcMean(params(), { ...opts, seed: 101 }, repeats);
      let worst = 0;
      for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
      return worst;
    };
    expect(spread(6)).toBeLessThan(spread(1));
  });

  it('uses a different seed for every repeat', () => {
    const one = simulateFcMean(params(), opts, 1);
    const three = simulateFcMean(params(), opts, 3);
    expect(Array.from(three)).not.toEqual(Array.from(one));
  });
});
