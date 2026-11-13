<script lang="ts">
  import { COURSE_COLORS } from '../../lib/render/paint';
  import { SIM_FACTS } from '../../lib/landing/facts';
  import { strings } from '../../lib/strings';

  interface Props {
    visible: boolean;
  }

  let { visible }: Props = $props();

  const s = strings.landing.silent;
  const W = 800, H = 270, PAD = { l: 18, r: 18, t: 44, b: 34 };
  const A0 = 50, A1 = 85;
  const x = (age: number) => PAD.l + ((age - A0) / (A1 - A0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - v * (H - PAD.t - PAD.b);

  /**
   * Logistic curves placed so each crosses its detection threshold at the simulation's milestone age.
   */
  const CURVES = [
    { key: 'tau', color: COURSE_COLORS.tau, center: 67, spread: 3.2 },
    { key: 'network', color: COURSE_COLORS.network, center: 70, spread: 3 },
    { key: 'memory', color: COURSE_COLORS.decline, center: 72.5, spread: 2.6 },
  ] as const;

  const path = (c: (typeof CURVES)[number]) =>
    Array.from({ length: 71 }, (_, i) => A0 + i * 0.5)
      .map((a, i) => `${i ? 'L' : 'M'}${x(a).toFixed(1)},${y(1 / (1 + Math.exp(-(a - c.center) / c.spread))).toFixed(1)}`)
      .join('');

  const a = SIM_FACTS.ages;
  const MARKS = [
    { age: A0, label: s.marks.start, strong: false, row: 0, anchor: 'start', nudge: 0 },
    { age: a.biomarker, label: s.marks.biomarker, strong: false, row: 1, anchor: 'end', nudge: -5 },
    { age: a.network, label: s.marks.network, strong: false, row: 0, anchor: 'start', nudge: 5 },
    { age: a.symptoms, label: s.marks.symptoms, strong: true, row: 1, anchor: 'middle', nudge: 0 },
    { age: a.care, label: s.marks.care, strong: true, row: 0, anchor: 'middle', nudge: 0 },
  ] as const;
  const ticks = [50, 55, 60, 65, 70, 75, 80, 85];
</script>

<figure>
  <svg viewBox="0 0 {W} {H}" role="img" aria-label={s.art} class:visible>
    <rect class="band" x={x(a.biomarker)} y={PAD.t} width={x(a.symptoms) - x(a.biomarker)} height={H - PAD.t - PAD.b} />
    <text class="band-label" x={(x(a.biomarker) + x(a.symptoms)) / 2} y={PAD.t + 18} text-anchor="middle">{s.window(SIM_FACTS.silentWindow)}</text>
    <line class="base" x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} />
    {#each ticks as t (t)}<text class="tick" x={x(t)} y={H - 10} text-anchor="middle">{s.age(t)}</text>{/each}
    {#each MARKS as m (m.age)}
      <line class="mark" class:strong={m.strong} x1={x(m.age)} x2={x(m.age)} y1={PAD.t - 6} y2={y(0)} />
      <text class="mark-label" class:strong={m.strong} x={x(m.age) + m.nudge} y={m.row ? PAD.t - 24 : PAD.t - 9}
        text-anchor={m.anchor}>{m.label}</text>
    {/each}
    {#each CURVES as c, i (c.key)}
      <path class="curve" d={path(c)} stroke={c.color} style:--delay="{i * 160}ms" pathLength="1" />
    {/each}
  </svg>
  <ul class="legend">
    {#each CURVES as c (c.key)}<li><i style:background={c.color}></i>{s.series[c.key]}</li>{/each}
  </ul>
  <figcaption>{s.caption}</figcaption>
</figure>

<style>
  figure { margin: 0; }
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  .band { fill: var(--text); fill-opacity: .05; }
  .band-label { font-size: 13px; font-weight: 600; fill: var(--text-2); }
  .base { stroke: var(--line-strong); }
  .tick { font-family: var(--mono); font-size: 11px; fill: var(--subtle); }
  .mark { stroke: var(--line-strong); stroke-dasharray: 2 4; }
  .mark.strong { stroke: var(--text-2); }
  .mark-label { font-size: 12px; font-weight: 500; fill: var(--muted); paint-order: stroke; stroke: var(--panel); stroke-width: 4px; stroke-linejoin: round; }
  .mark-label.strong { font-weight: 600; fill: var(--text); }
  .curve { fill: none; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; }
  .visible .curve { animation: draw 1.4s ease-out forwards; animation-delay: var(--delay); }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  @media (prefers-reduced-motion: reduce) { .curve { stroke-dashoffset: 0; animation: none !important; } }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 12px 0 0; padding: 0; list-style: none; font-size: var(--fs-sm); color: var(--text-2); }
  .legend li { display: flex; align-items: center; gap: 8px; }
  .legend i { width: 16px; height: 3px; border-radius: 2px; }
  figcaption { margin-top: 6px; font-size: var(--fs-xs); color: var(--muted); }
</style>
