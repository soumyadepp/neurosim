<script lang="ts">
  interface Preset {
    id: string;
    name: string;
    note: string;
  }

  interface Props {
    items: Preset[];
    activeId?: string;
    onselect: (id: string) => void;
  }

  let { items, activeId, onselect }: Props = $props();
</script>

<div class="presets">
  {#each items as item (item.id)}
    <button
      class="preset"
      class:on={item.id === activeId}
      type="button"
      aria-pressed={activeId === undefined ? undefined : item.id === activeId}
      onclick={() => onselect(item.id)}
    >
      <span class="name">{item.name}</span>
      <span class="desc">{item.note}</span>
    </button>
  {/each}
</div>

<style>
  .presets { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .preset {
    display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; text-align: left;
    background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-md);
    font: inherit; color: inherit; cursor: pointer; transition: border-color .12s, background .12s;
  }
  .preset:hover { border-color: var(--line-strong); background: var(--panel2); }
  .preset.on { border-color: var(--signal); background: var(--signal-soft); box-shadow: 0 0 0 1px var(--signal); }
  .name { font-size: var(--fs-base); font-weight: 600; color: var(--text); }
  .desc { font-size: var(--fs-xs); line-height: 1.45; color: var(--muted); }
  .on .name { color: var(--signal); }
  @media (max-width: 860px) {
    .presets { grid-template-columns: 1fr; }
  }
</style>
