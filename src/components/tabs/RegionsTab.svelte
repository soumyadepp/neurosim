<script lang="ts">
  import { REGIONS } from '../../lib/sim/catalog';
  import { brain, toggleRegion, ui } from '../../lib/engine.svelte';
  import { strings } from '../../lib/strings';
  import SectionHeader from '../ui/SectionHeader.svelte';
  import RegionRow from './RegionRow.svelte';
</script>

<SectionHeader eyebrow={strings.regions.eyebrow} title={strings.regions.heading} intro={strings.regions.intro} />
<div class="list">
  {#each REGIONS as region, i (region.id)}
    <RegionRow
      {region}
      alive={ui.hud.regionAlive[i]}
      total={brain.regionMembers[i].length}
      activity={ui.hud.regionActivity[i]}
      selected={ui.selectedRegion === i}
      onclick={() => toggleRegion(i)}
    />
  {/each}
</div>

<style>
  .list { border: 1px solid var(--line); border-radius: var(--r-lg); overflow: hidden; }
</style>
