<script lang="ts" generics="T extends string">
  import { haptic } from '../../lib/haptics';

  interface Option {
    value: T;
    label: string;
    title?: string;
  }

  interface Props {
    label: string;
    options: Option[];
    value: T;
    onchange: (value: T) => void;
  }

  let { label, options, value, onchange }: Props = $props();
</script>

<div class="seg" role="radiogroup" aria-label={label} style:--count={options.length}>
  {#each options as o (o.value)}
    <button type="button" role="radio" aria-checked={o.value === value} class:on={o.value === value} title={o.title} onclick={() => { if (o.value !== value) haptic('select'); onchange(o.value); }}>
      {o.label}
    </button>
  {/each}
</div>

<style>
  .seg {
    display: grid; grid-template-columns: repeat(var(--count), 1fr); gap: 2px; padding: 2px;
    background: var(--hover); border: 1px solid var(--line); border-radius: var(--r-md);
  }
  button {
    min-width: 0; height: 28px; padding: 0 6px; border: 0; border-radius: var(--r-sm); background: none;
    font: inherit; font-size: var(--fs-sm); font-weight: 500; color: var(--muted); cursor: pointer;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  button:hover { color: var(--text); }
  button.on { background: var(--panel); color: var(--text); box-shadow: var(--shadow); }
  button:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
  @media (max-width: 640px) {
    button { height: 36px; padding: 0 4px; font-size: var(--fs-sm); }
  }
</style>
