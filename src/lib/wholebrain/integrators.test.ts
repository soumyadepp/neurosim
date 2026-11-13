import { describe, expect, it } from 'vitest';
import { EulerMaruyama, Heun, type Drift } from './integrators';
import { createRng } from './rng';

const decay: Drift = (x, out) => { for (let i = 0; i < x.length; i++) out[i] = -x[i]; };

function integrate(integrator: EulerMaruyama | Heun, steps: number, dt: number, sigma = 0, seed = 1): Float64Array {
  const x = Float64Array.from([1, 2]);
  const rng = createRng(seed);
  for (let s = 0; s < steps; s++) integrator.step(x, decay, dt, sigma, rng);
  return x;
}

describe('integrators', () => {
  it('Heun tracks exponential decay more accurately than Euler-Maruyama', () => {
    const exact = Math.exp(-1);
    const euler = integrate(new EulerMaruyama(2), 10, 0.1)[0];
    const heun = integrate(new Heun(2), 10, 0.1)[0];
    expect(Math.abs(heun - exact)).toBeLessThan(Math.abs(euler - exact));
    expect(heun).toBeCloseTo(exact, 2);
  });

  it('is deterministic without noise', () => {
    expect(Array.from(integrate(new Heun(2), 5, 0.1))).toEqual(Array.from(integrate(new Heun(2), 5, 0.1)));
  });

  it('adds noise scaled by sigma and sqrt(dt)', () => {
    const quiet = integrate(new EulerMaruyama(2), 1, 0.01, 0);
    const noisy = integrate(new EulerMaruyama(2), 1, 0.01, 1);
    expect(noisy[0]).not.toBeCloseTo(quiet[0], 4);
    expect(Math.abs(noisy[0] - quiet[0])).toBeLessThan(0.5);
  });

  it('reports its name for the UI', () => {
    expect(new Heun(1).name).toBe('heun');
    expect(new EulerMaruyama(1).name).toBe('euler');
  });
});
