<script lang="ts">
  import { REGIONS, RI } from '../../lib/sim/catalog';
  import type { TaskResult } from '../../lib/sim/network';
  import { strings } from '../../lib/strings';

  interface Props {
    result: TaskResult;
    compact?: boolean;
  }

  let { result, compact = false }: Props = $props();

  const t = strings.tasks;

  let pct = $derived(Math.round(result.ratio * 100));
  let level = $derived(pct >= 75 ? 'intact' : pct >= 35 ? 'impaired' : 'severe');
  let verdict = $derived(level === 'intact' ? t.intact : level === 'impaired' ? t.impaired : t.severe);
  let metrics = $derived([
    [t.metrics.count, result.count],
    [t.metrics.healthy, result.healthy],
    [t.metrics.base, result.base],
  ] as const);
</script>

{#if compact}
  <div class="result compact {level}" role="status" aria-live="polite">
    <span class="big mono">{pct}<span>%</span></span>
    <div class="meter"><i style:width="{Math.min(100, pct)}%"></i></div>
    <span class="badge">{verdict}</span>
  </div>
{:else}
<div class="result {level}" aria-live="polite">
  <div class="head">
    <div>
      <div class="name">{result.def.name}</div>
      <div class="sub">{t.detail(REGIONS[RI[result.def.output]].name)}</div>
    </div>
    <span class="badge">{verdict}</span>
  </div>
  <div class="big mono">{pct}<span>%</span></div>
  <div class="meter"><i style:width="{Math.min(100, pct)}%"></i></div>
  <dl>
    {#each metrics as [label, value] (label)}
      <div><dt>{label}</dt><dd class="mono">{value}</dd></div>
    {/each}
  </dl>
</div>
{/if}

<style>
  .result {
    --tone: var(--good); --tone-soft: var(--good-soft); --tone-line: var(--good-line);
    border: 1px solid var(--line);
    border-radius: var(--r-lg);
    padding: 14px;
    background: var(--panel);
    box-shadow: var(--shadow);
  }
  .impaired { --tone: var(--warn); --tone-soft: var(--warn-soft); --tone-line: var(--warn-line); }
  .severe { --tone: var(--bad); --tone-soft: var(--harm-soft); --tone-line: var(--harm-line); }
  .compact { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; padding: 8px 10px; margin-top: 10px; box-shadow: none; background: var(--tone-soft); border-color: var(--tone-line); }
  .compact .big { margin: 0; font-size: var(--fs-lg); }
  .compact .big span { font-size: var(--fs-sm); }
  .compact .meter { margin: 0; background: var(--panel); }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .name { font-weight: 600; }
  .sub { font-size: var(--fs-sm); color: var(--muted); }
  .badge {
    flex: none; font-size: var(--fs-xs); font-weight: 500; padding: 2px 8px; border-radius: 999px;
    color: var(--tone); background: var(--tone-soft); border: 1px solid var(--tone-line);
  }
  .big { margin-top: 10px; font-size: 28px; font-weight: 500; letter-spacing: -.02em; color: var(--text); }
  .big span { font-size: var(--fs-lg); color: var(--muted); margin-left: 2px; }
  .meter { height: 6px; background: var(--hover); border-radius: 3px; overflow: hidden; margin: 8px 0 12px; }
  .meter i { display: block; height: 100%; background: var(--tone); }
  dl { display: grid; grid-template-columns: repeat(3, 1fr); margin: 0; border-top: 1px solid var(--line); padding-top: 10px; }
  dl div + div { border-left: 1px solid var(--line); padding-left: 12px; }
  dt { font-size: var(--fs-xs); color: var(--subtle); }
  dd { margin: 0; font-size: var(--fs-md); color: var(--text); }
</style>
