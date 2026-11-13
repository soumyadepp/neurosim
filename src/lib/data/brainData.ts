import type { RegionId, Vec3 } from '../sim/catalog';

export interface BrainNode {
  index: number;
  label: string;
  name: string;
  hemi: 'L' | 'R';
  simRegion: RegionId;
  network: string;
  economo: string;
  centroid: Vec3;
  receptors: number[];
}

export interface MeshLayout {
  hemi: 'L' | 'R';
  vertexCount: number;
  faceCount: number;
  pialOffset: number;
  whiteOffset: number;
  faceOffset: number;
  nodeOffset: number;
}

export interface Source {
  name: string;
  citation: string;
  license: string;
  url: string;
}

/**
 * The real-anatomy dataset produced by the Python pipeline (pipeline/neurosim_data/build.py).
 * Matrices are row-major over the 68 Lausanne scale-33 cortical regions.
 */
export interface BrainData {
  version: number;
  nodes: BrainNode[];
  sc: number[][];
  fc: number[][];
  homotopicPairs: [number, number][];
  receptors: {
    names: string[];
    simRegions: Record<string, Record<string, number>>;
    estimated: string[];
  };
  anchors: {
    thalamus: Record<'L' | 'R', Vec3>;
    hippocampus: Record<'L' | 'R', Vec3>;
    hippocampusSpread: Vec3;
    brainstem: { top: Vec3; bottom: Vec3; radius: number };
    cerebellum: { center: Vec3; radii: Vec3 };
  };
  meg: { bands: string[]; values: number[][] };
  enigma: { disorders: string[]; values: number[][] };
  mesh: { file: string; hemispheres: MeshLayout[] };
  validation: { scFcR: number; empiricalMeanFc: number };
  space: { mmPerUnit: number; centerMm: Vec3 };
  sources: Source[];
}

export interface CortexHemisphere {
  hemi: 'L' | 'R';
  pial: Float32Array;
  white: Float32Array;
  faces: Uint32Array;
  nodes: Int16Array;
}

export interface LoadedBrain {
  brain: BrainData;
  cortex: CortexHemisphere[];
}

/**
 * Views each hemisphere's arrays directly over the packed binary, without copying.
 */
export function parseCortex(buffer: ArrayBuffer, layouts: MeshLayout[]): CortexHemisphere[] {
  return layouts.map(l => ({
    hemi: l.hemi,
    pial: new Float32Array(buffer, l.pialOffset, l.vertexCount * 3),
    white: new Float32Array(buffer, l.whiteOffset, l.vertexCount * 3),
    faces: new Uint32Array(buffer, l.faceOffset, l.faceCount * 3),
    nodes: new Int16Array(buffer, l.nodeOffset, l.vertexCount),
  }));
}

export interface BrainDataRepository {
  load(): Promise<LoadedBrain>;
}

/**
 * Loads the pipeline's static assets over HTTP.
 */
export class HttpBrainDataRepository implements BrainDataRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = (...args) => fetch(...args),
  ) {}

  private async get(path: string): Promise<Response> {
    const res = await this.fetchFn(`${this.baseUrl}/${path}`);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res;
  }

  async load(): Promise<LoadedBrain> {
    const brain = (await (await this.get('brain.json')).json()) as BrainData;
    const buffer = await (await this.get(brain.mesh.file)).arrayBuffer();
    return { brain, cortex: parseCortex(buffer, brain.mesh.hemispheres) };
  }
}
