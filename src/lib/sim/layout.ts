import { REGIONS, RI, SUBCORTICAL, type Vec3 } from './catalog';
import { brainstemPoint, cerebellumPoint, regionOf, shapePoint } from './anatomy';
import { gauss } from './noise';
import type { BrainData, CortexHemisphere } from '../data/brainData';

export interface NeuronPlacement {
  positions: Vec3[];
  regions: number[];
  hemis: number[];
  nodes: number[];
}

export const NO_NODE = -1;

/**
 * Decides where every neuron sits. NeuroSim wires synapses the same way whatever the layout.
 */
export interface NeuronLayout {
  place(): NeuronPlacement;
}

type Random = () => number;

function gaussianFrom(random: Random): () => number {
  return () => {
    let u = 0;
    while (u === 0) u = random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
  };
}

/**
 * The original hand-built brain: a noise-folded sphere with region boundaries drawn by rule.
 * Used when real anatomy is unavailable.
 */
export class ProceduralLayout implements NeuronLayout {
  place(): NeuronPlacement {
    const out: NeuronPlacement = { positions: [], regions: [], hemis: [], nodes: [] };
    const push = (p: Vec3, r: number, h: number) => { out.positions.push(p); out.regions.push(r); out.hemis.push(h); out.nodes.push(NO_NODE); };
    const want = REGIONS.map(r => r.n);
    const have = new Int32Array(REGIONS.length);
    const corticalTotal = REGIONS.filter(r => !SUBCORTICAL.includes(r.id)).reduce((a, r) => a + r.n, 0);
    let side = -1, tries = 0, placed = 0;
    while (placed < corticalTotal && tries < 200000) {
      tries++;
      let x = gauss(), y = gauss(), z = gauss();
      const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
      side = -side;
      const r = regionOf(x * side, y, z, side);
      if (have[r] >= want[r]) continue;
      have[r]++; placed++;
      const [px, py, pz] = shapePoint(x, y, z, side, 0.80 + 0.1 * Math.random());
      push([px, py, pz], r, side);
    }
    for (let i = 0; i < want[RI.hippocampus]; i++) {
      const s = i % 2 ? 1 : -1;
      push([s * 0.33 + gauss() * 0.07, -0.32 + gauss() * 0.06, -0.08 + gauss() * 0.16], RI.hippocampus, s);
    }
    for (let i = 0; i < want[RI.thalamus]; i++) {
      const s = i % 2 ? 1 : -1;
      push([s * 0.13 + gauss() * 0.06, -0.02 + gauss() * 0.07, -0.08 + gauss() * 0.08], RI.thalamus, s);
    }
    for (let i = 0; i < want[RI.cerebellum]; i++) {
      let x, y, z;
      do { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1; } while (x * x + y * y + z * z > 1);
      const [cx, cy, cz] = cerebellumPoint(x, y, z, 0.88);
      push([cx, cy, cz], RI.cerebellum, x < 0 ? -1 : 1);
    }
    for (let i = 0; i < want[RI.brainstem]; i++) {
      const [bx, by, bz] = brainstemPoint(Math.random(), Math.random() * Math.PI * 2, Math.sqrt(Math.random()) * 0.8);
      push([bx, by, bz], RI.brainstem, 1);
    }
    return out;
  }
}

const GREY_MATTER_DEPTH: [number, number] = [0.25, 0.75];

/**
 * Real anatomy: cortical neurons sit in the grey matter of the Lausanne parcels mapped to their
 * region, between the fsaverage white and pial surfaces; subcortical neurons cluster around the
 * atlas positions of the thalamus, hippocampus and brainstem.
 */
export class AtlasLayout implements NeuronLayout {
  private readonly gaussian: () => number;

  constructor(
    private readonly brain: BrainData,
    private readonly cortex: CortexHemisphere[],
    private readonly random: Random = Math.random,
  ) {
    this.gaussian = gaussianFrom(random);
  }

  private corticalVertices(): Map<number, { hemi: CortexHemisphere; vertex: number }[]> {
    const byRegion = new Map<number, { hemi: CortexHemisphere; vertex: number }[]>();
    for (const hemi of this.cortex) {
      for (let v = 0; v < hemi.nodes.length; v++) {
        const node = hemi.nodes[v];
        if (node < 0) continue;
        const region = RI[this.brain.nodes[node].simRegion];
        if (!byRegion.has(region)) byRegion.set(region, []);
        byRegion.get(region)!.push({ hemi, vertex: v });
      }
    }
    return byRegion;
  }

  place(): NeuronPlacement {
    const out: NeuronPlacement = { positions: [], regions: [], hemis: [], nodes: [] };
    const push = (p: Vec3, r: number, h: number, node = NO_NODE) => {
      out.positions.push(p); out.regions.push(r); out.hemis.push(h); out.nodes.push(node);
    };
    const { anchors } = this.brain;
    const vertices = this.corticalVertices();
    const pick = <T>(items: T[]) => items[Math.floor(this.random() * items.length)];
    const [d0, d1] = GREY_MATTER_DEPTH;

    REGIONS.forEach((def, r) => {
      if (SUBCORTICAL.includes(def.id)) return;
      const pool = vertices.get(r) ?? [];
      for (let i = 0; i < def.n && pool.length; i++) {
        const { hemi, vertex } = pick(pool);
        const t = d0 + (d1 - d0) * this.random();
        const o = vertex * 3;
        const p: Vec3 = [0, 1, 2].map(k => hemi.white[o + k] + (hemi.pial[o + k] - hemi.white[o + k]) * t) as Vec3;
        push(p, r, hemi.hemi === 'L' ? -1 : 1, hemi.nodes[vertex]);
      }
    });

    const near = (c: Vec3, spread: Vec3): Vec3 => [c[0] + this.gaussian() * spread[0], c[1] + this.gaussian() * spread[1], c[2] + this.gaussian() * spread[2]];
    for (let i = 0; i < REGIONS[RI.thalamus].n; i++) {
      const s = i % 2 ? 1 : -1;
      push(near(anchors.thalamus[s < 0 ? 'L' : 'R'], [0.05, 0.05, 0.07]), RI.thalamus, s);
    }
    for (let i = 0; i < REGIONS[RI.hippocampus].n; i++) {
      const s = i % 2 ? 1 : -1;
      push(near(anchors.hippocampus[s < 0 ? 'L' : 'R'], anchors.hippocampusSpread.map(v => v * 0.6) as Vec3), RI.hippocampus, s);
    }
    const { center, radii } = anchors.cerebellum;
    for (let i = 0; i < REGIONS[RI.cerebellum].n; i++) {
      let x, y, z;
      do { x = this.random() * 2 - 1; y = this.random() * 2 - 1; z = this.random() * 2 - 1; } while (x * x + y * y + z * z > 1);
      push([center[0] + x * radii[0] * 0.85, center[1] + y * radii[1] * 0.85, center[2] + z * radii[2] * 0.85], RI.cerebellum, x < 0 ? -1 : 1);
    }
    const { top, bottom, radius } = anchors.brainstem;
    for (let i = 0; i < REGIONS[RI.brainstem].n; i++) {
      const t = this.random(), ang = this.random() * Math.PI * 2, rad = Math.sqrt(this.random()) * radius * 0.6;
      push([
        top[0] + (bottom[0] - top[0]) * t + Math.cos(ang) * rad,
        top[1] + (bottom[1] - top[1]) * t,
        top[2] + (bottom[2] - top[2]) * t + Math.sin(ang) * rad,
      ], RI.brainstem, 1);
    }
    return out;
  }
}
