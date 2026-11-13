import { describe, expect, it } from 'vitest';
import { TOUR_STEPS, tourStopYear } from './tour';

const m = { biomarker: 9, network: 12, symptoms: 18, care: 25 };

describe('tour', () => {
  it('walks start, biomarker, symptoms, care, then treatment', () => {
    expect(TOUR_STEPS).toEqual(['start', 'biomarker', 'symptoms', 'care', 'treat']);
  });

  it('stops at the start, at each milestone, and stays put for the treatment step', () => {
    expect(tourStopYear('start', m, 20)).toBe(0);
    expect(tourStopYear('biomarker', m, 0)).toBe(9);
    expect(tourStopYear('symptoms', m, 9)).toBe(18);
    expect(tourStopYear('care', m, 18)).toBe(25);
    expect(tourStopYear('treat', m, 25)).toBe(25);
  });

  it('stays at the current year when a milestone is never reached', () => {
    expect(tourStopYear('care', { ...m, care: null }, 18)).toBe(18);
  });
});
