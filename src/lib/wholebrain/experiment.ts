import type { Chemistry } from '../sim/catalog';
import { buildCoupling, simulateFcMean, type HopfParams, type SimOptions } from './hopf';
import { couplingScale, nodeBifurcation } from './perturbation';
import { meanUpperTriangle, upperTriangleR } from './stats';

/**
 * Everything needed to run one whole-brain experiment. Plain data, so it can cross a worker boundary.
 */
export interface ModelSpec {
  sc: number[][];
  homotopic: [number, number][];
  homotopicStrength: number;
  health: number[];
  receptorNames: string[];
  receptors: number[][];
  chemistry: Chemistry;
  baseA: number;
  frequencyHz: number;
  sigma: number;
  G: number;
  sim: Omit<SimOptions, 'integrator'>;
}

export interface EvaluateResult {
  fc: number[];
  r: number;
  meanFc: number;
}

export interface FitPoint {
  G: number;
  r: number;
  meanFc: number;
}

export interface SweepResult {
  points: FitPoint[];
  best: FitPoint;
}

export function buildParams(spec: ModelSpec): HopfParams {
  const n = spec.sc.length;
  return {
    n,
    coupling: buildCoupling(spec.sc, { homotopic: spec.homotopic, homotopicStrength: spec.homotopicStrength, health: spec.health }),
    G: spec.G * couplingScale(spec.chemistry),
    a: nodeBifurcation(spec.baseA, spec.receptorNames, spec.receptors, spec.chemistry),
    omega: new Float64Array(n).fill(2 * Math.PI * spec.frequencyHz),
    sigma: spec.sigma,
  };
}

/**
 * Simulates the spec and scores its functional connectivity against an empirical matrix.
 */
export function evaluate(spec: ModelSpec, empirical: ArrayLike<number>): EvaluateResult {
  const n = spec.sc.length;
  const fc = simulateFcMean(buildParams(spec), spec.sim, spec.sim.repeats ?? 1);
  return { fc: Array.from(fc), r: upperTriangleR(fc, empirical, n), meanFc: meanUpperTriangle(fc, n) };
}

/**
 * Repeats used while scanning for the best coupling. The sweep only needs the location of the peak,
 * so it trades a little precision per point for a scan that stays responsive across every value.
 */
const SWEEP_REPEATS = 2;

/**
 * Evaluates the spec across global coupling values and returns the curve plus its best point.
 */
export function sweepCoupling(spec: ModelSpec, empirical: ArrayLike<number>, couplings: number[]): SweepResult {
  const scan = { ...spec, sim: { ...spec.sim, repeats: SWEEP_REPEATS } };
  const points = couplings.map(G => {
    const { r, meanFc } = evaluate({ ...scan, G }, empirical);
    return { G, r, meanFc };
  });
  const best = points.reduce((a, b) => (b.r > a.r ? b : a));
  return { points, best };
}
