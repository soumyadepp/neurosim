<script lang="ts">
  import type { RegionDef } from '../../lib/sim/catalog';

  interface Props {
    region: RegionDef;
    alive: number;
    total: number;
    activity: number;
    selected: boolean;
    onclick: () => void;
  }

  let { region, alive, total, activity, selected, onclick }: Props = $props();

  let swatch = $derived(`rgb(${region.color.map(c => Math.round(c * 255)).join(',')})`);
</script>

<button type="button" class="region" class:sel={selected} class:dead={alive < total * 0.5} aria-pressed={selected} {onclick}>
  <span class="sw" style:background={swatch}></span>
  <span class="text">
    <span class="nm">{region.name}</span>
    <span class="role">{region.role}</span>
  </span>
  <span class="cnt mono">{alive}<span>/{total}</span></span>
  <span class="act"><i style:width="{activity * 100}%"></i></span>
</button>

<style>
  .region {
    display: grid;
    grid-template-columns: 10px 1fr auto;
    gap: 4px 12px;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    background: var(--panel);
    border: 0;
    border-top: 1px solid var(--line);
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .region:first-child { border-top: 0; }
  .region:hover { background: var(--hover); }
  .region.sel { background: var(--signal-soft); box-shadow: inset 3px 0 0 var(--signal); }
  .sw { width: 10px; height: 10px; border-radius: 3px; }
  .text { min-width: 0; }
  .nm { display: block; font-weight: 500; }
  .role { display: block; color: var(--muted); font-size: var(--fs-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cnt { font-size: var(--fs-sm); color: var(--text); }
  .cnt span { color: var(--subtle); }
  .act { grid-column: 2 / 4; height: 3px; background: var(--hover); border-radius: 2px; overflow: hidden; }
  .act i { display: block; height: 100%; background: var(--signal); }
  .dead .nm, .dead .cnt { color: var(--harm); }
</style>
