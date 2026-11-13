import { describe, expect, it } from 'vitest';
import atlas from '../../../public/data/brain.json';
import spinFile from '../testing/spins.json';
import type { BrainData } from '../data/brainData';
import { diseaseSpec, DISEASE_COUPLING, NETWORK_TIMES, START_AGE } from '../disease/course';
import { DEFAULT_MODEL, specFromHealth } from '../wholebrain/bridge';
import { BASELINE_CHEMISTRY } from '../sim/catalog';
import { buildCourse, healthFromTau, meanWithin, RESERVE, type Course } from '../disease/progression';
import { SCENARIOS, SPREAD_DEFAULTS, scenarioNodes } from '../disease/scenarios';
import { simulateSpread, tauAt, type Treatment } from '../disease/spread';
import { ARRIVAL_THRESHOLD, arrivalTimes, braakAgreement } from '../disease/staging';
import { spinTest } from '../disease/pattern';
import { epicenterFit } from '../disease/epicenter';
import { evaluate } from '../wholebrain/experiment';
import { strings } from '../strings';
import { EVIDENCE_FACTS, SIM_FACTS } from './facts';
import { gradeAgainstChance } from './verdict';

const brain = atlas as unknown as BrainData;
const ad = SCENARIOS[0];
const seeds = scenarioNodes(brain.nodes, ad.seeds);
const fn = scenarioNodes(brain.nodes, ad.functionRegions);
const empirical = brain.fc.flat();

function course(treatment: Treatment | null, withNetwork: boolean): Course {
  const spread = simulateSpread({ sc: brain.sc, seeds, params: SPREAD_DEFAULTS, treatment });
  const network = withNetwork
    ? NETWORK_TIMES.map(t => meanWithin(evaluate(diseaseSpec(brain, tauAt(spread, t)), empirical).fc, brain.nodes.length, fn))
    : [];
  return buildCourse(spread, fn, RESERVE.typical, NETWORK_TIMES, network);
}

describe('SIM_FACTS', () => {
  const base = course(null, true).milestones;
  const age = (y: number | null) => Math.floor(START_AGE + (y ?? NaN));
  const gain = (start: number | null) => course({ startYear: start!, efficacy: SIM_FACTS.efficacy }, false).milestones.care! - base.care!;

  it('quotes the ages the simulation produces for typical Alzheimer’s', () => {
    expect(age(base.biomarker)).toBe(SIM_FACTS.ages.biomarker);
    expect(age(base.network)).toBe(SIM_FACTS.ages.network);
    expect(age(base.symptoms)).toBe(SIM_FACTS.ages.symptoms);
    expect(age(base.care)).toBe(SIM_FACTS.ages.care);
    expect(Math.round(base.symptoms! - Math.min(base.biomarker!, base.network!))).toBe(SIM_FACTS.silentWindow);
  });

  it('quotes the years of care-free life each treatment start buys', () => {
    expect(gain(base.biomarker)).toBeCloseTo(SIM_FACTS.gains.biomarker, 1);
    expect(gain(base.network)).toBeCloseTo(SIM_FACTS.gains.network, 1);
    expect(gain(base.symptoms)).toBeCloseTo(SIM_FACTS.gains.symptoms, 1);
  });
}, 30000);

describe('EVIDENCE_FACTS', () => {
  it('quotes the model fit this brain actually produces when healthy', () => {
    const noTau = new Array(brain.nodes.length).fill(0);
    const spec = specFromHealth(brain, healthFromTau(noTau), BASELINE_CHEMISTRY, { ...DEFAULT_MODEL, G: DISEASE_COUPLING });
    const result = evaluate(spec, empirical);
    expect(result.r).toBeCloseTo(EVIDENCE_FACTS.modelR, 2);
    expect(result.meanFc).toBeCloseTo(EVIDENCE_FACTS.modelMeanFc, 2);
  });

  it('quotes the connectome baseline and empirical mean recorded in the dataset', () => {
    expect(brain.validation.scFcR).toBeCloseTo(EVIDENCE_FACTS.connectomeR, 2);
    expect(brain.validation.empiricalMeanFc).toBeCloseTo(EVIDENCE_FACTS.empiricalMeanFc, 2);
  });

  it('quotes the receptor to MEG scores, chance levels and p-values recorded in the dataset', () => {
    const recorded = brain.validation.megReceptors;
    expect(recorded.bands).toEqual([...EVIDENCE_FACTS.meg.bands]);
    expect(recorded.r).toEqual([...EVIDENCE_FACTS.meg.r]);
    expect(recorded.nullMean).toEqual([...EVIDENCE_FACTS.meg.nullMean]);
    expect(recorded.p).toEqual([...EVIDENCE_FACTS.meg.p]);
    expect(recorded.spins).toBe(EVIDENCE_FACTS.meg.spins);
  });

  it('quotes the agreement between the spread model and Braak staging', () => {
    const spread = simulateSpread({ sc: brain.sc, seeds, params: SPREAD_DEFAULTS });
    const staging = braakAgreement(brain.nodes.map(n => n.label), arrivalTimes(spread, ARRIVAL_THRESHOLD));
    expect(staging.rho).toBeCloseTo(EVIDENCE_FACTS.braakRho, 2);
    expect(staging.regions).toBe(EVIDENCE_FACTS.regions);
  });

  it('describes the dataset the app actually ships', () => {
    expect(brain.nodes.length).toBe(EVIDENCE_FACTS.regions);
    expect(brain.receptors.names.length).toBe(EVIDENCE_FACTS.receptors);
  });

  it('credits every source the dataset carries, with its licence', () => {
    const quoted = strings.evidence.datasets.map(d => d.name);
    for (const source of brain.sources) {
      const match = strings.evidence.datasets.find(d => d.name === source.name);
      expect(quoted, source.name).toContain(source.name);
      expect(match?.licence).toBe(source.license);
      expect(match?.url).toBe(source.url);
    }
  });
}, 30000);

describe('the Parkinson\'s check', () => {
  it('reproduces measured patient atrophy from a connectome seed, better than a typical seed does', () => {
    const column = brain.enigma.disorders.indexOf('parkinsons');
    const atrophy = brain.enigma.values.map(row => -row[column]);
    const fit = epicenterFit(brain.sc, atrophy, SPREAD_DEFAULTS, EVIDENCE_FACTS.parkinsons.year);
    expect(fit.r).toBeCloseTo(EVIDENCE_FACTS.parkinsons.r, 2);
    expect(fit.median).toBeCloseTo(EVIDENCE_FACTS.parkinsons.median, 2);
    expect(fit.r).toBeGreaterThan(fit.median * 3);
  });
}, 300000);

describe('the tau PET check', () => {
  const T = EVIDENCE_FACTS.tau;
  const spins = spinFile as number[][];
  const cell = (map: string, scenario: string) => {
    const m = T.maps.indexOf(map as never), s = T.scenarios.indexOf(scenario as never);
    return { rho: T.rho[m][s], p: T.p[m][s] };
  };

  it('quotes the agreement and p-value the model produces for every condition and measured pattern', () => {
    expect(brain.tau.maps).toEqual([...T.maps]);
    expect(SCENARIOS.map(s => s.id)).toEqual([...T.scenarios]);
    expect(spins.length).toBe(T.spins);
    SCENARIOS.forEach((scenario, s) => {
      const spread = simulateSpread({ sc: brain.sc, seeds: scenarioNodes(brain.nodes, scenario.seeds), params: SPREAD_DEFAULTS });
      const arrival = arrivalTimes(spread, ARRIVAL_THRESHOLD);
      T.maps.forEach((map, m) => {
        const result = spinTest(arrival, brain.tau.values.map(row => row[m]), spins);
        expect(result.rho, `${scenario.id} vs ${map}`).toBeCloseTo(T.rho[m][s], 2);
        expect(result.p, `${scenario.id} vs ${map}`).toBeCloseTo(T.p[m][s], 3);
      });
    });
  }, 60000);

  it('supports what the page says about the visual variant: posterior, and no other subtype', () => {
    expect(cell('posterior', 'pca').p).toBeLessThan(0.05);
    for (const other of ['limbic', 'mtlSparing', 'leftTemporal']) expect(cell(other, 'pca').p).toBeGreaterThan(0.05);
  });

  it('supports what the page says about the control: no Alzheimer’s pattern is reproduced', () => {
    for (const map of T.maps) expect(cell(map, 'ftd').p).toBeGreaterThan(0.05);
  });

  it('supports what the page says about typical Alzheimer’s: limbic matches, posterior matches more', () => {
    expect(cell('limbic', 'alzheimers').p).toBeLessThan(0.05);
    expect(cell('posterior', 'alzheimers').rho).toBeGreaterThan(cell('limbic', 'alzheimers').rho);
  });

  it('supports the warning that nothing survives correction for the whole table', () => {
    const tests = T.maps.length * T.scenarios.length;
    for (const row of T.p) for (const p of row) expect(gradeAgainstChance(p, tests)).not.toBe('solid');
  });

  it('points every scenario at a measured pattern that exists', () => {
    for (const scenario of SCENARIOS) {
      if (scenario.tauPattern !== null) expect(brain.tau.maps).toContain(scenario.tauPattern);
    }
  });

  it('quotes the measured tau to atrophy agreement recorded in the dataset', () => {
    const { patients: _patients, ...quoted } = EVIDENCE_FACTS.tauAtrophy;
    expect(brain.validation.tauAtrophy).toEqual(quoted);
  });
});
