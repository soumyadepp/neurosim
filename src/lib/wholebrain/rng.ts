export interface Rng {
  uniform(): number;
  gaussian(): number;
}

/**
 * Seeded mulberry32 generator with Box-Muller normals, so model runs are reproducible.
 */
export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  let spare: number | null = null;
  const uniform = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gaussian = () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u = 0;
    while (u === 0) u = uniform();
    const v = uniform();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
  return { uniform, gaussian };
}
