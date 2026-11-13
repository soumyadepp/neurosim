import { RI } from './catalog';
import { fbm, valueNoise } from './noise';

/**
 * A surface point plus a fourth shading term (groove depth or folia strength, 0..1).
 */
export type ShadedPoint = [number, number, number, number];

/**
 * Clamped smoothstep from a to b.
 */
export function sstep(a: number, b: number, t: number): number {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

/**
 * Signed distance from the Sylvian (lateral) fissure in unit-sphere coordinates.
 * The fissure starts low at the temporal pole and climbs as it runs backwards.
 */
export function sylvianDist(y: number, z: number): number {
  return y - (-0.10 - 0.30 * z);
}

/**
 * Sulcal pattern: the zero-crossing contours of a domain-warped noise field are long meandering
 * curves, which is what gyri and sulci look like. G is groove strength, crest is gyral crest, both 0..1.
 */
function sulci(x: number, y: number, z: number, side: number): { G: number; crest: number } {
  const wx = valueNoise(x * 2.0 + 11, y * 2.0, z * 2.0) - 0.5;
  const wy = valueNoise(x * 2.0, y * 2.0 + 17, z * 2.0) - 0.5;
  const wz = valueNoise(x * 2.0, y * 2.0, z * 2.0 + 23) - 0.5;
  const qx = x * 4.3 + wx * 1.4 + side * 3, qy = y * 4.3 + wy * 1.4, qz = z * 4.3 + wz * 1.4;
  const n1 = valueNoise(qx, qy, qz);
  const n2 = valueNoise(qx * 1.8 + 7, qy * 1.8 + 3, qz * 1.8 + 5);
  const g1 = Math.exp(-Math.pow((n1 - 0.5) / 0.065, 2));
  const g2 = Math.exp(-Math.pow((n2 - 0.5) / 0.05, 2)) * 0.6;
  return { G: Math.min(1, g1 + g2), crest: Math.min(1, Math.abs(n1 - 0.5) * 2.6) };
}

/**
 * Side-view silhouette of a hemisphere as a polar curve. Angle 0 points to the frontal pole,
 * 90 degrees to the vertex, 180 to the occipital pole, 270 to the underside. Values are
 * fractions of the half-length, sampled every 30 degrees and interpolated with Catmull-Rom.
 */
const SIL = [1.0, 0.94, 0.80, 0.70, 0.73, 0.85, 0.96, 0.84, 0.64, 0.56, 0.62, 0.84];

function silhouette(th: number): number {
  let t = (th / (Math.PI * 2)) * 12;
  t = ((t % 12) + 12) % 12;
  const i = Math.floor(t), f = t - i;
  const p0 = SIL[(i + 11) % 12], p1 = SIL[i], p2 = SIL[(i + 1) % 12], p3 = SIL[(i + 2) % 12];
  return 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}

/**
 * Maps a unit-sphere point to the hemisphere surface. side is -1 (left) or +1 (right).
 * Convention: +x right, +y up, +z toward the face. The fourth value is groove depth.
 */
export function shapePoint(x: number, y: number, z: number, side: number, m: number): ShadedPoint {
  const u = x * side;
  const lat = sstep(0.15, 0.55, u);
  const sd = sylvianDist(y, z);
  const tl = (1 - sstep(-0.30, -0.02, sd)) * lat * sstep(-0.65, -0.35, z) * (1 - sstep(0.45, 0.75, z));
  const { G, crest } = sulci(x, y, z, side);
  const syl = Math.exp(-Math.pow(sd / 0.035, 2)) * lat * sstep(-0.6, -0.3, z) * (1 - sstep(0.4, 0.7, z));
  const zc = 0.02 + 0.16 * (1 - Math.max(0, y)) - 0.08 * Math.max(0, -y);
  const central = Math.exp(-Math.pow((z - zc) / 0.05, 2)) * sstep(-0.05, 0.25, sd) * sstep(0.05, 0.35, u) * sstep(-0.3, 0.2, y);
  const groove = Math.min(1, G * (u > 0 ? 1 : 0.55) + central * 1.2 + syl * 1.5);
  let rad = 1 - 0.075 * groove + 0.035 * crest * (1 - groove) + 0.012 * (fbm(x * 1.5, y * 1.5, z * 1.5) - 0.5);
  if (u < 0) rad = 1 - 0.03 * groove;
  const rho = silhouette(Math.atan2(y, z)) * 1.05;
  const uS = u > 0 ? u : u * 0.10;
  const width = (1 - 0.30 * sstep(0.3, 1.0, z)) * (1 - 0.28 * sstep(-0.5, -1.0, z)) * (1 + 0.10 * sstep(0.2, -0.6, y));
  let px = (0.04 + uS * 0.72) * width;
  let py = y * rho + 0.03 * z;
  let pz = z * rho;
  px += 0.10 * tl; py -= 0.06 * tl; pz += 0.10 * tl * sstep(-0.1, 0.5, z);
  px *= rad; py *= rad; pz *= rad;
  return [side * px * m, py * m, pz * m, groove];
}

/**
 * Maps a unit-ball point into the cerebellum, with folia, lobules and a vermis groove.
 */
export function cerebellumPoint(x: number, y: number, z: number, m: number): ShadedPoint {
  const folia = 0.5 + 0.5 * Math.cos(y * 44 + z * 5 + 1.5 * valueNoise(x * 3, y * 3, z * 3));
  const lobules = 0.5 + 0.5 * Math.cos(y * 11 + x * 2);
  const vermis = Math.exp(-Math.pow(x / 0.16, 2));
  const r = (1 - 0.018 * folia - 0.03 * lobules - 0.06 * vermis * (1 - Math.abs(y))) * m;
  return [x * 0.60 * r, -0.66 + y * 0.34 * r, -0.55 + z * 0.44 * r, folia];
}

/**
 * Maps cylindrical coordinates (t along the stem, angle, radius fraction) into the brainstem with a pons bulge.
 */
export function brainstemPoint(t: number, ang: number, rad: number): ShadedPoint {
  const ay = -0.40 - 0.80 * t, az = -0.16 - 0.30 * t;
  const pons = 1 + 0.45 * Math.exp(-Math.pow((t - 0.38) / 0.16, 2)) * (0.6 + 0.4 * Math.max(0, Math.sin(ang)));
  const R = (0.16 - 0.04 * t) * rad * pons;
  return [Math.cos(ang) * R, ay, az + Math.sin(ang) * R, 0];
}

/**
 * Assigns a cortical region from unit-sphere coordinates. u is lateral distance (positive = outer surface).
 */
export function regionOf(u: number, y: number, z: number, side: number): number {
  if (z < -0.62) return RI.visual;
  const sd = sylvianDist(y, z);
  if (u > 0.25 && sd < -0.03 && z > -0.55 && z < 0.62 && y < 0.12) {
    if (side < 0 && z > -0.45 && z < -0.10 && sd > -0.24 && u > 0.45) return RI.wernicke;
    if (sd > -0.24 && z > -0.3 && z < 0.18) return RI.auditory;
    return RI.temporal;
  }
  if (side < 0 && z > 0.18 && z < 0.52 && sd > -0.03 && sd < 0.26 && u > 0.5) return RI.broca;
  if (z > 0.55) return RI.prefrontal;
  if (z > 0.14) return RI.frontal;
  if (z > 0.0) return RI.motor;
  if (z > -0.18) return RI.somato;
  return RI.parietal;
}
