import { describe, expect, it } from 'vitest';
import { RI } from '../sim/catalog';
import { AtlasLayout } from '../sim/layout';
import { NeuroSim } from '../sim/network';
import { makeBrainFixture } from '../testing/brainFixture';
import { DEFAULT_MODEL, nodeHealth, specFromHealth, specFromState } from './bridge';

function setup() {
  const { brain, cortex } = makeBrainFixture();
  const sim = new NeuroSim();
  sim.build(new AtlasLayout(brain, cortex));
  return { brain, sim };
}

describe('nodeHealth', () => {
  it('is 1 everywhere in an undamaged brain', () => {
    const { brain, sim } = setup();
    expect(nodeHealth(sim, brain)).toEqual(new Array(brain.nodes.length).fill(1));
  });

  it('drops to 0 for a node whose neurons are all dead and leaves others intact', () => {
    const { brain, sim } = setup();
    for (let i = 0; i < sim.n; i++) if (sim.node[i] === 2) sim.killNeuron(i);
    const h = nodeHealth(sim, brain);
    expect(h[2]).toBe(0);
    expect(h[3]).toBe(1);
  });

  it('reports the fraction of surviving neurons', () => {
    const { brain, sim } = setup();
    const members = Array.from({ length: sim.n }, (_, i) => i).filter(i => sim.node[i] === 4);
    members.slice(0, Math.floor(members.length / 2)).forEach(i => sim.killNeuron(i));
    expect(nodeHealth(sim, brain)[4]).toBeCloseTo(Math.ceil(members.length / 2) / members.length);
  });

  it('falls back to the region survival rate for nodes no neuron landed in', () => {
    const { brain, sim } = setup();
    for (let i = 0; i < sim.n; i++) if (sim.node[i] === 0) sim.node[i] = -1;
    for (const i of sim.regionMembers[RI.prefrontal]) sim.killNeuron(i);
    expect(nodeHealth(sim, brain)[0]).toBe(0);
  });
});

describe('specFromState', () => {
  it('carries the current chemistry, health and receptor maps into the model spec', () => {
    const { brain, sim } = setup();
    sim.chem.gaba = 2.4;
    for (let i = 0; i < sim.n; i++) if (sim.node[i] === 1) sim.killNeuron(i);
    const spec = specFromState(brain, sim, { ...DEFAULT_MODEL, G: 0.9 });
    expect(spec.chemistry.gaba).toBe(2.4);
    expect(spec.health[1]).toBe(0);
    expect(spec.receptors).toHaveLength(brain.nodes.length);
    expect(spec.receptorNames).toEqual(brain.receptors.names);
    expect(spec.G).toBe(0.9);
  });

  it('snapshots chemistry rather than sharing the live object', () => {
    const { brain, sim } = setup();
    const spec = specFromState(brain, sim, DEFAULT_MODEL);
    sim.chem.gaba = 3;
    expect(spec.chemistry.gaba).toBe(1);
  });
});

describe('specFromHealth', () => {
  it('uses the given health and chemistry instead of the live brain', () => {
    const { brain } = makeBrainFixture();
    const health = brain.nodes.map((_, i) => (i === 0 ? 0.2 : 1));
    const spec = specFromHealth(brain, health, { glutamate: 1, gaba: 1, dopamine: 1, serotonin: 1, acetylcholine: 1 }, { ...DEFAULT_MODEL, G: 1.3 });
    expect(spec.health).toEqual(health);
    expect(spec.G).toBe(1.3);
    expect(spec.sc).toBe(brain.sc);
  });
});
