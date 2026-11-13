import { describe, expect, it } from 'vitest';
import { BASELINE_CHEMISTRY, REGIONS, RI, type Chemistry } from './catalog';
import { regionModulation, type ReceptorProfiles } from './modulation';

const drug = { thr: 0, noiseMul: 1 };

/**
 * The formulas NeuroSim used before receptor maps existed, kept here as the regression oracle.
 */
function legacy(c: Chemistry, noise: number, thr = 0, noiseMul = 1) {
  return {
    exc: c.glutamate,
    inh: c.gaba,
    thr: (c.gaba - 1) * 5 - (c.acetylcholine - 1) * 3 + thr,
    frontal: -(c.dopamine - 1) * 4,
    noise: Math.max(0, noise * (1 - 0.35 * (c.serotonin - 1)) * (1 + 0.5 * (c.dopamine - 1)) * noiseMul),
  };
}

const FRONTAL = new Set([RI.prefrontal, RI.frontal, RI.motor]);

describe('regionModulation', () => {
  const cases: Chemistry[] = [
    BASELINE_CHEMISTRY,
    { ...BASELINE_CHEMISTRY, gaba: 2.4, glutamate: 0.5 },
    { ...BASELINE_CHEMISTRY, dopamine: 1.8, serotonin: 1.6, acetylcholine: 0.7 },
  ];

  it.each(cases)('reproduces the legacy global formulas when there are no receptor maps (%o)', chem => {
    const m = regionModulation(chem, drug, 0.03, null);
    const l = legacy(chem, 0.03);
    for (let r = 0; r < REGIONS.length; r++) {
      expect(m.exc[r]).toBeCloseTo(l.exc);
      expect(m.inh[r]).toBeCloseTo(l.inh);
      expect(m.thr[r]).toBeCloseTo(l.thr + (FRONTAL.has(r) ? l.frontal : 0));
      expect(m.noise[r]).toBeCloseTo(l.noise);
    }
  });

  it('scales each drug effect by the regional receptor density', () => {
    const profiles: ReceptorProfiles = { motor: { GABAa: 2, NMDA: 0.5, mGluR5: 0.5 } };
    const m = regionModulation({ ...BASELINE_CHEMISTRY, gaba: 1.3, glutamate: 0.8 }, drug, 0.03, profiles);
    expect(m.inh[RI.motor]).toBeCloseTo(1 + 0.3 * 2);
    expect(m.exc[RI.motor]).toBeCloseTo(1 - 0.2 * 0.5);
    expect(m.inh[RI.visual]).toBeCloseTo(1.3);
  });

  it('never lets synaptic gains go negative', () => {
    const profiles: ReceptorProfiles = { motor: { GABAa: 3 } };
    const m = regionModulation({ ...BASELINE_CHEMISTRY, gaba: 0 }, drug, 0.03, profiles);
    expect(m.inh[RI.motor]).toBe(0);
  });

  it('applies drug-wide threshold and arousal offsets everywhere', () => {
    const m = regionModulation(BASELINE_CHEMISTRY, { thr: -1, noiseMul: 1.25 }, 0.04, null);
    expect(m.thr[RI.visual]).toBeCloseTo(-1);
    expect(m.noise[RI.visual]).toBeCloseTo(0.05);
  });
});

describe('receptor families', () => {
  const uniform = { noise: 0.03, drug: { thr: 0, noiseMul: 1 } };

  it('averages every receptor a transmitter acts through', () => {
    const both = regionModulation({ ...BASELINE_CHEMISTRY, glutamate: 2 }, uniform.drug, uniform.noise, {
      motor: { NMDA: 2, mGluR5: 2 },
      visual: { NMDA: 2, mGluR5: 0 },
    });
    expect(both.exc[RI.motor]).toBeGreaterThan(both.exc[RI.visual]);
  });

  it('treats a receptor the profile omits as average', () => {
    const m = regionModulation({ ...BASELINE_CHEMISTRY, glutamate: 2 }, uniform.drug, uniform.noise, {
      motor: { NMDA: 1 },
    });
    expect(m.exc[RI.motor]).toBeCloseTo(2);
  });

  it('uses nicotinic as well as muscarinic receptors for acetylcholine', () => {
    const m = regionModulation({ ...BASELINE_CHEMISTRY, acetylcholine: 2 }, uniform.drug, uniform.noise, {
      motor: { M1: 2, A4B2: 2 },
      visual: { M1: 2, A4B2: 0 },
    });
    expect(m.thr[RI.motor]).toBeLessThan(m.thr[RI.visual]);
  });
});
