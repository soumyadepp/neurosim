<script lang="ts">
  import { DIVERGING, SEQUENTIAL, TAU_RAMP, rgbCss } from '../../lib/render/paint';

  type Props =
    | { kind: 'ramp'; ramp: 'sequential' | 'diverging' | 'tau'; low: string; high: string }
    | { kind: 'categories'; items: { label: string; color: string }[] };

  let props: Props = $props();

  const gradient = $derived(
    props.kind === 'ramp'
      ? `linear-gradient(90deg, ${({ diverging: DIVERGING, sequential: SEQUENTIAL, tau: TAU_RAMP }[props.ramp]).map(rgbCss).join(', ')})`
      : '',
  );
</script>

{#if props.kind === 'ramp'}
  <div class="ramp">
    <div class="bar" style:background={gradient}></div>
    <div class="ends"><span>{props.low}</span><span>{props.high}</span></div>
  </div>
{:else}
  <ul class="cats">
    {#each props.items as item (item.label)}
      <li><i style:background={item.color}></i>{item.label}</li>
    {/each}
  </ul>
{/if}

<style>
  .bar { height: 8px; border-radius: 4px; border: 1px solid var(--line); }
  .ends { display: flex; justify-content: space-between; margin-top: 4px; font-size: var(--fs-xs); color: var(--muted); }
  .cats { display: flex; flex-wrap: wrap; gap: 6px 12px; margin: 0; padding: 0; list-style: none; font-size: var(--fs-xs); color: var(--text-2); }
  .cats li { display: flex; align-items: center; gap: 6px; }
  .cats i { width: 10px; height: 10px; border-radius: 3px; }
</style>
