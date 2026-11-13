<script lang="ts">
  import { brain, ui } from '../lib/engine.svelte';
  import { REGIONS, RI } from '../lib/sim/catalog';
  import { strings } from '../lib/strings';

  interface Props {
    placement?: 'top' | 'bottom';
  }

  let { placement = 'bottom' }: Props = $props();

  const h = strings.hud;

  let task = $derived(brain.task);
</script>

{#if task}
  <div class="progress" class:top-placed={placement === 'top'} role="status" aria-live="polite">
    <div class="top">
      <div>
        <p class="eyebrow">{h.taskEyebrow}</p>
        <div class="name">{task.def.name}</div>
      </div>
      <span class="mono count">{h.taskSpikes(ui.hud.time >= 0 ? task.count : 0)}</span>
    </div>
    <div class="status">{h.taskStatus(REGIONS[RI[task.def.input]].name, REGIONS[task.outReg].name)}</div>
    <div class="bar"><i style:width="{ui.hud.taskProgress * 100}%"></i></div>
  </div>
{/if}

<style>
  .progress {
    position: absolute;
    left: 50%;
    bottom: 16px;
    transform: translateX(-50%);
    width: min(440px, calc(100% - 32px));
    padding: 12px 14px;
    background: var(--overlay);
    border: 1px solid var(--line);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(8px);
  }
  .progress.top-placed { bottom: auto; top: 16px; }
  .top { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
  .eyebrow { margin-bottom: 2px; }
  .name { font-size: var(--fs-md); font-weight: 600; }
  .count { font-size: var(--fs-sm); color: var(--signal); }
  .status { font-size: var(--fs-sm); color: var(--muted); margin-top: 2px; }
  .bar { height: 4px; background: var(--line); border-radius: 2px; margin-top: 10px; overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--signal); transition: width .1s linear; }
</style>
