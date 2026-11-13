import { describe, expect, it } from 'vitest';
import { ATROPHY_MAX, buildCourse, crossing, disruption, functionDecline, healthFromTau, meanWithin, phaseAt, tauBurden, THRESHOLDS } from './progression';

describe('healthFromTau', () => {
  it('never kills a region outright', () => {
    expect(healthFromTau([0, 0.5, 1])).toEqual([1, 1 - ATROPHY_MAX / 2, 1 - ATROPHY_MAX]);
  });
});

describe('tauBurden', () => {
  it('is the cortical mean at each sample', () => {
    expect(tauBurden({ times: [0, 1], tau: [[0, 0.2], [0.4, 0.6]] })).toEqual([0.1, 0.5]);
  });
});

describe('functionDecline', () => {
  const res = { times: [0, 1, 2, 3], tau: [[0, 0], [0.1, 0.9], [0.4, 0.9], [1, 0.9]] };

  it('stays at zero while damage is within reserve', () => {
    const d = functionDecline(res, [0], 0.2);
    expect(d[0]).toBe(0);
    expect(d[1]).toBe(0);
    expect(d[2]).toBeCloseTo(0.25);
    expect(d[3]).toBe(1);
  });

  it('declines later with more reserve', () => {
    const low = functionDecline(res, [0], 0.05);
    const high = functionDecline(res, [0], 0.3);
    expect(high[2]).toBeLessThan(low[2]);
  });
});

describe('crossing', () => {
  it('interpolates the first upward crossing', () => {
    expect(crossing([0, 2, 4], [0, 0.4, 0.8], 0.5)).toBeCloseTo(2.5);
  });

  it('is null when the threshold is never reached', () => {
    expect(crossing([0, 1], [0, 0.1], 0.5)).toBeNull();
  });

  it('returns the first time when already above', () => {
    expect(crossing([3, 4], [0.9, 1], 0.5)).toBe(3);
  });
});

describe('meanWithin', () => {
  it('averages the off-diagonal entries among the chosen nodes', () => {
    const fc = [1, 0.5, 0.1, 0.5, 1, 0.3, 0.1, 0.3, 1];
    expect(meanWithin(fc, 3, [0, 1])).toBeCloseTo(0.5);
    expect(meanWithin(fc, 3, [0, 1, 2])).toBeCloseTo(0.3);
  });
});

describe('disruption', () => {
  it('is the fractional loss from the first value and never negative', () => {
    expect(disruption([0.2, 0.21, 0.1, 0])).toEqual([0, 0, 0.5, 1]);
    expect(disruption([])).toEqual([]);
  });
});

describe('buildCourse', () => {
  it('puts each milestone where its curve crosses its threshold', () => {
    const times = [0, 10, 20, 30];
    const res = { times, tau: [[0, 0], [0.04, 0.04], [0.5, 0.5], [1, 1]] };
    const course = buildCourse(res, [0, 1], 0, [0, 10, 20], [0.5, 0.45, 0.25]);
    expect(course.tau).toEqual([0, 0.04, 0.5, 1]);
    expect(course.milestones.biomarker).toBeCloseTo(10 * THRESHOLDS.biomarker / 0.04);
    expect(course.milestones.network).toBeCloseTo(10);
    expect(course.milestones.symptoms).toBeCloseTo(10 + 10 * (THRESHOLDS.symptoms - 0.04) / 0.46);
    expect(course.milestones.care).toBeGreaterThan(course.milestones.symptoms!);
  });

  it('leaves the network milestone open while its simulation is still running', () => {
    const res = { times: [0, 1], tau: [[0], [1]] };
    expect(buildCourse(res, [0], 0, [0, 1], []).milestones.network).toBeNull();
  });
});

describe('phaseAt', () => {
  it('moves from silent to detectable to symptoms to care', () => {
    const m = { biomarker: 9, network: 12, symptoms: 18, care: 25 };
    expect(phaseAt(m, 3)).toBe('silent');
    expect(phaseAt(m, 10)).toBe('detectable');
    expect(phaseAt(m, 20)).toBe('symptoms');
    expect(phaseAt(m, 30)).toBe('care');
    expect(phaseAt({ biomarker: null, network: 4, symptoms: null, care: null }, 5)).toBe('detectable');
  });
});
