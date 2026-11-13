<script lang="ts">
  import type { Course } from '../../lib/disease/progression';
  import { HORIZON, START_AGE } from '../../lib/disease.svelte';
  import { COURSE_COLORS } from '../../lib/render/paint';
  import { strings } from '../../lib/strings';

  interface Props {
    untreated: Course;
    treated: Course | null;
    treatmentYear: number | null;
    year: number;
    symptom: string;
    disabled: boolean;
    onscrub: (year: number) => void;
  }

  let { untreated, treated, treatmentYear, year, symptom, disabled, onscrub }: Props = $props();

  const d = strings.disease;
  type SeriesKey = keyof typeof COURSE_COLORS;
  const SERIES = (['tau', 'network', 'decline'] as const).map(key => ({ key, color: COURSE_COLORS[key] }));

  let w = $state(640);
  let vh = $state(900);
  const compact = $derived(w < 420);
  const short = $derived(compact && vh < 820);
  const tiny = $derived(compact && vh < 700);
  const H = $derived(tiny ? 102 : short ? 126 : compact ? 152 : 168);
  const PAD = $derived(compact ? { l: 30, r: 12, t: tiny ? 28 : 34, b: tiny ? 20 : 24 } : { l: 36, r: 14, t: 24, b: 22 });
  const plotW = $derived(Math.max(10, w - PAD.l - PAD.r));
  const x = (t: number) => PAD.l + (t / HORIZON) * plotW;
  const y = (v: number) => H - PAD.b - Math.min(1, Math.max(0, v)) * (H - PAD.t - PAD.b);
  const yearAt = (px: number) => Math.min(HORIZON, Math.max(0, ((px - PAD.l) / plotW) * HORIZON));

  const primary = $derived(treated ?? untreated);
  const ageTicks = $derived(Array.from({ length: HORIZON / (compact ? 10 : 5) + 1 }, (_, i) => i * (compact ? 10 : 5)));

  function points(c: Course, k: SeriesKey): [number, number][] {
    if (k === 'network') return c.network.map((v, i) => [c.networkTimes[i], v]);
    return c.times.map((t, i) => [t, k === 'tau' ? c.tau[i] : c.decline[i]]);
  }

  function path(c: Course, k: SeriesKey): string {
    return points(c, k).map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join('');
  }

  function valueAt(c: Course, k: SeriesKey, t: number): number | null {
    const pts = points(c, k);
    if (!pts.length || t > pts[pts.length - 1][0]) return null;
    let i = 0;
    while (i < pts.length - 1 && pts[i + 1][0] < t) i++;
    if (i === pts.length - 1) return pts[i][1];
    const [t0, v0] = pts[i], [t1, v1] = pts[i + 1];
    return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0 || 1);
  }

  const labels = $derived<Record<SeriesKey, string>>({ tau: d.series.tau, network: d.series.network, decline: d.series.decline(symptom) });
  const m = $derived(primary.milestones);
  const crowded = $derived(m.symptoms !== null && m.care !== null && Math.abs(x(m.care) - x(m.symptoms)) < 92);
  const firstFound = $derived([m.biomarker, m.network].filter((v): v is number => v !== null).reduce((a, b) => Math.min(a, b), Infinity));
  const band = $derived(Number.isFinite(firstFound) && m.symptoms !== null && m.symptoms > firstFound ? { from: firstFound, to: m.symptoms } : null);

  let hover = $state<number | null>(null);
  let dragging = false;

  function local(e: PointerEvent): number {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * w;
  }

  function down(e: PointerEvent): void {
    if (disabled) return;
    dragging = true;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    onscrub(yearAt(local(e)));
  }

  function move(e: PointerEvent): void {
    const t = yearAt(local(e));
    if (dragging) onscrub(t);
    hover = t;
  }

  function up(): void {
    dragging = false;
  }

  function key(e: KeyboardEvent): void {
    const step = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5, PageUp: 5, PageDown: -5 }[e.key];
    if (step !== undefined) { e.preventDefault(); onscrub(year + step); }
    else if (e.key === 'Home') { e.preventDefault(); onscrub(0); }
    else if (e.key === 'End') { e.preventDefault(); onscrub(HORIZON); }
  }

  const tipYear = $derived(hover ?? year);
  const showTip = $derived(hover !== null);
  const age = (t: number) => String(Math.floor(START_AGE + t + 1e-9));
</script>

<svelte:window bind:innerHeight={vh} />

<div class="chart" bind:clientWidth={w}>
  <svg
    viewBox="0 0 {w} {H}"
    height={H}
    role="slider"
    tabindex={disabled ? -1 : 0}
    aria-label={d.scrubLabel}
    aria-valuemin={START_AGE}
    aria-valuemax={START_AGE + HORIZON}
    aria-valuenow={Math.floor(START_AGE + year)}
    aria-valuetext={d.age(Math.floor(START_AGE + year))}
    aria-disabled={disabled}
    class:disabled
    class:compact
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
    onpointerleave={() => (hover = null)}
    onkeydown={key}
  >
    {#if band}
      <rect class="band" x={x(band.from)} y={PAD.t} width={x(band.to) - x(band.from)} height={H - PAD.t - PAD.b} />
      {#if x(band.to) - x(band.from) > 120}
        <text class="band-label" x={x(band.from) + 6} y={PAD.t + 12}>{d.silentWindow(String(Math.round(band.to - band.from)))}</text>
      {/if}
    {/if}

    {#each [0, 0.5, 1] as v (v)}
      <line class="grid" x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} />
      <text class="tick" x={PAD.l - 6} y={y(v) + 3} text-anchor="end">{d.percent(v)}</text>
    {/each}
    {#each ageTicks as t (t)}
      <text class="tick" x={x(t)} y={H - 6} text-anchor="middle">{age(t)}</text>
    {/each}

    {#each [['symptoms', m.symptoms], ['care', m.care]] as const as [k, t] (k)}
      {#if t !== null}
        {@const flip = x(t) > w - 78}
        {@const lifted = k === 'care' && crowded}
        <line class="mark" x1={x(t)} x2={x(t)} y1={PAD.t - 8} y2={H - PAD.b} />
        <text
          class="mark-label"
          x={flip ? x(t) - 4 : x(t) + 4}
          y={lifted ? PAD.t - 25 : PAD.t - 12}
          text-anchor={flip ? 'end' : 'start'}
        >{d.marks[k]}</text>
      {/if}
    {/each}

    {#if treated && treatmentYear !== null}
      <line class="rx" x1={x(treatmentYear)} x2={x(treatmentYear)} y1={PAD.t} y2={H - PAD.b} />
      <text class="rx-label" x={x(treatmentYear) + 4} y={PAD.t + 26}>{d.marks.treatment}</text>
    {/if}

    {#if treated}
      {#each SERIES as s (s.key)}
        <path class="line ghost" d={path(untreated, s.key)} stroke={s.color} />
      {/each}
    {/if}
    {#each SERIES as s (s.key)}
      <path class="line" d={path(primary, s.key)} stroke={s.color} />
    {/each}

    {#if m.biomarker !== null}
      <circle class="found" cx={x(m.biomarker)} cy={y(valueAt(primary, 'tau', m.biomarker) ?? 0)} r="4.5" stroke={SERIES[0].color}><title>{d.found.biomarker}</title></circle>
    {/if}
    {#if m.network !== null}
      <circle class="found" cx={x(m.network)} cy={y(valueAt(primary, 'network', m.network) ?? 0)} r="4.5" stroke={SERIES[1].color}><title>{d.found.network}</title></circle>
    {/if}

    <line class="playhead" x1={x(year)} x2={x(year)} y1={PAD.t - 4} y2={H - PAD.b} />
    <circle class="handle" cx={x(year)} cy={PAD.t - 4} r="5" />
    {#each SERIES as s (s.key)}
      {@const v = valueAt(primary, s.key, year)}
      {#if v !== null}<circle class="dot" cx={x(year)} cy={y(v)} r="3.5" fill={s.color} />{/if}
    {/each}

    {#if showTip && hover !== null}
      <line class="cross" x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} />
    {/if}
  </svg>

  {#if showTip}
    <div class="tip" class:flip={x(tipYear) > w * 0.7} style:left="{x(tipYear)}px" role="status">
      <strong>{d.tooltipAge(age(tipYear))}</strong>
      {#each SERIES as s (s.key)}
        {@const v = valueAt(primary, s.key, tipYear)}
        <span><i style:background={s.color}></i>{labels[s.key]}<b class="mono">{v === null ? '…' : d.percent(v)}</b></span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .chart { position: relative; width: 100%; }
  svg { display: block; width: 100%; overflow: visible; cursor: ew-resize; touch-action: none; user-select: none; }
  svg:focus-visible { outline: 2px solid var(--focus); outline-offset: 4px; border-radius: 4px; }
  svg.disabled { cursor: not-allowed; opacity: .7; }
  .grid { stroke: var(--line); stroke-width: 1; }
  .tick { font-size: 10px; fill: var(--subtle); font-family: var(--mono); }
  .compact .tick { font-size: 11.5px; }
  .compact .mark-label, .compact .band-label { font-size: 11.5px; }
  .compact .handle { r: 7; }
  .compact .dot { r: 4.5; }
  .band { fill: var(--text); fill-opacity: .05; }
  .band-label { font-size: 10.5px; font-weight: 600; fill: var(--text-2); }
  .mark { stroke: var(--text-2); stroke-width: 1; stroke-dasharray: 2 3; }
  .mark-label { font-size: 10.5px; font-weight: 600; fill: var(--text-2); }
  .rx { stroke: var(--good); stroke-width: 1.5; }
  .rx-label { font-size: 10px; font-weight: 600; fill: var(--good); }
  .band-label, .mark-label, .rx-label { paint-order: stroke; stroke: var(--panel); stroke-width: 3px; stroke-linejoin: round; }
  .line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .ghost { stroke-width: 1.5; stroke-dasharray: 4 4; opacity: .45; }
  .found { fill: var(--panel); stroke-width: 2; }
  .playhead { stroke: var(--text); stroke-width: 1.5; }
  .handle { fill: var(--text); stroke: var(--panel); stroke-width: 2; }
  .dot { stroke: var(--panel); stroke-width: 2; }
  .cross { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 1 2; }
  .tip {
    position: absolute; top: 0; transform: translate(10px, 8px); pointer-events: none; z-index: 2;
    display: grid; gap: 2px; width: max-content; padding: 7px 9px;
    background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-sm); box-shadow: var(--shadow-md);
    font-size: var(--fs-xs); color: var(--muted);
  }
  .tip.flip { transform: translate(calc(-100% - 10px), 8px); }
  .tip strong { font-size: var(--fs-sm); color: var(--text); font-weight: 600; margin-bottom: 2px; }
  .tip span { display: grid; grid-template-columns: 8px 1fr auto; align-items: center; gap: 6px; }
  .tip i { width: 8px; height: 8px; border-radius: 50%; }
  .tip b { font-weight: 500; color: var(--text); margin-left: 10px; }
</style>
