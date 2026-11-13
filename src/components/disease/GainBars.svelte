<script lang="ts">
  import { DETECTION_POINTS, START_AGE, type DetectionPoint, type Gain, type TreatmentStart } from '../../lib/disease.svelte';
  import type { Milestones } from '../../lib/disease/progression';
  import { strings } from '../../lib/strings';

  interface Props {
    gains: Partial<Record<DetectionPoint, Gain>>;
    starts: Milestones;
    active: TreatmentStart;
    onselect: (point: DetectionPoint) => void;
  }

  let { gains, starts, active, onselect }: Props = $props();

  const t = strings.disease.treat;
  const finite = $derived(DETECTION_POINTS.map(p => gains[p]).filter((g): g is number => typeof g === 'number'));
  const max = $derived(Math.max(1, ...finite));
  const width = (g: Gain) => (g === null ? 100 : typeof g === 'number' ? Math.max(2, (Math.max(0, g) / max) * 100) : 0);
</script>

<figure>
  <figcaption>{t.gainsTitle}</figcaption>
  <div class="bars">
    {#each DETECTION_POINTS as p (p)}
      {@const g = gains[p]}
      {@const start = starts[p]}
      <button type="button" class="row" class:on={active === p} aria-pressed={active === p} title={t.optionTitles[p]} onclick={() => onselect(p)}>
        <span class="label">
          {t.options[p]}
          {#if start !== null}<small>{t.startsAt(String(Math.floor(START_AGE + start)))}</small>{/if}
        </span>
        <span class="track">
          {#if g === undefined}
            <i class="pending"></i>
          {:else}
            <i style:width="{width(g)}%"></i>
          {/if}
        </span>
        <span class="value mono">{g === undefined ? t.pending : g === null ? t.beyond : t.gain(g)}</span>
      </button>
    {/each}
  </div>
  <p class="caption">{t.gainsCaption}</p>
</figure>

<style>
  figure { margin: 0; }
  figcaption { font-size: var(--fs-sm); font-weight: 500; color: var(--text-2); margin-bottom: 8px; }
  .bars { display: grid; gap: 4px; }
  .row {
    display: grid; grid-template-columns: 96px 1fr 84px; align-items: center; gap: 10px;
    padding: 6px 8px; margin: 0 -8px; border: 1px solid transparent; border-radius: var(--r-md);
    background: none; font: inherit; color: inherit; text-align: left; cursor: pointer;
  }
  .row:hover { background: var(--panel2); }
  .row.on { background: var(--signal-soft); border-color: var(--signal-line); }
  .label { display: grid; font-size: var(--fs-sm); font-weight: 500; color: var(--text); line-height: 1.3; }
  .label small { font-size: var(--fs-xs); font-weight: 400; color: var(--muted); }
  .track { height: 14px; background: var(--hover); border-radius: 4px; overflow: hidden; }
  .track i { display: block; height: 100%; background: color-mix(in srgb, var(--signal) 50%, var(--panel)); border-radius: 0 4px 4px 0; transition: width .25s ease; }
  .row.on .track i { background: var(--signal); }
  .track i.pending {
    width: 100%; border-radius: 0;
    background: linear-gradient(90deg, transparent, var(--line-strong), transparent);
    background-size: 50% 100%; background-repeat: no-repeat; animation: sweep 1.2s ease-in-out infinite;
  }
  @keyframes sweep { from { background-position: -50% 0; } to { background-position: 150% 0; } }
  @media (prefers-reduced-motion: reduce) { .track i.pending { animation: none; } }
  .value { font-size: var(--fs-sm); color: var(--text); text-align: right; }
  .caption { margin: 8px 0 0; font-size: var(--fs-sm); color: var(--muted); line-height: 1.45; }
</style>
