import { describe, expect, it } from 'vitest';
import { correlationMatrix, meanUpperTriangle, pearson, spearman, upperTriangleR } from './stats';

describe('pearson', () => {
  it('is 1 for perfectly correlated data and -1 for anti-correlated data', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
  });

  it('is 0 when either input has no variance', () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBe(0);
  });
});

describe('correlationMatrix', () => {
  it('correlates columns of a row-major samples-by-nodes series', () => {
    const series = Float64Array.from([1, 2, 5, 2, 4, 3, 3, 6, 1]);
    const m = correlationMatrix(series, 3, 3);
    expect(m[0]).toBeCloseTo(1);
    expect(m[1]).toBeCloseTo(1);
    expect(m[2]).toBeCloseTo(-1);
    expect(m[3]).toBeCloseTo(m[1]);
    expect(m[8]).toBeCloseTo(1);
  });
});

describe('upper triangle helpers', () => {
  const a = Float64Array.from([1, 0.2, 0.4, 0.2, 1, 0.6, 0.4, 0.6, 1]);
  const b = Float64Array.from([9, 0.1, 0.2, 0.1, -9, 0.3, 0.2, 0.3, 9]);

  it('ignores the diagonal when correlating matrices', () => {
    expect(upperTriangleR(a, b, 3)).toBeCloseTo(1);
  });

  it('averages off-diagonal entries', () => {
    expect(meanUpperTriangle(a, 3)).toBeCloseTo(0.4);
  });
});

describe('spearman', () => {
  it('ranks before correlating and averages ties', () => {
    expect(spearman([1, 2, 3, 4], [10, 100, 1000, 10000])).toBeCloseTo(1);
    expect(spearman([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1);
    expect(spearman([1, 1, 2], [1, 1, 2])).toBeCloseTo(1);
  });
});
