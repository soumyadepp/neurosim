import { describe, expect, it } from 'vitest';
import { gradeAgainstChance } from './verdict';

describe('gradeAgainstChance', () => {
  it('counts a result as solid only when it survives correction for every test run', () => {
    expect(gradeAgainstChance(0.004, 6)).toBe('solid');
    expect(gradeAgainstChance(0.004, 20)).toBe('suggestive');
  });

  it('reports a nominal result as suggestive rather than solid', () => {
    expect(gradeAgainstChance(0.018, 6)).toBe('suggestive');
  });

  it('reports a result at or above the plain threshold as indistinguishable from chance', () => {
    expect(gradeAgainstChance(0.05, 6)).toBe('none');
    expect(gradeAgainstChance(0.056, 6)).toBe('none');
  });
});
