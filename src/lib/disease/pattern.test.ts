import { describe, expect, it } from 'vitest';
import { patternAgreement, spinTest } from './pattern';

describe('patternAgreement', () => {
  it('is one when the regions reached first carry the most measured tau', () => {
    expect(patternAgreement([1, 2, 3, 4], [9, 7, 5, 3])).toBeCloseTo(1, 6);
  });

  it('is minus one when the regions reached first carry the least', () => {
    expect(patternAgreement([1, 2, 3, 4], [3, 5, 7, 9])).toBeCloseTo(-1, 6);
  });

  it('ranks regions the model never reaches last, tied together', () => {
    const reached = patternAgreement([1, 2, Infinity, Infinity], [9, 7, 2, 2]);
    expect(reached).toBeCloseTo(patternAgreement([1, 2, 3, 3], [9, 7, 2, 2]), 6);
    expect(reached).toBeGreaterThan(0.9);
  });
});

describe('spinTest', () => {
  const arrival = [1, 2, 3, 4, 5, 6];
  const measured = [9, 8, 7, 6, 5, 4];

  it('reports the agreement on the real map', () => {
    expect(spinTest(arrival, measured, [[0, 1, 2, 3, 4, 5]]).rho).toBeCloseTo(1, 6);
  });

  it('scores each spin by moving the measured values, not the model', () => {
    const reversed = [5, 4, 3, 2, 1, 0];
    const result = spinTest(arrival, measured, [reversed]);
    expect(result.nullMean).toBeCloseTo(-1, 6);
    expect(result.p).toBeCloseTo(0.5, 6);
  });

  it('counts the real map among the nulls, so p is never zero', () => {
    const identity = [0, 1, 2, 3, 4, 5];
    expect(spinTest(arrival, measured, [identity, identity, identity]).p).toBe(1);
    expect(spinTest(arrival, measured, [[5, 4, 3, 2, 1, 0]]).p).toBeGreaterThan(0);
  });
});
