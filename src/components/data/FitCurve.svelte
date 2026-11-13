<script lang="ts">
  import type { FitPoint } from '../../lib/wholebrain/experiment';
  import { strings } from '../../lib/strings';

  interface Props {
    points: FitPoint[];
    best: FitPoint;
    current: number;
  }

  let { points, best, current }: Props = $props();

  const W = 360, H = 160, PAD = { l: 34, r: 10, t: 12, b: 26 };
  const gMax = $derived(Math.max(...points.map(p => p.G)));
  const rMax = $derived(Math.max(0.1, Math.ceil(Math.max(...points.map(p => p.r)) * 10) / 10));
  const x = (g: number) => PAD.l + (g / (gMax || 1)) * (W - PAD.l - PAD.r);
  const y = (r: number) => H - PAD.b - (Math.max(0, r) / rMax) * (H - PAD.t - PAD.b);
  const path = $derived(points.map((p, i) => `${i ? 'L' : 'M'}${x(p.G).toFixed(1)},${y(p.r).toFixed(1)}`).join(''));
  const yTicks = $derived([0, rMax / 2, rMax]);
  const xTicks = $derived([0, gMax / 2, gMax]);

  let svg = $state<SVGSVGElement>();
  let hover = $state<FitPoint | null>(null);

  function onMove(e: PointerEvent): void {
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const gx = ((e.clientX - rect.left) / rect.width) * W;
    hover = points.reduce((a, b) => (Math.abs(x(b.G) - gx) < Math.abs(x(a.G) - gx) ? b : a));
  }
</script>

<figure>
  <figcaption>{strings.data.sweepTitle}</figcaption>
  <div class="frame">
    <svg bind:this={svg} viewBox="0 0 {W} {H}" role="img" aria-label={strings.data.sweepBest(best.G.toFixed(1), best.r.toFixed(2))}
      onpointermove={onMove} onpointerleave={() => (hover = null)}>
      {#each yTicks as t (t)}
        <line class="grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
        <text class="tick" x={PAD.l - 6} y={y(t) + 3} text-anchor="end">{t.toFixed(2)}</text>
      {/each}
      {#each xTicks as t (t)}
        <text class="tick" x={x(t)} y={H - 8} text-anchor="middle">{t.toFixed(1)}</text>
      {/each}
      <line class="current" x1={x(current)} x2={x(current)} y1={PAD.t} y2={H - PAD.b} />
      <path class="line" d={path} />
      <circle class="best" cx={x(best.G)} cy={y(best.r)} r="5" />
      {#if hover}
        <line class="cross" x1={x(hover.G)} x2={x(hover.G)} y1={PAD.t} y2={H - PAD.b} />
        <circle class="dot" cx={x(hover.G)} cy={y(hover.r)} r="4" />
      {/if}
      <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} fill="transparent" />
    </svg>
    {#if hover}
      <div class="tip" style:left="{(x(hover.G) / W) * 100}%" role="status">
        <strong class="mono">r {hover.r.toFixed(3)}</strong>
        <span class="mono">G {hover.G.toFixed(1)} · mean FC {hover.meanFc.toFixed(2)}</span>
      </div>
    {/if}
  </div>
  <p class="caption">{strings.data.sweepBest(best.G.toFixed(1), best.r.toFixed(2))}</p>
</figure>

<style>
  figure { margin: 0; }
  figcaption { font-size: var(--fs-sm); font-weight: 500; color: var(--text-2); margin-bottom: 6px; }
  .frame { position: relative; }
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  .grid { stroke: var(--line); stroke-width: 1; }
  .tick { font-size: 10px; fill: var(--subtle); font-family: var(--mono); }
  .line { fill: none; stroke: var(--signal); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .best { fill: var(--signal); stroke: var(--panel); stroke-width: 2; }
  .current { stroke: var(--line-strong); stroke-width: 1; stroke-dasharray: 3 3; }
  .cross { stroke: var(--muted); stroke-width: 1; }
  .dot { fill: var(--panel); stroke: var(--signal); stroke-width: 2; }
  .tip {
    position: absolute; top: 0; transform: translate(-50%, -100%); pointer-events: none;
    display: flex; flex-direction: column; gap: 1px; width: max-content;
    padding: 6px 8px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-sm); box-shadow: var(--shadow-md);
    font-size: var(--fs-xs); color: var(--muted);
  }
  .tip strong { font-size: var(--fs-base); color: var(--text); font-weight: 500; }
  .caption { margin: 6px 0 0; font-size: var(--fs-sm); color: var(--muted); }
</style>
