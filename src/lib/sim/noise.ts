/**
 * Deterministic integer hash mapped to [0, 1].
 */
export function hash3(ix: number, iy: number, iz: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1013904223);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967295;
}

/**
 * Smoothly interpolated 3D value noise in [0, 1].
 */
export function valueNoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c000 = hash3(ix, iy, iz), c100 = hash3(ix + 1, iy, iz), c010 = hash3(ix, iy + 1, iz), c110 = hash3(ix + 1, iy + 1, iz);
  const c001 = hash3(ix, iy, iz + 1), c101 = hash3(ix + 1, iy, iz + 1), c011 = hash3(ix, iy + 1, iz + 1), c111 = hash3(ix + 1, iy + 1, iz + 1);
  return l(l(l(c000, c100, sx), l(c010, c110, sx), sy), l(l(c001, c101, sx), l(c011, c111, sx), sy), sz);
}

/**
 * Three octaves of value noise, used to fold the cortex surface.
 */
export function fbm(x: number, y: number, z: number): number {
  return 0.55 * valueNoise(x, y, z) + 0.3 * valueNoise(x * 2.1 + 5, y * 2.1, z * 2.1) + 0.15 * valueNoise(x * 4.3, y * 4.3 + 9, z * 4.3);
}

/**
 * Standard normal sample via Box-Muller.
 */
export function gauss(): number {
  let u = 0, w = 0;
  while (u === 0) u = Math.random();
  while (w === 0) w = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
}
