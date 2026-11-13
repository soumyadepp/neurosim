import { brain, getAtlas, refreshHud, runTask, setSurfaceOverride, ui, wholeBrainClient } from './engine.svelte';
import { TASKS, type TaskDef } from './sim/catalog';
import { paintTau } from './render/paint';
import { neuronAtrophy } from './disease/atrophy';
import {
  ATROPHY_MAX, buildCourse, meanWithin, phaseAt, RESERVE,
  type Course, type Milestones, type Phase, type ReserveLevel,
} from './disease/progression';
import { SCENARIOS, SPREAD_DEFAULTS, scenarioNodes, type DiseaseScenario, type ScenarioId } from './disease/scenarios';
import { simulateSpread, tauAt, type SpreadResult, type Treatment } from './disease/spread';
import { ARRIVAL_THRESHOLD, arrivalTimes, braakAgreement, type StagingAgreement } from './disease/staging';
import { crossesAny, haptic } from './haptics';
import { TOUR_STEPS, tourStopYear, type TourStep } from './disease/tour';
import { diseaseSpec, HORIZON, NETWORK_TIMES, START_AGE } from './disease/course';

export { HORIZON, NETWORK_TIMES, START_AGE };

export type TreatmentStart = 'none' | 'biomarker' | 'network' | 'symptoms';
export type DetectionPoint = Exclude<TreatmentStart, 'none'>;

export const DETECTION_POINTS: DetectionPoint[] = ['biomarker', 'network', 'symptoms'];
const PLAY_YEARS_PER_SECOND = 2;
const PLAY_FRAME_MS = 50;
const TOUR_SEEN_KEY = 'neurosim.tourSeen';

/**
 * Gain in years before needing care for a treatment start, or null if care is never needed
 * within the horizon, or undefined while the start point is still being simulated.
 */
export type Gain = number | null | undefined;

export const disease = $state({
  active: false,
  scenario: 'alzheimers' as ScenarioId,
  year: 0,
  playing: false,
  reserve: 'typical' as ReserveLevel,
  treatAt: 'none' as TreatmentStart,
  efficacy: 0.3,
  testAge: null as number | null,
});

export const tour = $state({ step: null as TourStep | null });

export const course = $state({
  untreated: null as Course | null,
  treated: null as Course | null,
  treatmentYear: null as number | null,
  gains: {} as Partial<Record<DetectionPoint, Gain>>,
  staging: null as StagingAgreement | null,
  networkDone: 0,
});

interface NetworkJob {
  spread: SpreadResult;
  values: number[];
}

const spreads = new Map<string, SpreadResult>();
const networks = new Map<string, NetworkJob>();
let wanted: string[] = [];
let pumping = false;
let shown: SpreadResult | null = null;
let timer: ReturnType<typeof setInterval> | undefined;

function scenario(): DiseaseScenario {
  return SCENARIOS.find(s => s.id === disease.scenario)!;
}

function key(t: Treatment | null): string {
  return t ? `${disease.scenario}|${t.startYear.toFixed(3)}|${t.efficacy.toFixed(3)}` : `${disease.scenario}|none`;
}

function spreadFor(t: Treatment | null): SpreadResult {
  const k = key(t);
  let res = spreads.get(k);
  if (!res) {
    const nodes = getAtlas()!.brain.nodes;
    res = simulateSpread({ sc: getAtlas()!.brain.sc, seeds: scenarioNodes(nodes, scenario().seeds), params: SPREAD_DEFAULTS, treatment: t });
    spreads.set(k, res);
  }
  return res;
}

function networkFor(t: Treatment | null, spread: SpreadResult): number[] {
  const k = key(t);
  if (!networks.has(k)) networks.set(k, { spread, values: [] });
  return networks.get(k)!.values;
}

function courseFor(t: Treatment | null): Course {
  const spread = spreadFor(t);
  const fn = scenarioNodes(getAtlas()!.brain.nodes, scenario().functionRegions);
  return buildCourse(spread, fn, RESERVE[disease.reserve], NETWORK_TIMES, networkFor(t, spread));
}

/**
 * Simulates the whole-brain model, one sampled year at a time, for whichever courses are on
 * screen. Points stream into the chart as they finish, and switching scenario or treatment simply
 * redirects the loop to the newly wanted course.
 */
async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    const atlas = getAtlas()!;
    const n = atlas.brain.nodes.length;
    const empirical = atlas.brain.fc.flat();
    for (;;) {
      const job = wanted.map(k => networks.get(k)).find(j => j && j.values.length < NETWORK_TIMES.length);
      if (!job) break;
      const fn = scenarioNodes(atlas.brain.nodes, scenario().functionRegions);
      const spec = diseaseSpec(atlas.brain, tauAt(job.spread, NETWORK_TIMES[job.values.length]));
      const result = await wholeBrainClient().evaluate(spec, empirical);
      job.values.push(meanWithin(result.fc, n, fn));
      refresh();
    }
  } finally {
    pumping = false;
  }
}

function gainFor(untreated: Milestones, point: DetectionPoint): Gain {
  const start = untreated[point];
  if (start === null) return point === 'network' ? undefined : null;
  if (untreated.care === null) return null;
  const care = courseFor({ startYear: start, efficacy: disease.efficacy }).milestones.care;
  return care === null ? null : care - untreated.care;
}

/**
 * Recomputes every curve, milestone and gain from the current choices, then redraws the brain at
 * the current age. Spread runs are cached, so only new choices cost anything.
 */
function refresh(): void {
  if (!disease.active) return;
  const untreated = courseFor(null);
  const wantedNow = [key(null)];
  let treated: Course | null = null;
  let treatmentYear: number | null = null;
  if (disease.treatAt !== 'none') {
    treatmentYear = untreated.milestones[disease.treatAt];
    if (treatmentYear !== null) {
      const t = { startYear: treatmentYear, efficacy: disease.efficacy };
      treated = courseFor(t);
      wantedNow.push(key(t));
    }
  }
  wanted = wantedNow;
  const gains = Object.fromEntries(DETECTION_POINTS.map(p => [p, gainFor(untreated.milestones, p)]));
  shown = spreadFor(treated && treatmentYear !== null ? { startYear: treatmentYear, efficacy: disease.efficacy } : null);
  course.untreated = untreated;
  course.treated = treated;
  course.treatmentYear = treatmentYear;
  course.gains = gains;
  course.networkDone = untreated.network.length;
  void pump();
  applyYear();
}

function computeStaging(): void {
  const atlas = getAtlas()!;
  course.staging = scenario().staged
    ? braakAgreement(atlas.brain.nodes.map(n => n.label), arrivalTimes(spreadFor(null), ARRIVAL_THRESHOLD))
    : null;
}

/**
 * Paints tau on the cortex and thins the spiking network to match the current age.
 */
function applyYear(): void {
  if (!disease.active || !shown) return;
  const atlas = getAtlas()!;
  const tau = tauAt(shown, disease.year);
  setSurfaceOverride(paintTau(tau));
  brain.setAtrophy(neuronAtrophy({ node: brain.node, region: brain.reg, hemi: brain.hemi }, atlas.brain.nodes, tau.map(t => ATROPHY_MAX * t)));
  refreshHud();
}

export function diseaseAvailable(): boolean {
  return getAtlas() !== null;
}

export function enterDisease(): void {
  if (!diseaseAvailable()) return;
  disease.active = true;
  computeStaging();
  refresh();
  if (!tourSeen() && tour.step === null && disease.scenario === 'alzheimers') startTour();
}

export function leaveDisease(): void {
  if (tour.step !== null) endTour();
  pause();
  disease.active = false;
  wanted = [];
  setSurfaceOverride(null);
  brain.setAtrophy(new Float32Array(brain.n));
  refreshHud();
}

export function setScenario(id: ScenarioId): void {
  if (id === disease.scenario) return;
  if (tour.step !== null && tour.step !== 'treat') endTour();
  disease.scenario = id;
  disease.testAge = null;
  computeStaging();
  refresh();
}

export function setReserve(level: ReserveLevel): void {
  disease.reserve = level;
  refresh();
}

export function setTreatment(start: TreatmentStart): void {
  disease.treatAt = start;
  refresh();
}

export function setEfficacy(value: number): void {
  disease.efficacy = value;
  refresh();
}

export function setYear(year: number): void {
  if (ui.runningTaskId) return;
  const from = disease.year;
  const to = Math.min(HORIZON, Math.max(0, year));
  disease.year = to;
  applyYear();
  const milestones = (course.treated ?? course.untreated)?.milestones;
  if (milestones && crossesAny(from, to, [milestones.biomarker, milestones.network, milestones.symptoms, milestones.care])) {
    haptic('milestone');
  }
}

/**
 * Plays the timeline forward, stopping at the given year (the end of the horizon by default).
 */
export function play(until = HORIZON): void {
  if (disease.playing || ui.runningTaskId) return;
  if (disease.year >= until) setYear(0);
  disease.playing = true;
  timer = setInterval(() => {
    const next = disease.year + (PLAY_YEARS_PER_SECOND * PLAY_FRAME_MS) / 1000;
    if (next >= until) { setYear(until); pause(); return; }
    setYear(next);
  }, PLAY_FRAME_MS);
}

export function pause(): void {
  clearInterval(timer);
  disease.playing = false;
}

export function togglePlay(): void {
  if (tour.step !== null && tour.step !== 'treat') endTour();
  if (disease.playing) pause();
  else play();
}

/**
 * Records that the tour was seen. Where storage is blocked the tour simply shows again next visit.
 */
function rememberTourSeen(): void {
  try { localStorage.setItem(TOUR_SEEN_KEY, '1'); } catch { return; }
}

function tourSeen(): boolean {
  try { return localStorage.getItem(TOUR_SEEN_KEY) === '1'; } catch { return false; }
}

/**
 * Starts the guided walk through typical Alzheimer's from the silent start.
 */
export function startTour(): void {
  pause();
  setScenario('alzheimers');
  setTreatment('none');
  setYear(0);
  tour.step = 'start';
}

/**
 * Advances to the next step, playing the timeline up to that step's milestone.
 */
export function nextTourStep(): void {
  const i = tour.step === null ? -1 : TOUR_STEPS.indexOf(tour.step);
  const step = TOUR_STEPS[i + 1];
  if (!step || !course.untreated) { endTour(); return; }
  tour.step = step;
  haptic('select');
  const stop = tourStopYear(step, course.untreated.milestones, disease.year);
  if (stop > disease.year) play(stop);
}

export function endTour(): void {
  tour.step = null;
  rememberTourSeen();
}

export function scenarioTask(): TaskDef {
  return TASKS.find(t => t.id === scenario().taskId)!;
}

/**
 * Runs the scenario's task on the live spiking brain as damaged at the current age.
 */
export function testAtCurrentAge(): void {
  if (ui.runningTaskId) return;
  pause();
  disease.testAge = ageAt(disease.year);
  runTask(scenarioTask());
}

export function ageAt(year: number): number {
  return Math.floor(START_AGE + year);
}

export function currentPhase(): Phase {
  const c = course.treated ?? course.untreated;
  return c ? phaseAt(c.milestones, disease.year) : 'silent';
}
