import { describe, expect, it } from 'vitest';
import { REGIONS, RI } from './catalog';
import { AtlasLayout, ProceduralLayout, type NeuronPlacement } from './layout';
import { makeBrainFixture } from '../testing/brainFixture';
import { createRng } from '../wholebrain/rng';

function counts(p: NeuronPlacement): number[] {
  const c = new Array(REGIONS.length).fill(0);
  for (const r of p.regions) c[r]++;
  return c;
}

describe('ProceduralLayout', () => {
  it('places the catalogued number of neurons in every region', () => {
    expect(counts(new ProceduralLayout().place())).toEqual(REGIONS.map(r => r.n));
  });
});

describe('AtlasLayout', () => {
  const { brain, cortex } = makeBrainFixture();
  const rng = createRng(9);
  const placement = new AtlasLayout(brain, cortex, () => rng.uniform()).place();

  it('places the catalogued number of neurons in every region', () => {
    expect(counts(placement)).toEqual(REGIONS.map(r => r.n));
  });

  it('keeps cortical neurons inside the grey matter band between white and pial surfaces', () => {
    placement.positions.forEach((p, i) => {
      if (REGIONS[placement.regions[i]].id === 'broca') {
        expect(p[1]).toBeGreaterThanOrEqual(0.2);
        expect(p[1]).toBeLessThanOrEqual(0.8);
      }
    });
  });

  it('puts language neurons in the left hemisphere only', () => {
    placement.positions.forEach((p, i) => {
      if (placement.regions[i] === RI.broca || placement.regions[i] === RI.wernicke) {
        expect(p[0]).toBeLessThan(0);
        expect(placement.hemis[i]).toBe(-1);
      }
    });
  });

  it('clusters thalamic neurons around the atlas thalamus', () => {
    const { L, R } = brain.anchors.thalamus;
    placement.positions.forEach((p, i) => {
      if (placement.regions[i] !== RI.thalamus) return;
      const anchor = placement.hemis[i] < 0 ? L : R;
      expect(Math.hypot(p[0] - anchor[0], p[1] - anchor[1], p[2] - anchor[2])).toBeLessThan(0.4);
    });
  });

  it('records the atlas node of every cortical neuron, consistent with its region', () => {
    expect(placement.nodes).toHaveLength(placement.positions.length);
    placement.nodes.forEach((node, i) => {
      if (node < 0) {
        expect(['thalamus', 'hippocampus', 'cerebellum', 'brainstem']).toContain(REGIONS[placement.regions[i]].id);
      } else {
        expect(RI[brain.nodes[node].simRegion]).toBe(placement.regions[i]);
      }
    });
  });

  it('places brainstem neurons between its top and bottom anchors', () => {
    const { top, bottom } = brain.anchors.brainstem;
    placement.positions.forEach((p, i) => {
      if (placement.regions[i] !== RI.brainstem) return;
      expect(p[1]).toBeLessThanOrEqual(top[1] + 1e-9);
      expect(p[1]).toBeGreaterThanOrEqual(bottom[1] - 1e-9);
    });
  });
});
