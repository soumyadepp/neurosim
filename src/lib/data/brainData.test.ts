import { describe, expect, it } from 'vitest';
import { HttpBrainDataRepository, parseCortex, type MeshLayout } from './brainData';
import { makeBrainFixture } from '../testing/brainFixture';

function pack(): { buffer: ArrayBuffer; layouts: MeshLayout[] } {
  const pial = Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const white = Float32Array.from([0, 0, 0, 0.5, 0, 0, 0, 0.5, 0]);
  const faces = Uint32Array.from([0, 1, 2]);
  const nodes = Int16Array.from([-1, 3, 4]);
  const parts = [pial, white, faces, nodes];
  const size = parts.reduce((s, p) => s + p.byteLength, 0);
  const padded = size + ((4 - (size % 4)) % 4);
  const bytes = new Uint8Array(padded);
  let offset = 0;
  const offsets: number[] = [];
  for (const p of parts) {
    offsets.push(offset);
    bytes.set(new Uint8Array(p.buffer), offset);
    offset += p.byteLength;
  }
  return {
    buffer: bytes.buffer,
    layouts: [{ hemi: 'L', vertexCount: 3, faceCount: 1, pialOffset: offsets[0], whiteOffset: offsets[1], faceOffset: offsets[2], nodeOffset: offsets[3] }],
  };
}

describe('parseCortex', () => {
  it('views each hemisphere straight out of the binary file', () => {
    const { buffer, layouts } = pack();
    const [h] = parseCortex(buffer, layouts);
    expect(h.hemi).toBe('L');
    expect(Array.from(h.pial)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect(Array.from(h.white.slice(3, 6))).toEqual([0.5, 0, 0]);
    expect(Array.from(h.faces)).toEqual([0, 1, 2]);
    expect(Array.from(h.nodes)).toEqual([-1, 3, 4]);
  });
});

describe('HttpBrainDataRepository', () => {
  const { brain } = makeBrainFixture();
  const { buffer, layouts } = pack();
  const json = { ...brain, mesh: { file: 'cortex.bin', hemispheres: layouts } };

  function fakeFetch(ok = true): typeof fetch {
    return (async (url: string) => ({
      ok,
      status: ok ? 200 : 404,
      json: async () => json,
      arrayBuffer: async () => buffer,
      url,
    })) as unknown as typeof fetch;
  }

  it('loads the brain and its cortex mesh from the base url', async () => {
    const seen: string[] = [];
    const base = fakeFetch();
    const spy = (async (url: string) => { seen.push(url); return base(url); }) as typeof fetch;
    const { brain: loaded, cortex } = await new HttpBrainDataRepository('/data', spy).load();
    expect(seen).toEqual(['/data/brain.json', '/data/cortex.bin']);
    expect(loaded.nodes).toHaveLength(10);
    expect(cortex[0].nodes[1]).toBe(3);
  });

  it('rejects when the data is missing', async () => {
    await expect(new HttpBrainDataRepository('/data', fakeFetch(false)).load()).rejects.toThrow(/404/);
  });
});
