/**
 * Network spread of misfolded protein (tau) over the structural connectome, using the
 * Fisher-Kolmogorov model of Weickenmeier et al. (2019): dc/dt = -beta L c + alpha c (1 - c).
 * The first term carries protein along white-matter tracts (Raj et al. 2012); the second lets it
 * seed copies of itself locally until a region saturates.
 */
export interface SpreadParams {
  spreadRate: number;
  growthRate: number;
  seedLevel: number;
  years: number;
  dt: number;
  sampleEvery: number;
}

export interface Treatment {
  startYear: number;
  efficacy: number;
}

export interface SpreadInput {
  sc: number[][];
  seeds: number[];
  params: SpreadParams;
  treatment?: Treatment | null;
}

export interface SpreadResult {
  times: number[];
  tau: number[][];
}

/**
 * Graph Laplacian of the connectome after scaling its strongest edge to one, row-major.
 */
export function normalisedLaplacian(sc: number[][]): Float64Array {
  const n = sc.length;
  let max = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && sc[i][j] > max) max = sc[i][j];
  const L = new Float64Array(n * n);
  if (max === 0) return L;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j || sc[i][j] === 0) continue;
      const w = sc[i][j] / max;
      L[i * n + j] = -w;
      L[i * n + i] += w;
    }
  }
  return L;
}

/**
 * Integrates the spread from the seed regions and samples every region at a fixed interval.
 * A treatment scales both transport and local growth down by its efficacy from its start year.
 */
export function simulateSpread({ sc, seeds, params, treatment }: SpreadInput): SpreadResult {
  const n = sc.length;
  const L = normalisedLaplacian(sc);
  const c = new Float64Array(n);
  for (const s of seeds) c[s] = params.seedLevel;
  const dc = new Float64Array(n);
  const steps = Math.round(params.years / params.dt);
  const every = Math.max(1, Math.round(params.sampleEvery / params.dt));
  const times: number[] = [0];
  const tau: number[][] = [Array.from(c)];
  for (let k = 1; k <= steps; k++) {
    const t = (k - 1) * params.dt;
    const slow = treatment && treatment.efficacy > 0 && t >= treatment.startYear - 1e-9 ? 1 - treatment.efficacy : 1;
    const beta = params.spreadRate * slow, alpha = params.growthRate * slow;
    for (let i = 0; i < n; i++) {
      let flow = 0;
      const row = i * n;
      for (let j = 0; j < n; j++) { const l = L[row + j]; if (l !== 0) flow += l * c[j]; }
      dc[i] = -beta * flow + alpha * c[i] * (1 - c[i]);
    }
    for (let i = 0; i < n; i++) c[i] = Math.min(1, Math.max(0, c[i] + params.dt * dc[i]));
    if (k % every === 0) {
      times.push(Math.round(k * params.dt * 1e6) / 1e6);
      tau.push(Array.from(c));
    }
  }
  return { times, tau };
}

/**
 * Regional tau at any time, linearly interpolated between samples and clamped to the simulated range.
 */
export function tauAt(res: SpreadResult, year: number): number[] {
  const { times, tau } = res;
  if (year <= times[0]) return tau[0].slice();
  if (year >= times[times.length - 1]) return tau[tau.length - 1].slice();
  let k = 0;
  while (times[k + 1] < year) k++;
  const f = (year - times[k]) / (times[k + 1] - times[k]);
  return tau[k].map((v, i) => v + (tau[k + 1][i] - v) * f);
}
