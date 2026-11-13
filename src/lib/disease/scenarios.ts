import type { TaskDef } from '../sim/catalog';
import type { SpreadParams } from './spread';

export type ScenarioId = 'alzheimers' | 'ftd' | 'pca';

/**
 * One kind of neurodegeneration: where the protein first appears, which regions carry the
 * function people notice losing first, and which spiking-brain task tests that function.
 * tauPattern names the measured tau PET pattern the scenario is meant to follow, where one exists.
 */
export interface DiseaseScenario {
  id: ScenarioId;
  seeds: string[];
  functionRegions: string[];
  taskId: TaskDef['id'];
  staged: boolean;
  tauPattern: string | null;
}

export const SCENARIOS: DiseaseScenario[] = [
  {
    id: 'alzheimers',
    seeds: ['entorhinal'],
    functionRegions: ['entorhinal', 'parahippocampal', 'isthmuscingulate', 'posteriorcingulate', 'precuneus', 'inferiorparietal', 'middletemporal', 'inferiortemporal'],
    taskId: 'recall',
    staged: true,
    tauPattern: 'limbic',
  },
  {
    id: 'ftd',
    seeds: ['insula', 'rostralanteriorcingulate'],
    functionRegions: ['insula', 'rostralanteriorcingulate', 'caudalanteriorcingulate', 'medialorbitofrontal', 'lateralorbitofrontal', 'frontalpole', 'temporalpole', 'parsopercularis', 'parstriangularis'],
    taskId: 'speak',
    staged: false,
    tauPattern: null,
  },
  {
    id: 'pca',
    seeds: ['lateraloccipital'],
    functionRegions: ['lateraloccipital', 'cuneus', 'pericalcarine', 'lingual', 'superiorparietal', 'inferiorparietal', 'fusiform'],
    taskId: 'see',
    staged: false,
    tauPattern: 'posterior',
  },
];

/**
 * Default spread settings, tuned on the real connectome. Transport is kept far slower than local
 * growth so regions are reached in sequence rather than all at once. The time scale puts typical
 * Alzheimer's symptoms about 18 years after the first tau, in line with the 15 to 20 year
 * preclinical phase reported by Bateman et al. (2012) and Jack et al. (2013).
 */
export const SPREAD_DEFAULTS: SpreadParams = {
  spreadRate: 0.01,
  growthRate: 0.35,
  seedLevel: 0.05,
  years: 35,
  dt: 0.02,
  sampleEvery: 0.25,
};

export function scenarioNodes(nodes: { label: string }[], labels: string[]): number[] {
  return nodes.flatMap((n, i) => (labels.includes(n.label) ? [i] : []));
}
