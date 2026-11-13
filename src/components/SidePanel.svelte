<script lang="ts">
  import type { Component } from 'svelte';
  import ListChecks from '@lucide/svelte/icons/list-tree';
  import Layers from '@lucide/svelte/icons/layers';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import Crosshair from '@lucide/svelte/icons/crosshair';
  import Flask from '@lucide/svelte/icons/flask-conical';
  import Database from '@lucide/svelte/icons/database';
  import { setTab, ui, type LabTab } from '../lib/engine.svelte';
  import { strings } from '../lib/strings';
  import TasksTab from './tabs/TasksTab.svelte';
  import RegionsTab from './tabs/RegionsTab.svelte';
  import NeuronTab from './tabs/NeuronTab.svelte';
  import DamageTab from './tabs/DamageTab.svelte';
  import ChemistryTab from './tabs/ChemistryTab.svelte';
  import DataTab from './tabs/DataTab.svelte';
  import DiseaseTab from './tabs/DiseaseTab.svelte';

  const TABS: { id: LabTab; icon: Component<{ size?: number }> }[] = [
    { id: 'tasks', icon: ListChecks },
    { id: 'regions', icon: Layers },
    { id: 'neuron', icon: CircleDot },
    { id: 'damage', icon: Crosshair },
    { id: 'chem', icon: Flask },
    { id: 'data', icon: Database },
  ];
</script>

<aside class="panel">
  {#if ui.mode === 'lab'}
    <div class="tabs" role="tablist">
      {#each TABS as { id, icon: Icon } (id)}
        <button type="button" role="tab" aria-selected={ui.tab === id} class:on={ui.tab === id} onclick={() => setTab(id)}>
          <Icon size={15} />{strings.tabs[id]}
        </button>
      {/each}
    </div>
  {/if}

  <section class="tab" role={ui.mode === 'lab' ? 'tabpanel' : undefined}>
    {#if ui.mode === 'story'}
      <DiseaseTab />
    {:else if ui.tab === 'tasks'}
      <TasksTab />
    {:else if ui.tab === 'regions'}
      <RegionsTab />
    {:else if ui.tab === 'neuron'}
      <NeuronTab />
    {:else if ui.tab === 'damage'}
      <DamageTab />
    {:else if ui.tab === 'chem'}
      <ChemistryTab />
    {:else}
      <DataTab />
    {/if}
  </section>
</aside>

<style>
  .panel {
    background: var(--panel);
    border-left: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .tabs {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    padding: 0 8px;
    border-bottom: 1px solid var(--line);
    flex: none;
  }
  .tabs button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 0;
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    color: var(--muted);
    padding: 10px 2px 8px;
    font: inherit;
    font-size: var(--fs-sm);
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
  }
  .tabs button:hover { color: var(--text); }
  .tabs button.on { color: var(--signal); border-bottom-color: var(--signal); }
  .tab { padding: 20px; overflow-y: auto; flex: 1; min-height: 0; }
  @media (max-width: 860px) {
    .panel { border-left: 0; border-top: 1px solid var(--line); }
  }
</style>
