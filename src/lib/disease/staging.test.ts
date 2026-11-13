import { describe, expect, it } from 'vitest';
import { arrivalTimes, BRAAK_STAGE, braakAgreement } from './staging';

describe('arrivalTimes', () => {
  it('returns the first sampled time each region crosses the threshold', () => {
    const res = { times: [0, 1, 2], tau: [[0.5, 0, 0], [0.6, 0.3, 0], [0.7, 0.5, 0.1]] };
    expect(arrivalTimes(res, 0.25)).toEqual([0, 1, Infinity]);
  });
});

describe('braakAgreement', () => {
  it('is perfect when regions are reached in Braak order', () => {
    const labels = ['entorhinal', 'parahippocampal', 'middletemporal', 'superiorfrontal', 'precentral'];
    const out = braakAgreement(labels, [0, 2, 5, 9, 14]);
    expect(out.rho).toBeCloseTo(1);
    expect(out.regions).toBe(5);
  });

  it('is negative when the order is reversed and ignores unstaged labels', () => {
    const out = braakAgreement(['entorhinal', 'precentral', 'unknown'], [10, 1, 0]);
    expect(out.rho).toBeLessThan(0);
    expect(out.regions).toBe(2);
  });

  it('stages the entorhinal cortex first and primary motor cortex last', () => {
    expect(BRAAK_STAGE.entorhinal).toBe(1);
    expect(BRAAK_STAGE.precentral).toBe(6);
  });
});
