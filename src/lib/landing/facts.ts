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
  tau: {
    maps: ['limbic', 'mtlSparing', 'posterior', 'leftTemporal', 'clinic'],
    scenarios: ['alzheimers', 'ftd', 'pca'],
    rho: [
      [0.44, -0.05, -0.03],
      [0.27, -0.19, 0.12],
      [0.6, -0.45, 0.46],
      [0.42, -0.14, 0.03],
      [0.41, -0.32, 0.33],
    ],
    p: [
      [0.021, 0.586, 0.581],
      [0.089, 0.835, 0.267],
      [0.013, 0.985, 0.026],
      [0.018, 0.729, 0.428],
      [0.047, 0.947, 0.049],
    ],
    spins: 1000,
    people: 1612,
  },
  tauAtrophy: { r: 0.828, nullMean: 0.011, p: 0.0019, spins: 10000, patients: 32 },
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
