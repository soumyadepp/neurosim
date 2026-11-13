import { SCENARIOS, type ScenarioId } from './disease/scenarios';

export type Route = { page: 'landing' } | { page: 'evidence' } | { page: 'story'; scenario?: ScenarioId } | { page: 'lab' };

/**
 * Reads the page from the URL hash: the landing page, the evidence page, the story (optionally
 * opened on one condition) or the lab. Anything unrecognised falls back to the landing page.
 */
export function parseRoute(hash: string): Route {
  const [page, arg] = hash.replace(/^#\/?/, '').split('/');
  if (page === 'lab') return { page: 'lab' };
  if (page === 'evidence') return { page: 'evidence' };
  if (page === 'story') {
    const scenario = SCENARIOS.find(s => s.id === arg)?.id;
    return scenario ? { page: 'story', scenario } : { page: 'story' };
  }
  return { page: 'landing' };
}

export function hashFor(route: Route): string {
  if (route.page === 'landing') return '#/';
  if (route.page === 'evidence') return '#/evidence';
  if (route.page === 'lab') return '#/lab';
  return route.scenario ? `#/story/${route.scenario}` : '#/story';
}
