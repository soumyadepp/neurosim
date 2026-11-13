import type { Rng } from './rng';

export type Drift = (state: Float64Array, out: Float64Array) => void;

/**
 * Advances a stochastic differential equation with additive noise by one step.
 */
export interface Integrator {
  readonly name: string;
  step(state: Float64Array, drift: Drift, dt: number, sigma: number, rng: Rng): void;
}

export class EulerMaruyama implements Integrator {
  readonly name = 'euler';
  private readonly f: Float64Array;

  constructor(size: number) {
    this.f = new Float64Array(size);
  }

  step(x: Float64Array, drift: Drift, dt: number, sigma: number, rng: Rng): void {
    drift(x, this.f);
    const amp = sigma * Math.sqrt(dt);
    for (let i = 0; i < x.length; i++) x[i] += this.f[i] * dt + amp * rng.gaussian();
  }
}

/**
 * Stochastic Heun (predictor-corrector) for additive noise; second order in the drift and markedly
 * more stable than Euler-Maruyama at the coupling strengths whole-brain models need.
 */
export class Heun implements Integrator {
  readonly name = 'heun';
  private readonly f0: Float64Array;
  private readonly f1: Float64Array;
  private readonly noise: Float64Array;
  private readonly predicted: Float64Array;

  constructor(size: number) {
    this.f0 = new Float64Array(size);
    this.f1 = new Float64Array(size);
    this.noise = new Float64Array(size);
    this.predicted = new Float64Array(size);
  }

  step(x: Float64Array, drift: Drift, dt: number, sigma: number, rng: Rng): void {
    const { f0, f1, noise, predicted } = this;
    const amp = sigma * Math.sqrt(dt);
    drift(x, f0);
    for (let i = 0; i < x.length; i++) {
      noise[i] = amp * rng.gaussian();
      predicted[i] = x[i] + f0[i] * dt + noise[i];
    }
    drift(predicted, f1);
    for (let i = 0; i < x.length; i++) x[i] += 0.5 * (f0[i] + f1[i]) * dt + noise[i];
  }
}
