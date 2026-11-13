import { describe, expect, it } from 'vitest';
import { normalisedLaplacian, simulateSpread, tauAt, type SpreadParams } from './spread';

const chain = (n: number) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (Math.abs(i - j) === 1 ? 2 : 0)));

const PARAMS: SpreadParams = { spreadRate: 0.6, growthRate: 0.5, seedLevel: 0.05, years: 30, dt: 0.02, sampleEvery: 0.5 };

describe('normalisedLaplacian', () => {
  it('scales the strongest edge to one and makes every row sum to zero', () => {
    const L = normalisedLaplacian(chain(3));
    expect(Array.from(L)).toEqual([1, -1, 0, -1, 2, -1, 0, -1, 1]);
  });
});

describe('simulateSpread', () => {
  it('stays at zero without a seed', () => {
    const res = simulateSpread({ sc: chain(4), seeds: [], params: PARAMS });
    expect(res.tau.every(row => row.every(v => v === 0))).toBe(true);
  });

  it('samples from year zero to the horizon', () => {
    const res = simulateSpread({ sc: chain(4), seeds: [0], params: PARAMS });
    expect(res.times[0]).toBe(0);
    expect(res.times.at(-1)).toBeCloseTo(30);
    expect(res.tau[0][0]).toBeCloseTo(0.05);
  });

  it('reaches neighbours before distant regions and never leaves 0..1', () => {
    const res = simulateSpread({ sc: chain(5), seeds: [0], params: PARAMS });
    const mid = res.tau[Math.floor(res.tau.length / 3)];
    expect(mid[0]).toBeGreaterThan(mid[1]);
    expect(mid[1]).toBeGreaterThan(mid[2]);
    expect(mid[2]).toBeGreaterThan(mid[4]);
    for (const row of res.tau) for (const v of row) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
  });

  it('only accumulates over time', () => {
    const res = simulateSpread({ sc: chain(5), seeds: [0], params: PARAMS });
    const totals = res.tau.map(row => row.reduce((a, b) => a + b, 0));
    for (let k = 1; k < totals.length; k++) expect(totals[k]).toBeGreaterThanOrEqual(totals[k - 1] - 1e-12);
  });

  it('conserves the seeded amount when there is no local growth', () => {
    const res = simulateSpread({ sc: chain(5), seeds: [2], params: { ...PARAMS, growthRate: 0 } });
    const total = res.tau.at(-1)!.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(0.05, 6);
  });

  it('matches the untreated course until treatment starts, then slows it', () => {
    const sc = chain(6);
    const base = simulateSpread({ sc, seeds: [0], params: PARAMS });
    const treated = simulateSpread({ sc, seeds: [0], params: PARAMS, treatment: { startYear: 10, efficacy: 0.5 } });
    const k10 = base.times.indexOf(10);
    expect(treated.tau[k10]).toEqual(base.tau[k10]);
    const sum = (row: number[]) => row.reduce((a, b) => a + b, 0);
    expect(sum(treated.tau.at(-1)!)).toBeLessThan(sum(base.tau.at(-1)!));
  });

  it('treats zero efficacy as no treatment', () => {
    const sc = chain(4);
    const base = simulateSpread({ sc, seeds: [0], params: PARAMS });
    const none = simulateSpread({ sc, seeds: [0], params: PARAMS, treatment: { startYear: 5, efficacy: 0 } });
    expect(none.tau).toEqual(base.tau);
  });
});

describe('tauAt', () => {
  it('interpolates between samples and clamps at the ends', () => {
    const res = { times: [0, 1], tau: [[0, 0.2], [1, 0.4]] };
    expect(tauAt(res, 0.5)).toEqual([0.5, 0.30000000000000004]);
    expect(tauAt(res, -3)).toEqual([0, 0.2]);
    expect(tauAt(res, 9)).toEqual([1, 0.4]);
  });
});
