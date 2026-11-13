<script lang="ts">
  import { onMount } from 'svelte';
  import { BrainRenderer } from '../lib/render/scene';
  import { attachOrbitControls } from '../lib/render/controls';
  import { attachRenderer, brain, frameStep, getAtlas, handleViewportClick, ui } from '../lib/engine.svelte';
  import { strings } from '../lib/strings';
  import LabelLayer from './LabelLayer.svelte';
  import TaskProgress from './TaskProgress.svelte';
  import Legend from './Legend.svelte';
  import Segmented from './ui/Segmented.svelte';
  import ProgressionDock from './disease/ProgressionDock.svelte';
  import ViewControls from './ViewControls.svelte';
  import TourCard from './disease/TourCard.svelte';
  import TaskResultToast from './TaskResultToast.svelte';
  import { disease, setScenario } from '../lib/disease.svelte';
  import { SCENARIOS, type ScenarioId } from '../lib/disease/scenarios';
  import { TAU_RAMP, rgbCss } from '../lib/render/paint';

  let canvas: HTMLCanvasElement;

  const diseaseMode = $derived(ui.tab === 'disease' && disease.active);
  const d = strings.disease;
  const scenarioOptions = SCENARIOS.map(s => ({ value: s.id, label: d.scenarios[s.id].short, title: d.scenarios[s.id].name }));
  const tauGradient = `linear-gradient(90deg, ${TAU_RAMP.map(rgbCss).join(', ')})`;

  onMount(() => {
    const renderer = new BrainRenderer(canvas, brain, getAtlas());
    attachRenderer(renderer);
    const detach = attachOrbitControls(canvas, renderer.orbit, handleViewportClick);
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      frameStep();
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      detach();
      attachRenderer(null);
      renderer.dispose();
    };
  });
</script>

<div class="viewport">
  <div class="stage">
    <canvas bind:this={canvas} class:lesion={ui.lesionMode}></canvas>
    <LabelLayer />
    {#if ui.lesionMode}
      <div class="lesion-badge">{strings.viewport.lesionBadge}</div>
    {/if}
    {#if ui.runningTaskId}
      <TaskProgress placement={diseaseMode ? 'top' : 'bottom'} />
    {:else if ui.mode === 'lab'}
      <TaskResultToast />
    {/if}
    {#if diseaseMode}
      <TourCard />
      <div class="tau-chip" title={d.surfaceLegend.title}>
        <i style:background={tauGradient}></i>{d.surfaceLegend.title}
      </div>
    {:else}
      <Legend />
      <div class="hint">{strings.viewport.hint}</div>
    {/if}
    <div class="stage-top">
      {#if diseaseMode && !ui.dev && !ui.runningTaskId}
        <div class="condition">
          <Segmented label={d.conditionEyebrow} options={scenarioOptions} value={disease.scenario} onchange={id => setScenario(id as ScenarioId)} />
        </div>
      {/if}
      <div class="view-slot"><ViewControls /></div>
    </div>
  </div>
  {#if diseaseMode}
    <ProgressionDock />
  {/if}
</div>

<style>
  .viewport {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    background: var(--scene);
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }
  .stage { position: relative; min-height: 0; }
  .stage-top {
    position: absolute; top: 12px; left: 12px; right: 12px; z-index: 3;
    display: grid; grid-template-columns: 1fr auto 1fr; align-items: start; gap: 10px;
    pointer-events: none;
  }
  .stage-top > * { pointer-events: auto; }
  .condition {
    grid-column: 2; min-width: 0; max-width: 380px;
    background: var(--overlay); border-radius: var(--r-lg); box-shadow: var(--shadow-sm); backdrop-filter: blur(8px);
  }
  .view-slot { grid-column: 3; justify-self: end; }
  .tau-chip {
    position: absolute; left: 16px; bottom: 14px; display: flex; align-items: center; gap: 8px;
    padding: 6px 12px; background: var(--overlay); border: 1px solid var(--line); border-radius: 999px;
    font-size: var(--fs-xs); color: var(--muted); pointer-events: none;
  }
  .tau-chip i { width: 44px; height: 7px; border-radius: 4px; }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: grab;
  }
  canvas.lesion { cursor: crosshair; }
  .lesion-badge {
    position: absolute;
    left: 50%;
    top: 14px;
    transform: translateX(-50%);
    background: var(--harm);
    color: #fff;
    border-radius: 999px;
    padding: 5px 14px;
    font-size: var(--fs-sm);
    font-weight: 500;
    box-shadow: var(--shadow-md);
  }
  .hint {
    position: absolute;
    right: 16px;
    bottom: 14px;
    font-size: var(--fs-sm);
    color: var(--subtle);
    pointer-events: none;
  }
  @media (max-width: 860px) {
    .hint { display: none; }
  }
  @media (max-width: 640px) {
    .stage-top { top: 8px; left: 8px; right: 8px; grid-template-columns: minmax(0, 1fr) auto; }
    .condition { grid-column: 1; max-width: none; }
    .view-slot { grid-column: 2; }
    .tau-chip { display: none; }
  }
</style>
