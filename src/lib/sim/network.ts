import {
  BASELINE_CHEMISTRY, CHEMS, DEGEN_ORDER, DRUGS, PATHWAYS, PROJ_MUL, REGIONS, RI, TASKS,
  type Chemistry, type DamagePreset, type DrugDef, type TaskDef,
} from './catalog';
import { ProceduralLayout, type NeuronLayout } from './layout';
import { regionModulation, type ReceptorProfiles, type RegionModulation } from './modulation';

export const REGION_COUNT = REGIONS.length;
export const MAX_PULSES = 2500;
export const TRACE_LENGTH = 300;
const QUEUE_MASK = 63;
const TASK_STIM_MS = 400;
const TASK_LISTEN_MS = 500;
const SETTLE_TICKS = 300;
const CALIBRATION_REPS = 3;
const DEGEN_EVERY_TICKS = 25;

export interface Pulse {
  a: number;
  b: number;
  t0: number;
  t1: number;
  inh: number;
}

export interface TaskResult {
  def: TaskDef;
  count: number;
  ratio: number;
  healthy: number;
  base: number;
}

export interface NetworkState {
  hz: number;
  label: 'quiet' | 'normal' | 'hyperactive' | 'seizure-like';
}

interface Stimulus {
  region: number;
  p: number;
  amp: number;
  end: number;
}

interface RunningTask {
  def: TaskDef;
  outReg: number;
  count: number;
  start: number;
  end: number;
}

/**
 * Leaky integrate-and-fire network of ~1,200 neurons across 14 regions.
 * All neuron and synapse data lives in flat typed arrays for speed.
 */
export class NeuroSim {
  n = 0;
  pos = new Float32Array(0);
  reg = new Uint8Array(0);
  inhib = new Uint8Array(0);
  alive = new Uint8Array(0);
  v = new Float32Array(0);
  refr = new Uint8Array(0);
  glow = new Float32Array(0);
  res = new Float32Array(0);
  adapt = new Float32Array(0);
  spikeT = new Int32Array(0);
  hemi = new Int8Array(0);
  node = new Int16Array(0);
  rank = new Float32Array(0);
  lesioned = new Uint8Array(0);
  atrophied = new Uint8Array(0);

  s = 0;
  pre = new Int32Array(0);
  post = new Int32Array(0);
  w = new Float32Array(0);
  dist = new Float32Array(0);
  isProj = new Uint8Array(0);
  edgeGlow = new Float32Array(0);
  outStart = new Int32Array(0);
  outIdx = new Int32Array(0);
  inCount = new Int32Array(0);

  readonly regionMembers: number[][] = REGIONS.map(() => []);

  tick = 0;
  rateEma = 0;
  readonly regAct = new Float32Array(REGION_COUNT);
  readonly tickSpikes = new Float32Array(REGION_COUNT);
  readonly fbInh = new Float32Array(REGION_COUNT);
  private readonly queue: number[][] = Array.from({ length: QUEUE_MASK + 1 }, () => []);
  private stim: Stimulus | null = null;
  private oneShot: number[] = [];

  visual = true;
  pulses: Pulse[] = [];
  task: RunningTask | null = null;
  selected = -1;
  readonly trace = new Float32Array(TRACE_LENGTH).fill(-70);
  traceHead = 0;
  degenerate = false;

  noise = 0.03;
  readonly chem: Chemistry = { ...BASELINE_CHEMISTRY };
  readonly drug = { id: 'none', noiseMul: 1, cond: 1, thr: 0 };
  readonly calibration: Record<string, { base: number; healthy: number }> = {};
  receptorProfiles: ReceptorProfiles | null = null;

  onTaskDone: ((result: TaskResult) => void) | null = null;

  /**
   * Places neurons using the given layout, then wires local and long-range synapses.
   */
  build(layout: NeuronLayout = new ProceduralLayout()): void {
    const { positions: pts, regions: regs, hemis, nodes } = layout.place();
    const N = this.n = pts.length;
    this.pos = new Float32Array(N * 3); this.reg = new Uint8Array(N); this.inhib = new Uint8Array(N); this.alive = new Uint8Array(N).fill(1);
    this.v = new Float32Array(N).fill(-70); this.refr = new Uint8Array(N); this.glow = new Float32Array(N); this.res = new Float32Array(N).fill(1);
    this.spikeT = new Int32Array(N).fill(-1000); this.hemi = new Int8Array(N); this.adapt = new Float32Array(N); this.node = Int16Array.from(nodes);
    this.rank = Float32Array.from({ length: N }, () => Math.random()); this.lesioned = new Uint8Array(N); this.atrophied = new Uint8Array(N);
    const P = this.pos;
    for (let i = 0; i < N; i++) {
      P.set(pts[i], i * 3);
      this.reg[i] = regs[i]; this.hemi[i] = hemis[i]; this.regionMembers[regs[i]].push(i);
    }
    for (const m of this.regionMembers) {
      for (let k = 0; k < m.length; k++) if (k % 5 === 4) this.inhib[m[k]] = 1;
    }

    const sp: number[] = [], spo: number[] = [], sw: number[] = [], sd: number[] = [], sproj: number[] = [];
    const d3 = (a: number, b: number) => Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);
    for (const m of this.regionMembers) {
      for (const i of m) {
        const k = this.inhib[i] ? 12 : 5;
        const near = m.filter(j => j !== i).map(j => [d3(i, j), j] as const).sort((a, b) => a[0] - b[0]).slice(0, k);
        for (const [dd, j] of near) {
          sp.push(i); spo.push(j); sw.push(this.inhib[i] ? 12 + Math.random() * 4 : 3 + Math.random() * 3); sd.push(dd); sproj.push(0);
        }
      }
    }
    for (const [a, b, cnt] of PATHWAYS) {
      const src = this.regionMembers[RI[a]].filter(i => !this.inhib[i]), dst = this.regionMembers[RI[b]];
      for (let c = 0; c < Math.round(cnt * PROJ_MUL); c++) {
        const i = src[(Math.random() * src.length) | 0], j = dst[(Math.random() * dst.length) | 0];
        sp.push(i); spo.push(j); sw.push(6.5 + Math.random() * 2.5); sd.push(d3(i, j)); sproj.push(1);
      }
    }

    const S = this.s = sp.length;
    this.pre = Int32Array.from(sp); this.post = Int32Array.from(spo); this.w = Float32Array.from(sw); this.dist = Float32Array.from(sd);
    this.isProj = Uint8Array.from(sproj); this.edgeGlow = new Float32Array(S);
    this.outStart = new Int32Array(N + 1); this.outIdx = new Int32Array(S); this.inCount = new Int32Array(N);
    for (let s = 0; s < S; s++) { this.outStart[this.pre[s] + 1]++; this.inCount[this.post[s]]++; }
    for (let i = 0; i < N; i++) this.outStart[i + 1] += this.outStart[i];
    const fill = this.outStart.slice(0, N);
    for (let s = 0; s < S; s++) this.outIdx[fill[this.pre[s]]++] = s;
  }

  /**
   * Per-region synaptic gains, thresholds and drive under the current chemistry, drug and receptor maps.
   */
  modulation(): RegionModulation {
    return regionModulation(this.chem, this.drug, this.noise, this.receptorProfiles);
  }

  /**
   * Current firing threshold of neuron i in mV, including adaptation and feedback inhibition.
   */
  thresholdOf(i: number, M: RegionModulation = this.modulation()): number {
    const r = this.reg[i];
    return -55 + M.thr[r] + this.adapt[i] + this.fbInh[r];
  }

  /**
   * Advances the whole network by one millisecond.
   */
  step(): void {
    const t = ++this.tick;
    const M = this.modulation();
    const cond = this.drug.cond;
    const { alive, refr, v, res, adapt, reg, inhib, outStart, outIdx, post, w, dist, edgeGlow, glow, spikeT } = this;
    const N = this.n;
    const regSp = this.tickSpikes; regSp.fill(0);
    let spikes = 0;
    for (let i = 0; i < N; i++) {
      if (!alive[i]) continue;
      if (refr[i] > 0) { refr[i]--; continue; }
      v[i] += (-70 - v[i]) * 0.05;
      if (Math.random() < M.noise[reg[i]]) v[i] += 2 + Math.random() * 5;
      if (res[i] < 1) res[i] = Math.min(1, res[i] + 0.01);
      if (adapt[i] > 0.01) adapt[i] *= 0.985;
    }
    if (this.stim && t < this.stim.end) {
      const s = this.stim;
      for (const i of this.regionMembers[s.region]) if (alive[i] && refr[i] === 0 && Math.random() < s.p) v[i] += s.amp;
    }
    if (this.oneShot.length) {
      for (const i of this.oneShot) if (alive[i]) v[i] += 25;
      this.oneShot.length = 0;
    }
    const slot = this.queue[t & QUEUE_MASK];
    for (let j = 0; j < slot.length; j += 2) {
      const p = slot[j];
      if (alive[p] && refr[p] === 0) v[p] += slot[j + 1];
    }
    slot.length = 0;
    const fb = this.fbInh;
    for (let r = 0; r < REGION_COUNT; r++) fb[r] = M.inh[r] * 20 * this.regAct[r] / this.regionMembers[r].length;
    for (let i = 0; i < N; i++) {
      if (!alive[i] || refr[i] > 0) continue;
      const r = reg[i];
      if (v[i] < this.thresholdOf(i, M)) continue;
      v[i] = -75; refr[i] = 3; glow[i] = 1; spikeT[i] = t; spikes++; regSp[r]++;
      const sign = inhib[i] ? -1 : 1, release = res[i], gains = inhib[i] ? M.inh : M.exc;
      res[i] = Math.max(0, res[i] - 0.3); adapt[i] += 3;
      for (let k = outStart[i]; k < outStart[i + 1]; k++) {
        const s = outIdx[k], p = post[s];
        if (!alive[p]) continue;
        const d = Math.min(62, 1 + Math.round(dist[s] * 5 / cond));
        this.queue[(t + d) & QUEUE_MASK].push(p, sign * w[s] * release * gains[reg[p]]);
        edgeGlow[s] = 1;
        if (this.visual && this.pulses.length < MAX_PULSES && (this.isProj[s] || Math.random() < 0.3)) {
          this.pulses.push({ a: i, b: p, t0: t, t1: t + d, inh: inhib[i] });
        }
      }
    }
    if (this.task) {
      if (t <= this.task.end) this.task.count += regSp[this.task.outReg];
      else this.finishTask();
    }
    this.rateEma = this.rateEma * 0.99 + spikes * 0.01;
    for (let r = 0; r < REGION_COUNT; r++) this.regAct[r] = this.regAct[r] * 0.96 + regSp[r];
    for (let i = 0; i < N; i++) if (glow[i] > 0.001) glow[i] *= 0.9;
    if (this.selected >= 0) {
      const i = this.selected;
      this.trace[this.traceHead] = spikeT[i] === t ? 30 : v[i];
      this.traceHead = (this.traceHead + 1) % TRACE_LENGTH;
    }
    if (this.degenerate && t % DEGEN_EVERY_TICKS === 0) this.killNext();
  }

  aliveCount(r?: number): number {
    let c = 0;
    if (r === undefined) { for (let i = 0; i < this.n; i++) c += this.alive[i]; return c; }
    for (const i of this.regionMembers[r]) c += this.alive[i];
    return c;
  }

  resetActivity(): void {
    this.v.fill(-70); this.refr.fill(0); this.glow.fill(0); this.res.fill(1); this.adapt.fill(0); this.spikeT.fill(-1000); this.edgeGlow.fill(0);
    this.queue.forEach(q => { q.length = 0; });
    this.pulses.length = 0; this.stim = null; this.task = null; this.regAct.fill(0); this.rateEma = 0; this.trace.fill(-70);
  }

  startTask(def: TaskDef): void {
    const t = this.tick;
    this.stim = { region: RI[def.input], p: 0.2, amp: 12, end: t + TASK_STIM_MS };
    this.task = { def, outReg: RI[def.output], count: 0, start: t, end: t + TASK_LISTEN_MS };
  }

  private finishTask(): void {
    const tk = this.task!;
    this.task = null; this.stim = null;
    const cal = this.calibration[tk.def.id];
    const base = cal?.base ?? 0, healthy = cal?.healthy ?? 0;
    const ratio = cal ? Math.max(0, tk.count - base) / Math.max(1, healthy - base) : 1;
    this.onTaskDone?.({ def: tk.def, count: tk.count, ratio, healthy, base });
  }

  /**
   * Measures each task three times on the healthy, undrugged network to get a reference response.
   */
  calibrate(): void {
    const handler = this.onTaskDone;
    let count = 0;
    this.onTaskDone = r => { count = r.count; };
    this.visual = false;
    for (const def of TASKS) {
      const out = RI[def.output];
      let base = 0, healthy = 0;
      for (let rep = 0; rep < CALIBRATION_REPS; rep++) {
        this.settle();
        for (let i = 0; i < TASK_LISTEN_MS; i++) { this.step(); base += this.tickSpikes[out]; }
        this.settle();
        this.startTask(def);
        while (this.task) this.step();
        healthy += count;
      }
      base = Math.round(base / CALIBRATION_REPS);
      this.calibration[def.id] = { base, healthy: Math.max(base + 1, Math.round(healthy / CALIBRATION_REPS)) };
    }
    this.resetActivity();
    this.visual = true;
    this.onTaskDone = handler;
  }

  private settle(): void {
    this.resetActivity();
    for (let i = 0; i < SETTLE_TICKS; i++) this.step();
  }

  stimulate(i: number): void { this.oneShot.push(i); }

  killNeuron(i: number): void { this.lesioned[i] = 1; this.silence(i); }

  private silence(i: number): void { this.alive[i] = 0; this.v[i] = -70; this.glow[i] = 0; }

  /**
   * Sets slow, reversible tissue loss: each neuron dies once the fraction for it exceeds its fixed
   * rank, so the same fraction always kills the same neurons. Lowering the fraction revives only
   * neurons lost this way, never those killed by lesions, strokes or degeneration.
   */
  setAtrophy(fraction: ArrayLike<number>): void {
    for (let i = 0; i < this.n; i++) {
      const lost = this.rank[i] < fraction[i];
      if (lost && !this.atrophied[i]) { this.atrophied[i] = 1; this.silence(i); }
      else if (!lost && this.atrophied[i]) { this.atrophied[i] = 0; if (!this.lesioned[i]) this.alive[i] = 1; }
    }
  }

  /**
   * Revives every neuron, stops degeneration and restores baseline chemistry.
   */
  healAll(): void {
    this.alive.fill(1);
    this.lesioned.fill(0);
    this.atrophied.fill(0);
    this.degenerate = false;
    this.applyDrug(DRUGS[0]);
  }

  lesionAt(x: number, y: number, z: number, radius: number): number {
    const P = this.pos;
    let n = 0;
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) continue;
      if (Math.hypot(P[i * 3] - x, P[i * 3 + 1] - y, P[i * 3 + 2] - z) <= radius) { this.killNeuron(i); n++; }
    }
    return n;
  }

  applyDamagePreset(p: DamagePreset): void {
    for (const id of p.regions) for (const i of this.regionMembers[RI[id]]) if (this.alive[i] && Math.random() < p.frac) this.killNeuron(i);
    for (const id of p.leftOf ?? []) for (const i of this.regionMembers[RI[id]]) if (this.alive[i] && this.hemi[i] < 0) this.killNeuron(i);
    if (p.chem) { Object.assign(this.chem, p.chem); this.drug.id = 'custom'; }
  }

  private killNext(): void {
    for (const id of DEGEN_ORDER) {
      const members = this.regionMembers[RI[id]];
      const living = members.filter(i => this.alive[i]);
      if (living.length > Math.ceil(members.length * 0.08)) { this.killNeuron(living[(Math.random() * living.length) | 0]); return; }
    }
    this.degenerate = false;
  }

  applyDrug(d: DrugDef): void {
    this.drug.id = d.id; this.drug.noiseMul = d.noiseMul; this.drug.cond = d.cond; this.drug.thr = d.thr;
    for (const c of CHEMS) this.chem[c.id] = 1;
    Object.assign(this.chem, d.chem);
  }

  networkState(): NetworkState {
    const a = this.aliveCount();
    const hz = a ? this.rateEma * 1000 / a : 0;
    const label = hz < 0.4 ? 'quiet' : hz < 10 ? 'normal' : hz < 22 ? 'hyperactive' : 'seizure-like';
    return { hz, label };
  }
}
