import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../disease/scenarios';
import { HERO_SPREAD, HIPPOCAMPUS, REGIONS, SILHOUETTE, START_SPOTS, SULCI } from './brainShape';

describe('brainShape', () => {
  it('ships the seven regions with real closed paths', () => {
    expect(REGIONS.map(r => r.id).sort()).toEqual(['brainstem', 'cerebellum', 'frontal', 'occipital', 'parietal', 'temporal']);
    for (const r of [...REGIONS, HIPPOCAMPUS]) {
      expect(r.path.startsWith('M') && r.path.endsWith('Z')).toBe(true);
      expect(r.label.x).toBeGreaterThan(0);
    }
    expect(SILHOUETTE.length).toBeGreaterThan(100);
    expect(SULCI.length).toBeGreaterThanOrEqual(4);
  });

  it('spreads hero tau from the memory system outwards in Braak order', () => {
    expect(HERO_SPREAD.length).toBe(34);
    expect(HERO_SPREAD[0].at).toBe(0);
    const ats = HERO_SPREAD.map(b => b.at);
    expect([...ats].sort((a, b) => a - b)).toEqual(ats);
    for (const b of HERO_SPREAD) {
      expect(b.x).toBeGreaterThan(0);
      expect(b.x).toBeLessThan(400);
      expect(b.y).toBeGreaterThan(0);
      expect(b.y).toBeLessThan(300);
    }
  });

  it('gives every scenario at least one real starting spot', () => {
    for (const s of SCENARIOS) expect(START_SPOTS[s.id].length).toBeGreaterThan(0);
  });
});
