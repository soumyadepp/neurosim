<script lang="ts">
  import { brain, ui } from '../../lib/engine.svelte';
  import { TRACE_LENGTH } from '../../lib/sim/network';
  import { strings } from '../../lib/strings';

  const W = 340, H = 110;
  const GRID_MV = [-70, -55, 0];

  let canvas: HTMLCanvasElement;

  const yOf = (mv: number) => H - ((mv + 90) / 130) * H;

  function draw(): void {
    const g = canvas.getContext('2d');
    if (!g) return;
    const css = getComputedStyle(canvas);
    const token = (name: string) => css.getPropertyValue(name).trim();
    g.clearRect(0, 0, W, H);
    g.strokeStyle = token('--line');
    g.lineWidth = 1;
    for (const mv of GRID_MV) {
      g.beginPath(); g.moveTo(0, yOf(mv)); g.lineTo(W, yOf(mv)); g.stroke();
    }
    g.fillStyle = token('--muted');
    g.font = `11px ${token('--font')}`;
    const labels = strings.neuron.traceLabels;
    g.fillText(labels.rest, 4, yOf(-70) - 3);
    g.fillText(labels.threshold, 4, yOf(-55) - 3);
    g.fillText(labels.zero, 4, yOf(0) - 3);
    g.strokeStyle = token('--signal');
    g.lineWidth = 1.5;
    g.beginPath();
    for (let k = 0; k < TRACE_LENGTH; k++) {
      const val = brain.trace[(brain.traceHead + k) % TRACE_LENGTH];
      const x = (k / (TRACE_LENGTH - 1)) * W;
      if (k) g.lineTo(x, yOf(val)); else g.moveTo(x, yOf(val));
    }
    g.stroke();
  }

  $effect(() => {
    void ui.hudFrame;
    draw();
  });
</script>

<canvas bind:this={canvas} width={W} height={H}></canvas>

<style>
  canvas {
    width: 100%;
    height: 110px;
    display: block;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
  }
</style>
