import { describe, expect, it } from 'vitest';
import { makeBrainFixture } from '../testing/brainFixture';
import { REGIONS, RI } from '../sim/catalog';
import { DIVERGING, SEQUENTIAL, normalise, paintNetworks, paintRegions, paintScalar, sampleRamp } from './paint';

const { brain } = makeBrainFixture();

describe('sampleRamp', () => {
  it('returns the end stops at 0 and 1 and clamps outside', () => {
    expect(sampleRamp(SEQUENTIAL, 0)).toEqual(SEQUENTIAL[0]);
    expect(sampleRamp(SEQUENTIAL, 1)).toEqual(SEQUENTIAL[SEQUENTIAL.length - 1]);
    expect(sampleRamp(SEQUENTIAL, -3)).toEqual(SEQUENTIAL[0]);
    expect(sampleRamp(SEQUENTIAL, 9)).toEqual(SEQUENTIAL[SEQUENTIAL.length - 1]);
  });

  it('interpolates between stops', () => {
    const mid = sampleRamp([[0, 0, 0], [1, 1, 1]], 0.25);
    mid.forEach(c => expect(c).toBeCloseTo(0.25));
  });
});

describe('normalise', () => {
  it('maps a sequential range onto 0..1', () => {
    expect(normalise([2, 4, 6], 'sequential')).toEqual([0, 0.5, 1]);
  });

  it('centres diverging data on zero so 0 maps to the midpoint', () => {
    const out = normalise([-1, 0, 0.5], 'diverging');
    expect(out[1]).toBeCloseTo(0.5);
    expect(out[0]).toBeCloseTo(0);
    expect(out[2]).toBeCloseTo(0.75);
  });

  it('handles constant input without dividing by zero', () => {
    expect(normalise([3, 3], 'sequential')).toEqual([0.5, 0.5]);
  });
});

describe('node paints', () => {
  it('colours each node with its sim region colour', () => {
    const rgb = paintRegions(brain);
    expect(Array.from(rgb.slice(0, 3))).toEqual(REGIONS[RI[brain.nodes[0].simRegion]].color.map(v => Math.fround(v)));
  });

  it('gives nodes in the same network the same colour', () => {
    const rgb = paintNetworks(brain);
    expect(Array.from(rgb.slice(0, 3))).toEqual(Array.from(rgb.slice(3, 6)));
  });

  it('paints scalars through a ramp, one RGB triple per node', () => {
    const rgb = paintScalar(brain.nodes.map((_, i) => i), 'sequential');
    expect(rgb).toHaveLength(brain.nodes.length * 3);
    expect(Array.from(rgb.slice(0, 3))).toEqual(SEQUENTIAL[0].map(v => Math.fround(v)));
    expect(DIVERGING.length).toBeGreaterThan(2);
  });
});
