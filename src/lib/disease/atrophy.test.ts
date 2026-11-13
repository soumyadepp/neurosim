import { describe, expect, it } from 'vitest';
import { RI } from '../sim/catalog';
import { neuronAtrophy } from './atrophy';

const nodes = [
  { label: 'entorhinal', hemi: 'L' as const },
  { label: 'parahippocampal', hemi: 'L' as const },
  { label: 'entorhinal', hemi: 'R' as const },
  { label: 'precentral', hemi: 'L' as const },
];

describe('neuronAtrophy', () => {
  it('gives cortical neurons the loss of their own atlas region', () => {
    const out = neuronAtrophy({ node: [3, 0], region: [RI.motor, RI.temporal], hemi: [-1, -1] }, nodes, [0.1, 0.2, 0.3, 0.4]);
    expect(Array.from(out)).toEqual([0.4, 0.1].map(Math.fround));
  });

  it('lets the hippocampus follow its entorhinal and parahippocampal neighbours on the same side', () => {
    const out = neuronAtrophy({ node: [-1, -1], region: [RI.hippocampus, RI.hippocampus], hemi: [-1, 1] }, nodes, [0.2, 0.4, 0.8, 0]);
    expect(out[0]).toBeCloseTo(0.3);
    expect(out[1]).toBeCloseTo(0.8);
  });

  it('spares deep structures the cortical model does not cover', () => {
    const out = neuronAtrophy({ node: [-1, -1], region: [RI.thalamus, RI.cerebellum], hemi: [-1, 1] }, nodes, [1, 1, 1, 1]);
    expect(Array.from(out)).toEqual([0, 0]);
  });
});
