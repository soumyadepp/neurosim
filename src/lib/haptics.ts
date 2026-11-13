export type Haptic = 'select' | 'milestone';

const PATTERNS: Record<Haptic, number | number[]> = {
  select: 8,
  milestone: [0, 10, 45, 18],
};

/**
 * Fires a short vibration on touch devices.
 *
 * Does nothing on a mouse pointer, and nothing where the browser has no Vibration API, which
 * notably includes every browser on iOS. Callers treat it as a silent enhancement.
 *
 * Args:
 *   kind: Which pattern to play.
 *
 * Returns:
 *   True when a vibration was actually requested.
 */
export function haptic(kind: Haptic): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  if (typeof matchMedia === 'function' && !matchMedia('(pointer: coarse)').matches) return false;
  return navigator.vibrate(PATTERNS[kind]);
}

/**
 * Whether moving between two years passes any of the given milestones.
 *
 * Args:
 *   from: The year being left.
 *   to: The year being moved to.
 *   milestones: Milestone years, where null means never reached.
 *
 * Returns:
 *   True when at least one milestone lies between the two years.
 */
export function crossesAny(from: number, to: number, milestones: (number | null)[]): boolean {
  const lo = Math.min(from, to), hi = Math.max(from, to);
  return milestones.some(m => m !== null && m > lo && m <= hi);
}
