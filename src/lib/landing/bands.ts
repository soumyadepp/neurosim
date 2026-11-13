export type BandVerdict = 'solid' | 'suggestive' | 'none';

const ALPHA = 0.05;

/**
 * Grades one result out of a family of tests run together.
 *
 * Testing several rhythms at once makes a lucky hit more likely, so a result only counts as solid
 * when it clears the threshold divided by the number of tests (Bonferroni). One that clears the
 * plain threshold but not the corrected one is reported as suggestive rather than dropped.
 *
 * Args:
 *   p: Spin-test p-value for this result.
 *   tests: How many results were tested together.
 *
 * Returns:
 *   The grade for this result.
 */
export function bandVerdict(p: number, tests: number): BandVerdict {
  if (p < ALPHA / tests) return 'solid';
  return p < ALPHA ? 'suggestive' : 'none';
}
