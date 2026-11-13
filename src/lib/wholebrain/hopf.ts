import { Heun, type Drift, type Integrator } from './integrators';
import { createRng } from './rng';
import { correlationMatrix } from './stats';

/**
 * Supercritical Hopf (Stuart-Landau) whole-brain model, after Deco et al. (2017). Each region is a
 * noisy oscillator poised near its bifurcation; regions talk through the structural connectome.
 */
export interface HopfParams {
  n: number;
  coupling: Float64Array;
  G: number;
  a: Float64Array;
  omega: Float64Array;
  sigma: number;
}

export interface SimOptions {
  samples: number;
  tr: number;
  dt: number;
  burnIn: number;
  seed: number;
  repeats?: number;
  integrator?: (size: number) => Integrator;
}

export interface CouplingOptions {
  homotopic?: [number, number][];
  homotopicStrength?: number;
  health?: ArrayLike<number>;
}

const MAX_EDGE = 0.2;

/**
 * Normalises a structural connectome so its strongest edge is 0.2, optionally restores
 * interhemispheric (homotopic) links that tractography under-detects, and scales every edge by the
 * health of the two regions it joins.
 */
export function buildCoupling(sc: number[][], opts: CouplingOptions): Float64Array {
  const n = sc.length;
  let max = 0;
  for (const row of sc) for (const v of row) if (v > max) max = v;
  const c = new Float64Array(n * n);
  if (max === 0) return c;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) c[i * n + j] = (sc[i][j] / max) * MAX_EDGE;
  const floor = (opts.homotopicStrength ?? 0) * MAX_EDGE;
  if (floor > 0) {
    for (const [i, j] of opts.homotopic ?? []) {
      c[i * n + j] = Math.max(c[i * n + j], floor);
      c[j * n + i] = Math.max(c[j * n + i], floor);
    }
  }
  const health = opts.health;
  if (health) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[i * n + j] *= health[i] * health[j];
  return c;
}

function hopfDrift(p: HopfParams): Drift {
  const { n, coupling, G, a, omega } = p;
  const strength = new Float64Array(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) strength[i] += coupling[i * n + j];
  return (s, out) => {
    for (let i = 0; i < n; i++) {
      const x = s[i], y = s[n + i];
      let cx = 0, cy = 0;
      const row = i * n;
      for (let j = 0; j < n; j++) {
        const w = coupling[row + j];
        if (w !== 0) { cx += w * s[j]; cy += w * s[n + j]; }
      }
      const r2 = x * x + y * y;
      out[i] = (a[i] - r2) * x - omega[i] * y + G * (cx - strength[i] * x);
      out[n + i] = (a[i] - r2) * y + omega[i] * x + G * (cy - strength[i] * y);
    }
  };
}

/**
 * Simulates the model and returns the real part sampled every TR as a row-major samples-by-nodes series.
 */
export function simulateSeries(p: HopfParams, opts: SimOptions): Float64Array {
  const { n } = p;
  const rng = createRng(opts.seed);
  const state = new Float64Array(2 * n);
  for (let i = 0; i < 2 * n; i++) state[i] = 0.1 * rng.gaussian();
  const integrator = (opts.integrator ?? (size => new Heun(size)))(2 * n);
  const drift = hopfDrift(p);
  const perTr = Math.max(1, Math.round(opts.tr / opts.dt));
  const series = new Float64Array(opts.samples * n);
  for (let t = 0; t < opts.burnIn + opts.samples; t++) {
    for (let k = 0; k < perTr; k++) integrator.step(state, drift, opts.dt, p.sigma, rng);
    if (t >= opts.burnIn) series.set(state.subarray(0, n), (t - opts.burnIn) * n);
  }
  return series;
}

export function simulateFc(p: HopfParams, opts: SimOptions): Float64Array {
  return correlationMatrix(simulateSeries(p, opts), opts.samples, p.n);
}

/**
 * Mean functional connectivity over several runs, each with its own seed. A single run of a noisy
 * model is a poor estimate of the connectivity it implies; averaging a handful of runs removes most
 * of that sampling noise and raises the match against real data.
 */
export function simulateFcMean(p: HopfParams, opts: SimOptions, repeats: number): Float64Array {
  const total = new Float64Array(p.n * p.n);
  const runs = Math.max(1, Math.round(repeats));
  for (let run = 0; run < runs; run++) {
    const fc = simulateFc(p, { ...opts, seed: opts.seed + run * 1000 });
    for (let i = 0; i < total.length; i++) total[i] += fc[i] / runs;
  }
  return total;
}
