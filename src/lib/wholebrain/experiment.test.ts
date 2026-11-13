import { describe, expect, it } from 'vitest';
import { BASELINE_CHEMISTRY } from '../sim/catalog';
import { makeBrainFixture } from '../testing/brainFixture';
import { buildParams, evaluate, sweepCoupling, type ModelSpec } from './experiment';
import { simulateFc } from './hopf';

const { brain } = makeBrainFixture();
const sim = { samples: 300, tr: 0.72, dt: 0.1, burnIn: 40, seed: 11 };

function spec(overrides: Partial<ModelSpec> = {}): ModelSpec {
  return {
    sc: brain.sc,
    homotopic: brain.homotopicPairs,
    homotopicStrength: 0,
    health: new Array(brain.nodes.length).fill(1),
    receptorNames: brain.receptors.names,
    receptors: brain.nodes.map(n => n.receptors),
    chemistry: BASELINE_CHEMISTRY,
    baseA: -0.3,
    frequencyHz: 0.05,
    sigma: 0.02,
    G: 0.7,
    sim,
    ...overrides,
  };
}

describe('buildParams', () => {
  it('applies glutamate to the global coupling', () => {
    expect(buildParams(spec({ chemistry: { ...BASELINE_CHEMISTRY, glutamate: 0.5 } })).G).toBeCloseTo(0.35);
  });

  it('zeroes coupling for dead nodes', () => {
    const health = new Array(brain.nodes.length).fill(1);
    health[0] = 0;
    const p = buildParams(spec({ health }));
    expect(p.coupling[1]).toBe(0);
  });
});

describe('evaluate', () => {
  it('scores a perfect fit when the empirical matrix came from the same model and seed', () => {
    const target = simulateFc(buildParams(spec()), sim);
    const result = evaluate(spec(), target);
    expect(result.r).toBeCloseTo(1, 6);
    expect(result.fc).toHaveLength(brain.nodes.length ** 2);
  });
});

describe('sweepCoupling', () => {
  it('finds the coupling that generated the target', () => {
    const target = simulateFc(buildParams(spec({ G: 0.7 })), sim);
    const { points, best } = sweepCoupling(spec(), target, [0, 0.7, 2.5]);
    expect(points.map(p => p.G)).toEqual([0, 0.7, 2.5]);
    expect(best.G).toBe(0.7);
  });
});
