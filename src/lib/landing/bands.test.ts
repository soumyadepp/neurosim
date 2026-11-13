import { describe, expect, it } from 'vitest';
import { bandVerdict } from './bands';

describe('bandVerdict', () => {
  it('counts a result as solid only when it survives correction for every test run', () => {
    expect(bandVerdict(0.004, 6)).toBe('solid');
    expect(bandVerdict(0.004, 20)).toBe('suggestive');
  });

  it('reports a nominal result as suggestive rather than solid', () => {
    expect(bandVerdict(0.018, 6)).toBe('suggestive');
  });

  it('reports a result at or above the plain threshold as indistinguishable from chance', () => {
    expect(bandVerdict(0.05, 6)).toBe('none');
    expect(bandVerdict(0.056, 6)).toBe('none');
  });
});
