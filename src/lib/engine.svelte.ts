import { NeuroSim, type NetworkState, type TaskResult } from './sim/network';
import { REGIONS, RI, type ChemId, type DamagePreset, type DrugDef, type RegionId, type TaskDef } from './sim/catalog';
import { AtlasLayout, ProceduralLayout } from './sim/layout';
import { HttpBrainDataRepository, type BrainDataRepository, type LoadedBrain } from './data/brainData';
import type { BrainRenderer, Pick } from './render/scene';
import type { LabelView } from './render/labels';
import { paintNetworks, paintScalar } from './render/paint';
import { InlineWholeBrainClient, WorkerWholeBrainClient, type WholeBrainClient } from './wholebrain/client';
import { COUPLING_SWEEP, DEFAULT_MODEL, specFromState, type ModelSettings } from './wholebrain/bridge';
import type { SweepResult } from './wholebrain/experiment';
import { strings } from './strings';

export type TabId = 'tasks' | 'regions' | 'neuron' | 'damage' | 'chem' | 'data' | 'disease';
export type AppMode = 'story' | 'lab';
export type LabTab = Exclude<TabId, 'disease'>;
export type DataSource = 'loading' | 'atlas' | 'procedural';
export type PaintMode = 'regions' | 'networks' | 'fc-real' | 'fc-model' | `receptor:${string}`;

export interface NeuronInfo {
  index: number;
  inhibitory: boolean;
  region: string;
  left: boolean;
  state: 'alive' | 'refractory' | 'dead';
  potential: number;
  threshold: number;
  vesicles: number;
  incoming: number;
  outgoing: number;
  targets: [string, number][];
  msSinceSpike: number | null;
}

export interface HudSnapshot {
  network: NetworkState | null;
  alive: number;
  time: number;
  taskText: string;
  taskProgress: number;
  regionAlive: number[];
  regionActivity: number[];
}

const HUD_EVERY_FRAMES = 6;
const NEURON_INFO_EVERY_FRAMES = 18;
const WARMUP_TICKS = 400;
const DEV_KEY = 'neurosim.dev';
const THEME_KEY = 'neurosim.theme';
const TASK_HIGHLIGHT_MS = 1500;
const DAMAGE_HIGHLIGHT_MS = 1800;

/**
 * Reads whether developer mode was left on. Storage failures mean plain product mode.
 */
function devStored(): boolean {
  try { return localStorage.getItem(DEV_KEY) === '1'; } catch { return false; }
}

export type Theme = 'light' | 'dark';

/**
 * Reads the saved theme choice. Nothing saved means the device setting decides.
 */
function themeStored(): Theme | null {
  try { return localStorage.getItem(THEME_KEY) as Theme | null; } catch { return null; }
}

export const brain = new NeuroSim();

export const ui = $state({
  ready: false,
  dataSource: 'loading' as DataSource,
  dev: devStored(),
  theme: themeStored() as Theme | null,
  mode: 'story' as AppMode,
  tab: 'disease' as TabId,
  labTab: 'tasks' as LabTab,
  paused: false,
  speed: 2,
  shell: 60,
  labels: false,
  lesionMode: false,
  lesionRadius: 0.18,
  lesionInfo: strings.damage.lesionIdle,
  selectedRegion: -1,
  runningTaskId: null as string | null,
  taskResult: null as TaskResult | null,
  degenerating: false,
  drugId: 'none',
  chem: { ...brain.chem },
  noise: brain.noise,
  chemNote: strings.chem.baselineNote,
  hudFrame: 0,
  hud: snapshotHud() as HudSnapshot,
  neuron: null as NeuronInfo | null,
});

export const overlay = $state({ labels: null as LabelView | null });

export const model = $state({
  status: 'idle' as 'idle' | 'running' | 'error',
  G: DEFAULT_MODEL.G,
  homotopicStrength: DEFAULT_MODEL.homotopicStrength,
  result: null as { r: number; meanFc: number; fc: number[] } | null,
  sweep: null as SweepResult | null,
  error: '',
  paint: 'regions' as PaintMode,
  seed: 0,
});

let atlas: LoadedBrain | null = null;
let wholeBrain: WholeBrainClient | null = null;
let renderer: BrainRenderer | null = null;
let frame = 0;
let highlightTimer: ReturnType<typeof setTimeout> | undefined;
let surfaceOverride: Float32Array | null = null;
let booting: Promise<void> | null = null;

brain.onTaskDone = result => {
  ui.runningTaskId = null;
  ui.taskResult = result;
  highlightTimer = setTimeout(restoreHighlight, TASK_HIGHLIGHT_MS);
};

function regionSet(ids: RegionId[]): Set<number> {
  return new Set(ids.map(id => RI[id]));
}

function restoreHighlight(): void {
  if (brain.task) return;
  renderer?.setHighlight(ui.selectedRegion >= 0 ? new Set([ui.selectedRegion]) : null);
}

function flashHighlight(set: Set<number>, ms: number): void {
  clearTimeout(highlightTimer);
  renderer?.setHighlight(set);
  highlightTimer = setTimeout(restoreHighlight, ms);
}

function snapshotHud(): HudSnapshot {
  const regionAlive = REGIONS.map((_, r) => brain.aliveCount(r));
  const task = brain.task;
  return {
    network: brain.tick > 0 ? brain.networkState() : null,
    alive: brain.aliveCount(),
    time: brain.tick,
    taskText: task
      ? strings.hud.task(task.def.name, REGIONS[RI[task.def.input]].name, REGIONS[task.outReg].name, task.count)
      : '',
    taskProgress: task ? Math.min(1, (brain.tick - task.start) / (task.end - task.start)) : 0,
    regionAlive,
    regionActivity: regionAlive.map((a, r) => Math.min(1, brain.regAct[r] / (a || 1) * 1.8)),
  };
}

function snapshotNeuron(i: number): NeuronInfo {
  const targets: Record<string, number> = {};
  for (let k = brain.outStart[i]; k < brain.outStart[i + 1]; k++) {
    const name = REGIONS[brain.reg[brain.post[brain.outIdx[k]]]].name;
    targets[name] = (targets[name] ?? 0) + 1;
  }
  return {
    index: i,
    inhibitory: !!brain.inhib[i],
    region: REGIONS[brain.reg[i]].name,
    left: brain.hemi[i] < 0,
    state: !brain.alive[i] ? 'dead' : brain.refr[i] ? 'refractory' : 'alive',
    potential: brain.v[i],
    threshold: brain.thresholdOf(i),
    vesicles: Math.round(brain.res[i] * 100),
    incoming: brain.inCount[i],
    outgoing: brain.outStart[i + 1] - brain.outStart[i],
    targets: Object.entries(targets),
    msSinceSpike: brain.spikeT[i] > 0 ? brain.tick - brain.spikeT[i] : null,
  };
}

export function refreshHud(): void {
  ui.hud = snapshotHud();
  ui.degenerating = brain.degenerate;
  ui.hudFrame++;
}

function refreshNeuron(): void {
  ui.neuron = brain.selected >= 0 ? snapshotNeuron(brain.selected) : null;
}

const nextFrame = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Loads real anatomy if it is available, builds and calibrates the spiking network, then marks the
 * engine ready. Falls back to the procedural brain when the atlas data cannot be loaded.
 */
export async function boot(repo: BrainDataRepository = new HttpBrainDataRepository(`${import.meta.env.BASE_URL}data`)): Promise<void> {
  try {
    atlas = await repo.load();
    brain.receptorProfiles = atlas.brain.receptors.simRegions;
    brain.build(new AtlasLayout(atlas.brain, atlas.cortex));
    ui.dataSource = 'atlas';
    const seed = atlas.brain.nodes.findIndex(n => n.label === 'precentral' && n.hemi === 'L');
    model.seed = Math.max(0, seed);
  } catch (err) {
    console.warn('NeuroSim: atlas data unavailable, using the procedural brain.', err);
    atlas = null;
    brain.build(new ProceduralLayout());
    ui.dataSource = 'procedural';
  }
  await nextFrame();
  brain.calibrate();
  for (let i = 0; i < WARMUP_TICKS; i++) brain.step();
  ui.hud = snapshotHud();
  ui.ready = true;
}

/**
 * Starts loading and calibrating the brain once, however many times it is called.
 */
export function ensureBooted(): Promise<void> {
  booting ??= boot();
  return booting;
}

export function getAtlas(): LoadedBrain | null {
  return atlas;
}

/**
 * Hands the engine its renderer so actions can drive highlights, lesion markers and surface paint.
 */
export function attachRenderer(r: BrainRenderer | null): void {
  renderer = r;
  r?.setShellOpacity(ui.shell / 100);
  applyPaint();
}

/**
 * Advances the simulation for one animation frame and pushes periodic snapshots into reactive state.
 */
export function frameStep(): void {
  if (!ui.paused) for (let k = 0; k < ui.speed; k++) brain.step();
  renderer?.render(ui.speed);
  if (ui.labels && renderer) overlay.labels = renderer.projectLabels();
  frame++;
  if (frame % HUD_EVERY_FRAMES === 0) refreshHud();
  if (ui.tab === 'neuron' && frame % NEURON_INFO_EVERY_FRAMES === 0) refreshNeuron();
}

export function setTab(tab: TabId): void {
  ui.tab = tab;
  if (tab !== 'disease') ui.labTab = tab;
}

/**
 * Switches between the guided story (the dementia timeline) and the lab, which holds every
 * hands-on tool. The lab reopens on whichever tool was last used there.
 */
/**
 * Turns developer mode on or off. Off hides the lab and every model internal; the preference is
 * remembered on this browser.
 */
export function setDev(on: boolean): void {
  ui.dev = on;
  try { if (on) localStorage.setItem(DEV_KEY, '1'); else localStorage.removeItem(DEV_KEY); } catch { return; }
  if (!on && ui.mode === 'lab') setMode('story');
}

/**
 * Sets and remembers the theme. The choice wins over the device setting from then on.
 */
export function setTheme(theme: Theme): void {
  ui.theme = theme;
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch { return; }
}

export function setMode(mode: AppMode): void {
  ui.mode = mode;
  ui.tab = mode === 'story' ? 'disease' : ui.labTab;
}

export function toggleLabels(): void {
  ui.labels = !ui.labels;
}

export function setShell(value: number): void {
  ui.shell = value;
  renderer?.setShellOpacity(value / 100);
}

export function resetActivity(): void {
  brain.resetActivity();
  ui.runningTaskId = null;
  ui.taskResult = null;
  clearTimeout(highlightTimer);
  restoreHighlight();
}

export function runTask(def: TaskDef): void {
  if (brain.task) return;
  clearTimeout(highlightTimer);
  brain.startTask(def);
  ui.runningTaskId = def.id;
  ui.taskResult = null;
  renderer?.setHighlight(regionSet(def.path));
  refreshHud();
}

export function toggleRegion(r: number): void {
  ui.selectedRegion = ui.selectedRegion === r ? -1 : r;
  clearTimeout(highlightTimer);
  restoreHighlight();
}

export function selectNeuron(i: number): void {
  brain.selected = i;
  brain.trace.fill(-70);
  refreshNeuron();
  ui.tab = 'neuron';
}

export function stimulateSelected(): void {
  if (brain.selected >= 0) brain.stimulate(brain.selected);
}

export function flashSelectedAxon(): void {
  const i = brain.selected;
  if (i < 0) return;
  for (let k = brain.outStart[i]; k < brain.outStart[i + 1]; k++) brain.edgeGlow[brain.outIdx[k]] = 1;
}

export function killSelected(): void {
  if (brain.selected < 0) return;
  brain.killNeuron(brain.selected);
  refreshHud();
  refreshNeuron();
}

export function toggleLesionMode(): void {
  ui.lesionMode = !ui.lesionMode;
}

/**
 * Routes a click on the 3D view: in lesion mode it damages the surface, otherwise it selects a neuron.
 */
export function handleViewportClick(x: number, y: number): void {
  if (!renderer) return;
  const pick: Pick | null = renderer.pick(x, y, ui.lesionMode);
  if (!pick) return;
  if (pick.kind === 'neuron') { if (ui.mode === 'lab') selectNeuron(pick.index); return; }
  const { point } = pick;
  const n = brain.lesionAt(point.x, point.y, point.z, ui.lesionRadius);
  renderer.addLesionMarker(point, ui.lesionRadius);
  ui.lesionInfo = n ? strings.damage.lesionPlaced(n) : strings.damage.lesionMissed;
  refreshHud();
}

export function applyDamage(preset: DamagePreset): void {
  brain.applyDamagePreset(preset);
  if (preset.chem) syncChem();
  refreshHud();
  flashHighlight(regionSet([...preset.regions, ...(preset.leftOf ?? [])]), DAMAGE_HIGHLIGHT_MS);
}

export function toggleDegeneration(): void {
  brain.degenerate = !brain.degenerate;
  ui.degenerating = brain.degenerate;
}

export function healAll(): void {
  brain.healAll();
  syncChem();
  ui.chemNote = strings.chem.baselineNote;
  renderer?.clearLesionMarkers();
  ui.lesionInfo = strings.damage.lesionIdle;
  refreshHud();
}

function syncChem(): void {
  ui.chem = { ...brain.chem };
  ui.drugId = brain.drug.id;
}

export function applyDrug(d: DrugDef): void {
  brain.applyDrug(d);
  syncChem();
  ui.chemNote = d.note;
}

export function setChem(id: ChemId, value: number): void {
  brain.chem[id] = value;
  brain.drug.id = 'custom';
  syncChem();
}

export function setNoise(value: number): void {
  brain.noise = value;
  ui.noise = value;
}

export function wholeBrainClient(): WholeBrainClient {
  if (!wholeBrain) {
    try {
      wholeBrain = new WorkerWholeBrainClient(new Worker(new URL('./wholebrain/wholebrain.worker.ts', import.meta.url), { type: 'module' }));
    } catch {
      wholeBrain = new InlineWholeBrainClient();
    }
  }
  return wholeBrain;
}

function settings(): ModelSettings {
  return { ...DEFAULT_MODEL, G: model.G, homotopicStrength: model.homotopicStrength };
}

/**
 * Runs the whole-brain model under the brain's current damage and chemistry and scores it against real FC.
 */
export async function runModel(): Promise<void> {
  if (!atlas || model.status === 'running') return;
  model.status = 'running';
  model.error = '';
  try {
    const spec = specFromState(atlas.brain, brain, settings());
    model.result = await wholeBrainClient().evaluate(spec, atlas.brain.fc.flat());
    model.status = 'idle';
    if (model.paint === 'fc-model') applyPaint();
  } catch (err) {
    model.status = 'error';
    model.error = err instanceof Error ? err.message : String(err);
  }
}

/**
 * Sweeps global coupling, adopts the best-fitting value and runs the model at it.
 */
export async function fitCoupling(): Promise<void> {
  if (!atlas || model.status === 'running') return;
  model.status = 'running';
  model.error = '';
  try {
    const spec = specFromState(atlas.brain, brain, settings());
    model.sweep = await wholeBrainClient().sweep(spec, atlas.brain.fc.flat(), COUPLING_SWEEP);
    model.G = model.sweep.best.G;
    model.status = 'idle';
  } catch (err) {
    model.status = 'error';
    model.error = err instanceof Error ? err.message : String(err);
    return;
  }
  await runModel();
}

export function setCoupling(G: number): void {
  model.G = G;
}

export function setHomotopic(value: number): void {
  model.homotopicStrength = value;
}

function surfaceColors(): Float32Array | null {
  if (!atlas) return null;
  const { brain: data } = atlas;
  const n = data.nodes.length;
  const row = (m: ArrayLike<number>) => Array.from({ length: n }, (_, j) => (j === model.seed ? 0 : m[model.seed * n + j]));
  if (model.paint === 'regions') return null;
  if (model.paint === 'networks') return paintNetworks(data);
  if (model.paint === 'fc-real') return paintScalar(row(data.fc.flat()), 'diverging');
  if (model.paint === 'fc-model') return model.result ? paintScalar(row(model.result.fc), 'diverging') : null;
  const k = data.receptors.names.indexOf(model.paint.slice('receptor:'.length));
  return k >= 0 ? paintScalar(data.nodes.map(node => node.receptors[k]), 'sequential') : null;
}

function applyPaint(): void {
  renderer?.setSurfacePaint(surfaceOverride ?? surfaceColors());
}

/**
 * Lets a feature take over the cortex colours (for example tau during the disease timeline).
 * Passing null hands them back to the Data tab's paint mode.
 */
export function setSurfaceOverride(colors: Float32Array | null): void {
  surfaceOverride = colors;
  applyPaint();
}

export function setPaint(mode: PaintMode): void {
  model.paint = mode;
  applyPaint();
}

export function setSeed(node: number): void {
  model.seed = node;
  applyPaint();
}
