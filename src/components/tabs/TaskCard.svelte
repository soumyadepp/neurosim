<script lang="ts">
  import Play from '@lucide/svelte/icons/play';
  import { REGIONS, RI, type TaskDef } from '../../lib/sim/catalog';
  import type { TaskResult } from '../../lib/sim/network';
  import TaskOutcome from './TaskOutcome.svelte';
  import { strings } from '../../lib/strings';

  interface Props {
    def: TaskDef;
    active: boolean;
    disabled: boolean;
    result: TaskResult | null;
    onrun: () => void;
  }

  let { def, active, disabled, result, onrun }: Props = $props();
</script>

<article class="card" class:active>
  <div class="top">
    <h3>{def.name}</h3>
    <button class="btn sm" class:primary={!active} type="button" {disabled} onclick={onrun}>
      <Play size={12} />{strings.tasks.run}
    </button>
  </div>
  <ol class="path">
    {#each def.path as id (id)}
      <li>{REGIONS[RI[id]].name}</li>
    {/each}
  </ol>
  <p class="story">{def.story}</p>
  {#if result && !active}<TaskOutcome {result} compact />{/if}
</article>

<style>
  .card {
    border: 1px solid var(--line);
    border-radius: var(--r-lg);
    padding: 12px 14px;
    margin-bottom: 8px;
    background: var(--panel);
    transition: border-color .12s;
  }
  .card:hover { border-color: var(--line-strong); }
  .card.active { border-color: var(--signal-line); background: var(--signal-soft); box-shadow: inset 3px 0 0 var(--signal); }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  h3 { margin: 0; font-size: var(--fs-md); font-weight: 600; }
  .path { display: flex; flex-wrap: wrap; gap: 2px 0; margin: 6px 0 0; padding: 0; list-style: none; font-size: var(--fs-xs); color: var(--muted); }
  .path li:not(:last-child)::after { content: "›"; margin: 0 6px; color: var(--subtle); }
  .story { margin: 8px 0 0; font-size: var(--fs-sm); color: var(--text-2); line-height: 1.55; }
</style>
