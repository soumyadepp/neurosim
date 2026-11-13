import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('is reproducible for the same seed', () => {
    const a = createRng(42), b = createRng(42);
    for (let i = 0; i < 20; i++) expect(a.gaussian()).toBe(b.gaussian());
  });

  it('differs across seeds', () => {
    expect(createRng(1).uniform()).not.toBe(createRng(2).uniform());
  });

  it('draws uniforms in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const u = rng.uniform();
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it('draws standard normals', () => {
    const rng = createRng(3);
    const xs = Array.from({ length: 20000 }, () => rng.gaussian());
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.abs(variance - 1)).toBeLessThan(0.05);
  });
});
