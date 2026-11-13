<script lang="ts">
  import { CHEMS, DRUGS } from '../../lib/sim/catalog';
  import { applyDrug, setChem, setNoise, ui } from '../../lib/engine.svelte';
  import { strings } from '../../lib/strings';
  import PresetGrid from '../ui/PresetGrid.svelte';
  import RangeSlider from '../ui/RangeSlider.svelte';
  import SectionHeader from '../ui/SectionHeader.svelte';
  import StickyStatus from '../ui/StickyStatus.svelte';

  const s = strings.chem;

  function onDrug(id: string): void {
    const drug = DRUGS.find(d => d.id === id);
    if (drug) applyDrug(drug);
  }
</script>

<SectionHeader eyebrow={s.eyebrow} title={s.heading} intro={s.intro} />
<StickyStatus>{ui.chemNote}</StickyStatus>

<div class="section">
  <p class="eyebrow">{s.drugsEyebrow}</p>
  <PresetGrid items={DRUGS} activeId={ui.drugId} onselect={onDrug} />
</div>

<div class="section">
  <p class="eyebrow">{s.levelsEyebrow}</p>
  {#each CHEMS as c (c.id)}
    <RangeSlider
      id="chem-{c.id}"
      label={c.name}
      hint={c.desc}
      value={ui.chem[c.id]}
      min={0}
      max={2}
      step={0.05}
      oninput={v => setChem(c.id, v)}
    />
  {/each}
</div>

<div class="section">
  <p class="eyebrow">{s.driveEyebrow}</p>
  <RangeSlider
    id="noise"
    label={s.noise}
    hint={s.noiseHint}
    value={ui.noise}
    min={0}
    max={0.1}
    step={0.005}
    digits={3}
    oninput={setNoise}
  />
</div>

<style>
</style>
