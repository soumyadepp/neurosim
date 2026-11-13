import type { BrainData, BrainNode, CortexHemisphere } from '../data/brainData';
import type { RegionId } from '../sim/catalog';

const CORTICAL: { region: RegionId; hemi: 'L' | 'R' }[] = [
  { region: 'prefrontal', hemi: 'R' },
  { region: 'frontal', hemi: 'R' },
  { region: 'motor', hemi: 'R' },
  { region: 'somato', hemi: 'R' },
  { region: 'parietal', hemi: 'R' },
  { region: 'visual', hemi: 'L' },
  { region: 'temporal', hemi: 'L' },
  { region: 'auditory', hemi: 'L' },
  { region: 'broca', hemi: 'L' },
  { region: 'wernicke', hemi: 'L' },
];

export const FIXTURE_RECEPTORS = ['GABAa', 'NMDA', 'D1', 'D2', '5HT1a', 'M1'];

/**
 * A ten-node brain, one node per cortical region, each owning a square patch of a flat two-layer mesh.
 * White matter sits at y = 0 and the pial surface at y = 1, so cortical depth is easy to assert.
 */
export function makeBrainFixture(): { brain: BrainData; cortex: CortexHemisphere[] } {
  const nodes: BrainNode[] = CORTICAL.map(({ region, hemi }, index) => ({
    index,
    label: region,
    name: region,
    hemi,
    simRegion: region,
    network: 'Default mode',
    economo: 'association',
    centroid: [hemi === 'L' ? -1 : 1, 0.5, index],
    receptors: FIXTURE_RECEPTORS.map((_, k) => 1 + 0.1 * k * (index % 3)),
  }));

  const cortex = (['L', 'R'] as const).map(hemi => {
    const owned = nodes.filter(n => n.hemi === hemi);
    const vertexCount = owned.length * 4;
    const pial = new Float32Array(vertexCount * 3);
    const white = new Float32Array(vertexCount * 3);
    const nodeOf = new Int16Array(vertexCount);
    const faces: number[] = [];
    owned.forEach((node, k) => {
      const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
      corners.forEach(([dx, dz], c) => {
        const v = k * 4 + c;
        const x = (hemi === 'L' ? -2 : 1) + dx * 0.5;
        const z = node.index + dz * 0.5;
        pial.set([x, 1, z], v * 3);
        white.set([x, 0, z], v * 3);
        nodeOf[v] = node.index;
      });
      faces.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3);
    });
    return { hemi, pial, white, faces: Uint32Array.from(faces), nodes: nodeOf };
  });

  const n = nodes.length;
  const sc = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Math.abs(i - j) === 1 ? 1 : 0.2)));
  const fc = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0.3)));

  const profile = Object.fromEntries(FIXTURE_RECEPTORS.map(r => [r, 1]));
  const brain: BrainData = {
    version: 1,
    nodes,
    sc,
    fc,
    homotopicPairs: [],
    receptors: {
      names: FIXTURE_RECEPTORS,
      simRegions: Object.fromEntries(
        [...CORTICAL.map(c => c.region), 'thalamus', 'hippocampus', 'brainstem', 'cerebellum'].map(r => [r, { ...profile }]),
      ),
      estimated: ['cerebellum'],
    },
    anchors: {
      thalamus: { L: [-0.15, -0.1, 0], R: [0.15, -0.1, 0] },
      hippocampus: { L: [-0.35, -0.4, -0.1], R: [0.35, -0.4, -0.1] },
      hippocampusSpread: [0.05, 0.05, 0.1],
      brainstem: { top: [0, -0.3, -0.15], bottom: [0, -1, -0.35], radius: 0.1 },
      cerebellum: { center: [0, -0.6, -0.55], radii: [0.6, 0.3, 0.38] },
    },
    meg: {
      bands: ['delta', 'theta', 'alpha', 'beta', 'gamma1', 'gamma2'],
      values: nodes.map((_, i) => Array.from({ length: 6 }, (_, b) => 0.1 + 0.01 * ((i + b) % 5))),
    },
    tau: {
      maps: ['limbic'],
      values: nodes.map((_, i) => [1 + 0.1 * i]),
    },
    enigma: {
      disorders: ['parkinsons'],
      values: nodes.map((_, i) => [-0.1 - 0.01 * i]),
    },
    mesh: { file: 'cortex.bin', hemispheres: [] },
    validation: {
      scFcR: 0.43,
      empiricalMeanFc: 0.23,
      megReceptors: { bands: ['alpha'], r: [0.8], nullMean: [0.5], p: [0.01], spins: 100 },
      tauAtrophy: { r: 0.8, nullMean: 0, p: 0.01, spins: 100 },
    },
    space: { mmPerUnit: 79, centerMm: [0, 0, 0] },
    sources: [],
  };
  return { brain, cortex };
}
