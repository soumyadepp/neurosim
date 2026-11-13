import type { BrainData } from '../data/brainData';
import { RI, type Chemistry } from '../sim/catalog';
import type { NeuroSim } from '../sim/network';
import type { ModelSpec } from './experiment';

/**
 * Tunable model settings exposed in the UI. Defaults come from fitting the Hopf model to the
 * Hansen 2022 connectome and HCP resting-state FC. Five repeats average out the sampling noise of
 * a single noisy run, which lifts the match against real data from about 0.33 to about 0.40.
 */
export interface ModelSettings {
  G: number;
  homotopicStrength: number;
  baseA: number;
  frequencyHz: number;
  sigma: number;
  sim: ModelSpec['sim'];
}

export const DEFAULT_MODEL: ModelSettings = {
  G: 0.7,
  homotopicStrength: 0.5,
  baseA: -0.3,
  frequencyHz: 0.05,
  sigma: 0.02,
  sim: { samples: 1200, tr: 0.72, dt: 0.1, burnIn: 100, seed: 1, repeats: 5 },
};

export const COUPLING_SWEEP = Array.from({ length: 17 }, (_, i) => Math.round(i * 0.1 * 10) / 10);

/**
 * Fraction of each atlas node's neurons still alive. Nodes no neuron landed in inherit their
 * spiking region's survival rate, so region-wide damage still reaches them.
 */
export function nodeHealth(sim: NeuroSim, brain: BrainData): number[] {
  const total = new Array(brain.nodes.length).fill(0);
  const alive = new Array(brain.nodes.length).fill(0);
  for (let i = 0; i < sim.n; i++) {
    const node = sim.node[i];
    if (node < 0) continue;
    total[node]++;
    alive[node] += sim.alive[i];
  }
  return brain.nodes.map((n, i) => {
    if (total[i] > 0) return alive[i] / total[i];
    const r = RI[n.simRegion];
    const members = sim.regionMembers[r].length;
    return members ? sim.aliveCount(r) / members : 1;
  });
}

/**
 * Builds a whole-brain model spec from the live spiking brain: its damage, its chemistry, and the
 * atlas connectome and receptor maps.
 */
export function specFromState(brain: BrainData, sim: NeuroSim, settings: ModelSettings): ModelSpec {
  return specFromHealth(brain, nodeHealth(sim, brain), sim.chem, settings);
}

/**
 * Builds a whole-brain model spec for any regional health and chemistry, independent of the live brain.
 */
export function specFromHealth(brain: BrainData, health: number[], chemistry: Chemistry, settings: ModelSettings): ModelSpec {
  return {
    sc: brain.sc,
    homotopic: brain.homotopicPairs,
    homotopicStrength: settings.homotopicStrength,
    health,
    receptorNames: brain.receptors.names,
    receptors: brain.nodes.map(n => n.receptors),
    chemistry: { ...chemistry },
    baseA: settings.baseA,
    frequencyHz: settings.frequencyHz,
    sigma: settings.sigma,
    G: settings.G,
    sim: settings.sim,
  };
}
