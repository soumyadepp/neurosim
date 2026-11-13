<script lang="ts">
  import { DIVERGING, normalise, sampleRamp } from '../../lib/render/paint';
  import { strings } from '../../lib/strings';

  interface Props {
    title: string;
    matrix: ArrayLike<number> | null;
    order: number[];
    names: string[];
    emptyText?: string;
  }

  let { title, matrix, order, names, emptyText }: Props = $props();

  let canvas = $state<HTMLCanvasElement>();
  let hover = $state<{ x: number; y: number; i: number; j: number; value: number } | null>(null);

  const n = $derived(order.length);

  $effect(() => {
    if (!canvas || !matrix) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    const off: number[] = [];
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b) off.push(matrix[order[a] * n + order[b]]);
    const scale = Math.max(...off.map(Math.abs)) || 1;
    const img = g.createImageData(n, n);
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        const v = a === b ? scale : matrix[order[a] * n + order[b]];
        const [r, gg, bb] = sampleRamp(DIVERGING, normalise([v, -scale, scale], 'diverging')[0]);
        const o = (a * n + b) * 4;
        img.data[o] = r * 255; img.data[o + 1] = gg * 255; img.data[o + 2] = bb * 255; img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });

  function onMove(e: PointerEvent): void {
    if (!matrix || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const a = Math.floor(((e.clientY - rect.top) / rect.height) * n);
    const b = Math.floor(((e.clientX - rect.left) / rect.width) * n);
    if (a < 0 || b < 0 || a >= n || b >= n) { hover = null; return; }
    hover = { x: e.clientX - rect.left, y: e.clientY - rect.top, i: order[a], j: order[b], value: matrix[order[a] * n + order[b]] };
  }
</script>

<figure>
  <figcaption>{title}</figcaption>
  <div class="frame">
    {#if matrix}
      <canvas
        bind:this={canvas}
        width={n}
        height={n}
        aria-label={title}
        onpointermove={onMove}
        onpointerleave={() => (hover = null)}
      ></canvas>
      {#if hover}
        <div class="tip" style:left="{hover.x}px" style:top="{hover.y}px" role="status">
          <strong class="mono">{hover.value.toFixed(2)}</strong>
          <span>{strings.data.cell(names[hover.i], names[hover.j])}</span>
        </div>
      {/if}
    {:else}
      <div class="empty">{emptyText}</div>
    {/if}
  </div>
</figure>

<style>
  figure { margin: 0; min-width: 0; }
  figcaption { font-size: var(--fs-sm); font-weight: 500; color: var(--text-2); margin-bottom: 6px; }
  .frame { position: relative; aspect-ratio: 1; border: 1px solid var(--line); border-radius: var(--r-sm); background: var(--panel2); }
  canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; border-radius: var(--r-sm); cursor: crosshair; }
  .empty { position: absolute; inset: 0; display: grid; place-items: center; padding: 12px; text-align: center; font-size: var(--fs-xs); color: var(--muted); }
  .tip {
    position: absolute; z-index: 2; transform: translate(-50%, calc(-100% - 10px)); pointer-events: none;
    display: flex; flex-direction: column; gap: 1px; width: max-content; max-width: 220px;
    padding: 6px 8px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-sm); box-shadow: var(--shadow-md);
    font-size: var(--fs-xs); color: var(--muted);
  }
  .tip strong { font-size: var(--fs-base); color: var(--text); font-weight: 500; }
</style>
