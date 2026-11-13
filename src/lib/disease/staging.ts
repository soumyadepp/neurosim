import { spearman } from '../wholebrain/stats';
import type { SpreadResult } from './spread';

/**
 * Braak tau stages mapped onto Desikan-Killiany cortical regions, following the tau-PET region
 * sets of Schöll et al. (2016) and Maass et al. (2017). The hippocampus (stage II) is not cortical
 * in this atlas, so stage II has no region here.
 */
export const BRAAK_STAGE: Record<string, number> = {
  entorhinal: 1,
  parahippocampal: 3, fusiform: 3, lingual: 3,
  middletemporal: 4, inferiortemporal: 4, temporalpole: 4, insula: 4,
  caudalanteriorcingulate: 4, rostralanteriorcingulate: 4, posteriorcingulate: 4, isthmuscingulate: 4,
  superiorfrontal: 5, lateralorbitofrontal: 5, medialorbitofrontal: 5, frontalpole: 5,
  caudalmiddlefrontal: 5, rostralmiddlefrontal: 5, parsopercularis: 5, parsorbitalis: 5, parstriangularis: 5,
  lateraloccipital: 5, supramarginal: 5, inferiorparietal: 5, superiortemporal: 5, superiorparietal: 5,
  precuneus: 5, bankssts: 5, transversetemporal: 5,
  pericalcarine: 6, postcentral: 6, cuneus: 6, precentral: 6, paracentral: 6,
};

/**
 * First sampled time at which each region's tau reaches the threshold, or Infinity if it never does.
 */
export function arrivalTimes(res: SpreadResult, threshold: number): number[] {
  const n = res.tau[0].length;
  return Array.from({ length: n }, (_, i) => {
    const k = res.tau.findIndex(row => row[i] >= threshold);
    return k < 0 ? Infinity : res.times[k];
  });
}

export interface StagingAgreement {
  rho: number;
  regions: number;
}

/**
 * Rank agreement between when the model reaches each region and that region's Braak stage.
 * Regions never reached rank last, tied together.
 */
export function braakAgreement(labels: string[], arrival: number[]): StagingAgreement {
  const finite = arrival.filter(Number.isFinite);
  const late = (finite.length ? Math.max(...finite) : 0) + 1;
  const stage: number[] = [], when: number[] = [];
  labels.forEach((label, i) => {
    const s = BRAAK_STAGE[label];
    if (s === undefined) return;
    stage.push(s);
    when.push(Number.isFinite(arrival[i]) ? arrival[i] : late);
  });
  return { rho: spearman(when, stage), regions: stage.length };
}
