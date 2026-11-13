import { describe, expect, it } from 'vitest';
import { hashFor, parseRoute } from './route';

describe('parseRoute', () => {
  it('opens the landing page by default', () => {
    expect(parseRoute('')).toEqual({ page: 'landing' });
    expect(parseRoute('#/')).toEqual({ page: 'landing' });
    expect(parseRoute('#/nonsense')).toEqual({ page: 'landing' });
  });

  it('reads the evidence page', () => {
    expect(parseRoute('#/evidence')).toEqual({ page: 'evidence' });
  });

  it('reads the story, with an optional condition, and the lab', () => {
    expect(parseRoute('#/story')).toEqual({ page: 'story' });
    expect(parseRoute('#/story/ftd')).toEqual({ page: 'story', scenario: 'ftd' });
    expect(parseRoute('#/story/unknown')).toEqual({ page: 'story' });
    expect(parseRoute('#/lab')).toEqual({ page: 'lab' });
  });

  it('round-trips through hashFor', () => {
    for (const r of [{ page: 'landing' }, { page: 'evidence' }, { page: 'story' }, { page: 'story', scenario: 'pca' }, { page: 'lab' }] as const) {
      expect(parseRoute(hashFor(r))).toEqual(r);
    }
  });
});
