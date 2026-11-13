import { describe, expect, it } from 'vitest';
import { REGIONS, RI } from './catalog';
import { AtlasLayout } from './layout';
import { NeuroSim } from './network';
import { makeBrainFixture } from '../testing/brainFixture';

function atlasSim(): NeuroSim {
  const { brain, cortex } = makeBrainFixture();
  const sim = new NeuroSim();
  sim.build(new AtlasLayout(brain, cortex));
  return sim;
}

describe('NeuroSim on real anatomy', () => {
  it('builds every catalogued neuron and wires synapses', () => {
    const sim = atlasSim();
    expect(sim.n).toBe(REGIONS.reduce((a, r) => a + r.n, 0));
    expect(sim.s).toBeGreaterThan(sim.n);
  });

  it('runs without numerical blow-ups', () => {
    const sim = atlasSim();
    for (let i = 0; i < 300; i++) sim.step();
    expect(Array.from(sim.v).every(Number.isFinite)).toBe(true);
  });

  it('raises thresholds most where GABA-A receptors are densest under a GABA agonist', () => {
    const sim = atlasSim();
    sim.receptorProfiles = { motor: { GABAa: 2 }, visual: { GABAa: 0.5 } };
    sim.chem.gaba = 1.5;
    const m = sim.modulation();
    expect(m.thr[RI.motor]).toBeGreaterThan(m.thr[RI.visual]);
    expect(m.inh[RI.motor]).toBeGreaterThan(m.inh[RI.visual]);
  });
});

describe('NeuroSim atrophy', () => {
  it('kills the requested fraction and revives it when the fraction falls', () => {
    const sim = atlasSim();
    sim.setAtrophy(new Float32Array(sim.n).fill(0.5));
    const dead = sim.n - sim.aliveCount();
    expect(dead / sim.n).toBeGreaterThan(0.35);
    expect(dead / sim.n).toBeLessThan(0.65);
    sim.setAtrophy(new Float32Array(sim.n));
    expect(sim.aliveCount()).toBe(sim.n);
  });

  it('kills the same neurons for the same fraction', () => {
    const sim = atlasSim();
    sim.setAtrophy(new Float32Array(sim.n).fill(0.3));
    const first = Array.from(sim.alive);
    sim.setAtrophy(new Float32Array(sim.n));
    sim.setAtrophy(new Float32Array(sim.n).fill(0.3));
    expect(Array.from(sim.alive)).toEqual(first);
  });

  it('never revives neurons lost to a lesion', () => {
    const sim = atlasSim();
    sim.setAtrophy(new Float32Array(sim.n).fill(1));
    sim.killNeuron(0);
    sim.setAtrophy(new Float32Array(sim.n));
    expect(sim.alive[0]).toBe(0);
    expect(sim.aliveCount()).toBe(sim.n - 1);
  });

  it('heals atrophy along with everything else', () => {
    const sim = atlasSim();
    sim.setAtrophy(new Float32Array(sim.n).fill(1));
    sim.healAll();
    expect(sim.aliveCount()).toBe(sim.n);
    sim.setAtrophy(new Float32Array(sim.n));
    expect(sim.aliveCount()).toBe(sim.n);
  });
});
