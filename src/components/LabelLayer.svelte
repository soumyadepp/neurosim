<script lang="ts">
  import { overlay, toggleRegion, ui } from '../lib/engine.svelte';
  import { layoutLabels } from '../lib/render/labels';
  import { REGIONS } from '../lib/sim/catalog';

  let placed = $derived(ui.labels && overlay.labels ? layoutLabels(overlay.labels) : []);

  const swatch = (r: number) => `rgb(${REGIONS[r].color.map(c => Math.round(c * 255)).join(',')})`;
</script>

{#if ui.labels}
  <div class="layer">
    <svg>
      {#each placed as l (l.region)}
        <g class:back={!l.front} class:deep={l.deep}>
          <line x1={l.x} y1={l.y} x2={l.lx} y2={l.ly} />
          <circle cx={l.x} cy={l.y} r="3" fill={swatch(l.region)} />
        </g>
      {/each}
    </svg>
    {#each placed as l (l.region)}
      <button
        type="button"
        class="label {l.side}"
        class:back={!l.front}
        class:sel={ui.selectedRegion === l.region}
        style:left="{l.lx}px"
        style:top="{l.ly}px"
        onclick={() => toggleRegion(l.region)}
      >
        <span class="sw" style:background={swatch(l.region)}></span>{REGIONS[l.region].name}
      </button>
    {/each}
  </div>
{/if}

<style>
  .layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  line { stroke: var(--muted); stroke-width: 1; }
  circle { stroke: var(--panel); stroke-width: 1.5; }
  g.deep line { stroke-dasharray: 3 3; }
  g.back { opacity: .25; }
  .label {
    position: absolute;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    padding: 2px 8px;
    font: inherit;
    font-size: 11.5px;
    font-weight: 500;
    color: var(--text);
    background: var(--overlay);
    border: 1px solid var(--line);
    border-radius: 6px;
    box-shadow: var(--shadow);
    cursor: pointer;
    pointer-events: auto;
    backdrop-filter: blur(4px);
  }
  .label.left { transform: translate(-100%, -50%); }
  .label:hover, .label.sel { border-color: var(--signal); color: var(--signal); }
  .label.back { opacity: .35; }
  .sw { width: 8px; height: 8px; border-radius: 2px; flex: none; }
</style>
