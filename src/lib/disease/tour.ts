import type { Milestones } from './progression';

export type TourStep = 'start' | 'biomarker' | 'symptoms' | 'care' | 'treat';

/**
 * The guided first visit: from the silent start through each milestone, ending on the treatment
 * choice so the visitor's first interaction is the question the tool exists to answer.
 */
export const TOUR_STEPS: TourStep[] = ['start', 'biomarker', 'symptoms', 'care', 'treat'];

/**
 * Year the timeline should rest at for a step: the start, a milestone, or wherever it already is.
 */
export function tourStopYear(step: TourStep, m: Milestones, current: number): number {
  if (step === 'start') return 0;
  if (step === 'treat') return current;
  return m[step] ?? current;
}
