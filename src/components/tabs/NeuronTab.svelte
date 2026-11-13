<script lang="ts">
  import Zap from '@lucide/svelte/icons/zap';
  import Activity from '@lucide/svelte/icons/activity';
  import Skull from '@lucide/svelte/icons/skull';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import { flashSelectedAxon, killSelected, stimulateSelected, ui } from '../../lib/engine.svelte';
  import { strings } from '../../lib/strings';
  import SectionHeader from '../ui/SectionHeader.svelte';
  import MembraneTrace from './MembraneTrace.svelte';

  const s = strings.neuron;

  let rows = $derived.by(() => {
    const n = ui.neuron;
    if (!n) return [];
    return [
      [s.fields.state, s.states[n.state], false],
      [s.fields.potential, s.mv(n.potential), true],
      [s.fields.threshold, s.mv(n.threshold), true],
      [s.fields.vesicles, `${n.vesicles}%`, true],
      [s.fields.incoming, String(n.incoming), true],
      [s.fields.outgoing, String(n.outgoing), true],
      [s.fields.lastSpike, n.msSinceSpike === null ? s.never : s.msAgo(n.msSinceSpike), true],
      [s.fields.targets, n.targets.map(([name, c]) => `${name} (${c})`).join(', '), false],
    ] as const;
  });
</script>

<SectionHeader eyebrow={s.eyebrow} title={s.heading} />
{#if ui.neuron}
  <div class="ident">
    <div>
      <h3>{s.title(ui.neuron.index, ui.neuron.inhibitory)}</h3>
      <div class="loc">{s.location(ui.neuron.region, ui.neuron.left)}</div>
    </div>
    <span class="kind" class:inh={ui.neuron.inhibitory}>{s.kind(ui.neuron.inhibitory)}</span>
  </div>
  <MembraneTrace />
  <dl class="kv">
    {#each rows as [k, val, mono] (k)}
      <dt>{k}</dt>
      <dd class:mono>{val}</dd>
    {/each}
  </dl>
  <div class="row">
    <button class="btn primary" type="button" onclick={stimulateSelected}><Zap size={14} />{s.stimulate}</button>
    <button class="btn" type="button" onclick={flashSelectedAxon}><Activity size={14} />{s.flash}</button>
    <button class="btn harm" type="button" onclick={killSelected}><Skull size={14} />{s.kill}</button>
  </div>
  <p class="note">{s.model}</p>
{:else}
  <div class="empty">
    <CircleDot size={28} strokeWidth={1.5} />
    <p>{s.empty}</p>
  </div>
{/if}

<style>
  .ident { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
  h3 { margin: 0; font-size: var(--fs-md); font-weight: 600; }
  .loc { font-size: var(--fs-sm); color: var(--muted); }
  .kind {
    flex: none; font-size: var(--fs-xs); font-weight: 500; padding: 2px 8px; border-radius: 999px;
    color: var(--excitatory); background: var(--warn-soft); border: 1px solid var(--warn-line);
  }
  .kind.inh { color: var(--inhibitory); background: #fdf4ff; border-color: #f5d0fe; }
  .kv {
    display: grid; grid-template-columns: auto 1fr; margin: 12px 0 14px;
    border: 1px solid var(--line); border-radius: var(--r-lg); overflow: hidden; font-size: var(--fs-sm);
  }
  dt, dd { padding: 7px 12px; border-top: 1px solid var(--line); }
  dt:first-of-type, dd:first-of-type { border-top: 0; }
  dt { color: var(--muted); background: var(--panel2); }
  dd { margin: 0; color: var(--text); text-align: right; }
  .empty {
    display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center;
    padding: 32px 16px; color: var(--subtle); border: 1px dashed var(--line-strong); border-radius: var(--r-lg);
  }
  .empty p { margin: 0; color: var(--muted); max-width: 32ch; }
  .note { margin-top: 4px; }
</style>
