import { disease, setScenario } from './disease.svelte';
import { setMode, ui } from './engine.svelte';
import { hashFor, parseRoute, type Route } from './route';

export const nav = $state({ route: parseRoute(location.hash) as Route });

/**
 * Applies the current URL: picks the app mode and, for a story link, the condition to open on.
 */
function apply(): void {
  const route = parseRoute(location.hash);
  nav.route = route;
  if (route.page === 'lab') {
    if (!ui.dev) { go({ page: 'story' }); return; }
    setMode('lab');
  }
  if (route.page === 'story') {
    if (route.scenario) {
      if (disease.active) setScenario(route.scenario);
      else disease.scenario = route.scenario;
    }
    setMode('story');
  }
}

export function go(route: Route): void {
  const hash = hashFor(route);
  if (location.hash === hash) apply();
  else location.hash = hash;
}

export function startRouter(): () => void {
  apply();
  window.addEventListener('hashchange', apply);
  return () => window.removeEventListener('hashchange', apply);
}
