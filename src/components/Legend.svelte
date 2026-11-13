<script lang="ts">
  import { strings } from '../lib/strings';

  const ITEMS = [
    { label: strings.hud.legend.excitatory, color: 'var(--excitatory)' },
    { label: strings.hud.legend.inhibitory, color: 'var(--inhibitory)' },
    { label: strings.hud.legend.dead, color: 'var(--dead)' },
  ];
</script>

<ul class="legend">
  {#each ITEMS as item (item.label)}
    <li><i style:background={item.color}></i>{item.label}</li>
  {/each}
</ul>

<style>
  .legend {
    position: absolute;
    left: 16px;
    bottom: 14px;
    display: flex;
    gap: 14px;
    margin: 0;
    padding: 6px 12px;
    list-style: none;
    font-size: var(--fs-sm);
    color: var(--text-2);
    background: var(--overlay);
    border: 1px solid var(--line);
    border-radius: 999px;
    box-shadow: var(--shadow-sm);
    pointer-events: none;
  }
  li { display: flex; align-items: center; gap: 6px; }
  i { width: 8px; height: 8px; border-radius: 50%; }
</style>
