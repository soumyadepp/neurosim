<script lang="ts">
  import Crosshair from '@lucide/svelte/icons/crosshair';
  import HeartPulse from '@lucide/svelte/icons/heart-pulse';
  import { DAMAGE_PRESETS, REGIONS } from '../../lib/sim/catalog';
  import { applyDamage, brain, healAll, toggleDegeneration, toggleLesionMode, ui } from '../../lib/engine.svelte';
  import { strings } from '../../lib/strings';
  import PresetGrid from '../ui/PresetGrid.svelte';
  import RangeSlider from '../ui/RangeSlider.svelte';
  import SectionHeader from '../ui/SectionHeader.svelte';
  import StickyStatus from '../ui/StickyStatus.svelte';

  const s = strings.damage;

  let stats = $derived.by(() => {
    const lost = brain.n - ui.hud.alive;
    if (!lost) return s.noDamage;
    const worst = REGIONS
      .map((r, i) => [r.name, 1 - ui.hud.regionAlive[i] / brain.regionMembers[i].length] as const)
      .filter(([, f]) => f > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, f]) => `${name} ${Math.round(f * 100)}%`)
      .join(', ');
    return s.stats(lost, brain.n, worst);
  });

  function onPreset(id: string): void {
    const preset = DAMAGE_PRESETS.find(p => p.id === id);
    if (preset) applyDamage(preset);
  }
</script>

<SectionHeader eyebrow={s.eyebrow} title={s.heading} intro={s.intro} />
<StickyStatus>{stats}</StickyStatus>

<div class="section">
  <p class="eyebrow">{s.lesionEyebrow}</p>
  <div class="row">
    <button class="btn harm" class:on={ui.lesionMode} type="button" aria-pressed={ui.lesionMode} onclick={toggleLesionMode}>
      <Crosshair size={14} />{s.lesionMode}
    </button>
    <span class="aside">{ui.lesionInfo}</span>
  </div>
  <RangeSlider
    id="lesion-radius"
    label={s.lesionRadius}
    value={ui.lesionRadius}
    min={0.06}
    max={0.45}
    step={0.01}
    oninput={v => (ui.lesionRadius = v)}
  />
</div>

<div class="section">
  <p class="eyebrow">{s.presetsHeading}</p>
  <PresetGrid items={DAMAGE_PRESETS} onselect={onPreset} />
</div>

<div class="section">
  <p class="eyebrow">{s.progressiveEyebrow}</p>
  <div class="row">
    <button class="btn" class:on={ui.degenerating} type="button" onclick={toggleDegeneration}>{ui.degenerating ? s.stopDegen : s.startDegen}</button>
  </div>
  <p class="aside">{s.degenNote}</p>
</div>

<div class="section">
  <div class="row">
    <button class="btn" type="button" onclick={healAll}><HeartPulse size={14} />{s.heal}</button>
    <span class="aside">{s.healNote}</span>
  </div>
</div>

<style>
  .aside { margin: 0; }
  .section:last-child { padding-bottom: 0; }
</style>
