<script lang="ts">
  import Pause from '@lucide/svelte/icons/pause';
  import Play from '@lucide/svelte/icons/play';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import Tag from '@lucide/svelte/icons/tag';
  import { resetActivity, setShell, toggleLabels, ui } from '../lib/engine.svelte';
  import { strings } from '../lib/strings';

  const v = strings.view;
  const vp = strings.viewport;

  let open = $state(false);
  let root = $state<HTMLDivElement>();

  function outside(e: PointerEvent): void {
    if (open && root && !root.contains(e.target as Node)) open = false;
  }

  function escape(e: KeyboardEvent): void {
    if (open && e.key === 'Escape') open = false;
  }
</script>

<svelte:window onpointerdown={outside} onkeydown={escape} />

<div class="view" bind:this={root}>
  <button class="btn trigger" class:on={open} type="button" aria-expanded={open} aria-haspopup="dialog" onclick={() => (open = !open)}>
    <SlidersHorizontal size={14} />{v.open}
  </button>
  {#if open}
    <div class="pop" role="dialog" aria-label={v.title}>
      <p class="eyebrow">{v.display}</p>
      <button class="btn row" class:on={ui.labels} type="button" aria-pressed={ui.labels} onclick={toggleLabels}>
        <Tag size={14} />{vp.labels}
      </button>
      <button class="btn row" type="button" onclick={() => (ui.paused = !ui.paused)}>
        {#if ui.paused}<Play size={14} />{vp.resume}{:else}<Pause size={14} />{vp.pause}{/if}
      </button>
      {#if ui.dev}
        <label class="range">
          <span>{vp.shell}</span>
          <input type="range" min="0" max="100" value={ui.shell} oninput={e => setShell(e.currentTarget.valueAsNumber)} />
          <output class="mono">{ui.shell}%</output>
        </label>
        <p class="eyebrow sim">{v.simulation}</p>
        <div class="pair">
          <button class="btn" type="button" title={strings.hud.resetTitle} onclick={resetActivity}>
            <RotateCcw size={14} />{strings.hud.reset}
          </button>
        </div>
        <label class="range">
          <span>{vp.speed}</span>
          <input type="range" min="1" max="8" bind:value={ui.speed} />
          <output class="mono">{ui.speed}×</output>
        </label>
      {/if}
    </div>
  {/if}
</div>

<style>
  .view { position: relative; }
  .trigger { box-shadow: var(--shadow-sm); background: var(--overlay); backdrop-filter: blur(8px); }
  .pop {
    position: absolute; right: 0; top: calc(100% + 6px); width: 248px; padding: 12px;
    display: grid; gap: 8px;
    background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-md);
  }
  .eyebrow { margin: 0; }
  .eyebrow.sim { margin-top: 6px; }
  .row { justify-content: flex-start; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .range { display: grid; grid-template-columns: 44px 1fr 38px; align-items: center; gap: 8px; font-size: var(--fs-sm); color: var(--muted); }
  .range input { width: 100%; accent-color: var(--signal); }
  .range output { text-align: right; font-size: var(--fs-sm); color: var(--text-2); }
</style>
