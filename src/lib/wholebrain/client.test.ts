import { describe, expect, it } from 'vitest';
import { BASELINE_CHEMISTRY } from '../sim/catalog';
import { makeBrainFixture } from '../testing/brainFixture';
import { InlineWholeBrainClient, handleRequest } from './client';
import type { ModelSpec } from './experiment';

const { brain } = makeBrainFixture();
const spec: ModelSpec = {
  sc: brain.sc,
  homotopic: [],
  homotopicStrength: 0,
  health: new Array(brain.nodes.length).fill(1),
  receptorNames: brain.receptors.names,
  receptors: brain.nodes.map(n => n.receptors),
  chemistry: BASELINE_CHEMISTRY,
  baseA: -0.3,
  frequencyHz: 0.05,
  sigma: 0.02,
  G: 0.5,
  sim: { samples: 200, tr: 0.72, dt: 0.1, burnIn: 20, seed: 5 },
};
const empirical = brain.fc.flat();

describe('handleRequest', () => {
  it('evaluates a spec', () => {
    const res = handleRequest({ kind: 'evaluate', spec, empirical });
    expect(res.kind).toBe('evaluate');
    if (res.kind === 'evaluate') expect(res.result.fc).toHaveLength(100);
  });

  it('sweeps couplings', () => {
    const res = handleRequest({ kind: 'sweep', spec, empirical, couplings: [0, 0.5] });
    expect(res.kind).toBe('sweep');
    if (res.kind === 'sweep') expect(res.result.points).toHaveLength(2);
  });
});

describe('InlineWholeBrainClient', () => {
  it('resolves with the same result the worker would compute', async () => {
    const client = new InlineWholeBrainClient();
    const viaClient = await client.evaluate(spec, empirical);
    const direct = handleRequest({ kind: 'evaluate', spec, empirical });
    expect(direct.kind === 'evaluate' && viaClient.r).toBe(direct.kind === 'evaluate' && direct.result.r);
  });
});
