/**
 * Numbers the landing page quotes from the simulation's default Alzheimer's course (typical
 * reserve, treatment slowing spread by 30 percent). The landing page renders before the brain data
 * loads, so they are fixed here; a test recomputes them from the model and fails if they drift.
 */
export const SIM_FACTS = {
  ages: { biomarker: 59, network: 62, symptoms: 68, care: 74 },
  silentWindow: 9,
  efficacy: 0.3,
  gains: { biomarker: 6.7, network: 5.5, symptoms: 2.9 },
} as const;

/**
 * How well each model scores against the real measurements it can be checked against, plus the
 * size of the shipped dataset. A test recomputes every number from the data and the model and
 * fails if the evidence page drifts from what the app actually does.
 */
export const EVIDENCE_FACTS = {
  modelR: 0.4,
  modelMeanFc: 0.11,
  connectomeR: 0.43,
  empiricalMeanFc: 0.23,
  braakRho: 0.39,
  parkinsons: { r: 0.42, median: 0.07, year: 20 },
  meg: {
    bands: ['delta', 'theta', 'alpha', 'beta', 'gamma1', 'gamma2'],
    r: [0.791, 0.895, 0.841, 0.795, 0.684, 0.683],
    nullMean: [0.533, 0.546, 0.523, 0.559, 0.439, 0.412],
    p: [0.0143, 0.002, 0.0037, 0.018, 0.0556, 0.0406],
    spins: 10000,
  },
  regions: 68,
  receptors: 19,
} as const;
