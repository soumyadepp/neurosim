import type { BrainData } from '../data/brainData';
import { REGIONS, RI } from '../sim/catalog';

type Rgb = [number, number, number];

function hex(h: string): Rgb {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Single-hue blue ramp (steps 100 to 700 of the validated chart palette) for magnitudes such as receptor density.
 */
export const SEQUENTIAL: Rgb[] = ['#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b'].map(hex);

/**
 * Blue to red through a neutral grey, for signed values such as correlation centred on zero.
 */
export const DIVERGING: Rgb[] = ['#1c5cab', '#86b6ef', '#f0efec', '#f0a090', '#c0302f'].map(hex);

/**
 * Seven Yeo networks in the validated categorical order. The canonical Yeo colours fail colour-blind
 * separation (limbic vs frontoparietal), so these replace them; names always appear in the legend.
 */
export const NETWORK_ORDER = ['Visual', 'Somatomotor', 'Dorsal attention', 'Ventral attention', 'Limbic', 'Frontoparietal', 'Default mode'];

export const NETWORK_COLORS: Record<string, Rgb> = Object.fromEntries(
  ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'].map((h, i) => [NETWORK_ORDER[i], hex(h)]),
);

export function rgbCss([r, g, b]: Rgb): string {
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

const UNKNOWN: Rgb = [0.6, 0.6, 0.6];

export function sampleRamp(ramp: Rgb[], t: number): Rgb {
  const x = Math.min(1, Math.max(0, t)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x)), f = x - i;
  return [0, 1, 2].map(k => ramp[i][k] + (ramp[i + 1][k] - ramp[i][k]) * f) as Rgb;
}

/**
 * Maps values onto 0..1. Diverging data is scaled symmetrically about zero so zero sits at 0.5.
 */
export function normalise(values: number[], kind: 'sequential' | 'diverging'): number[] {
  if (kind === 'diverging') {
    const m = Math.max(...values.map(Math.abs));
    return values.map(v => (m > 0 ? 0.5 + v / (2 * m) : 0.5));
  }
  const lo = Math.min(...values), hi = Math.max(...values);
  return values.map(v => (hi > lo ? (v - lo) / (hi - lo) : 0.5));
}

function pack(colors: Rgb[]): Float32Array {
  const out = new Float32Array(colors.length * 3);
  colors.forEach((c, i) => out.set(c, i * 3));
  return out;
}

export function paintRegions(brain: BrainData): Float32Array {
  return pack(brain.nodes.map(n => REGIONS[RI[n.simRegion]].color));
}

export function paintNetworks(brain: BrainData): Float32Array {
  return pack(brain.nodes.map(n => NETWORK_COLORS[n.network] ?? UNKNOWN));
}

export function paintScalar(values: number[], kind: 'sequential' | 'diverging'): Float32Array {
  const ramp = kind === 'diverging' ? DIVERGING : SEQUENTIAL;
  return pack(normalise(values, kind).map(t => sampleRamp(ramp, t)));
}

/**
 * Fixed 0 to 1 scale for tau: neutral tissue through to saturated, in one orange hue (the second
 * sequential context after blue). The scale is absolute, so colours compare across ages.
 */
export const TAU_RAMP: Rgb[] = ['#e8e5df', '#f5c9b0', '#ef9a72', '#eb6834', '#b4461b', '#6e2a0f'].map(hex);

export function paintTau(tau: number[]): Float32Array {
  return pack(tau.map(t => sampleRamp(TAU_RAMP, t)));
}

/**
 * Theme-aware colours for the three disease-course series, resolved by CSS custom properties so
 * dark mode gets the palette's dark steps. The hues are the first three categorical slots, which
 * validate all-pairs for colour-blind separation; tau keeps orange to match its cortex ramp.
 */
export const COURSE_COLORS = { tau: 'var(--series-tau)', network: 'var(--series-network)', decline: 'var(--series-decline)' } as const;
