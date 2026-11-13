import type { BrainData } from '../data/brainData';
import { BASELINE_CHEMISTRY } from '../sim/catalog';
import { DEFAULT_MODEL, specFromHealth } from '../wholebrain/bridge';
import type { ModelSpec } from '../wholebrain/experiment';
import { healthFromTau } from './progression';
import { SPREAD_DEFAULTS } from './scenarios';

export const START_AGE = 50;
export const HORIZON = SPREAD_DEFAULTS.years;
export const NETWORK_TIMES = Array.from({ length: HORIZON / 2 + 1 }, (_, i) => i * 2);

/**
 * Coupling the whole-brain model uses for disease runs: the best fit to real fMRI found by the
 * coupling sweep on the Data tab.
 */
export const DISEASE_COUPLING = 1.3;

/**
 * Repeats used for each year of the disease timeline. Fewer than the headline fit uses, because the
 * timeline needs 18 evaluations and reads a relative change rather than an absolute score.
 */
export const TIMELINE_REPEATS = 3;

/**
 * Whole-brain model spec for a brain thinned by the given regional tau, at baseline chemistry.
 */
export function diseaseSpec(brain: BrainData, tau: number[]): ModelSpec {
  const settings = { ...DEFAULT_MODEL, G: DISEASE_COUPLING };
  return specFromHealth(brain, healthFromTau(tau), BASELINE_CHEMISTRY, {
    ...settings,
    sim: { ...settings.sim, repeats: TIMELINE_REPEATS },
  });
}
