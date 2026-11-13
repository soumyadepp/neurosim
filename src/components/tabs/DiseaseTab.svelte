<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Info from '@lucide/svelte/icons/info';
  import {
    START_AGE, course, disease, diseaseAvailable, setEfficacy,
    setReserve, setScenario, setTreatment, tour,
  } from '../../lib/disease.svelte';
  import type { Milestones, ReserveLevel } from '../../lib/disease/progression';
  import { SCENARIOS, type ScenarioId } from '../../lib/disease/scenarios';
  import { ui } from '../../lib/engine.svelte';
  import { strings } from '../../lib/strings';
  import GainBars from '../disease/GainBars.svelte';
  import RangeSlider from '../ui/RangeSlider.svelte';
  import Segmented from '../ui/Segmented.svelte';

  const d = strings.disease;
  const available = diseaseAvailable();

  const scenarioOptions = SCENARIOS.map(s => ({ value: s.id, label: d.scenarios[s.id].short, title: d.scenarios[s.id].name }));
  const reserveOptions = (['low', 'typical', 'high'] as ReserveLevel[]).map(value => ({ value, label: d.reserve.options[value] }));

  const scenario = $derived(d.scenarios[disease.scenario]);
  const untreated = $derived(course.untreated);
  const primary = $derived(course.treated ?? course.untreated);

  function windowOf(m: Milestones): number | null {
    const found = [m.biomarker, m.network].filter((v): v is number => v !== null);
    return found.length && m.symptoms !== null ? m.symptoms - Math.min(...found) : null;
  }

  const kpis = $derived.by(() => {
    if (!primary || !untreated) return [];
    const p = primary.milestones, u = untreated.milestones;
    const treated = !!course.treated;
    const delta = (a: number | null, b: number | null) => (treated && a !== null && b !== null && Math.abs(a - b) >= 0.05 ? a - b : null);
    const ageText = (v: number | null) => (v === null ? d.kpi.beyond : d.kpi.ageValue(START_AGE + v));
    const w = windowOf(p);
    return [
      { label: d.kpi.window, value: w === null ? d.kpi.pending : d.kpi.years(w), hint: d.kpi.windowHint, delta: delta(w, windowOf(u)) },
      { label: d.kpi.symptoms, value: ageText(p.symptoms), hint: d.kpi.symptomsHint, delta: delta(p.symptoms, u.symptoms) },
      { label: d.kpi.care, value: ageText(p.care), hint: d.kpi.careHint, delta: delta(p.care, u.care) },
    ];
  });
</script>

<header class="head">
  <h2>{d.heading}</h2>
</header>

{#if !available}
  <p class="note">{d.unavailable}</p>
{:else}
  <div class="block">
    <Segmented label={d.conditionEyebrow} options={scenarioOptions} value={disease.scenario} onchange={id => setScenario(id as ScenarioId)} />
    <p class="condition"><strong>{scenario.name}.</strong> {scenario.note}</p>
  </div>

  <dl class="kpis block">
    {#each kpis as k (k.label)}
      <div>
        <dt>{k.label}</dt>
        <dd>{k.value}</dd>
        {#if k.delta !== null}<span class="delta mono">{d.kpi.delta(k.delta)}</span>{:else}<small>{k.hint}</small>{/if}
      </div>
    {/each}
  </dl>

  {#if untreated}
    <div class="block treat" class:spotlight={tour.step === 'treat'}>
      <p class="eyebrow">{d.treat.eyebrow}</p>
      <GainBars gains={course.gains} starts={untreated.milestones} active={disease.treatAt} onselect={p => setTreatment(disease.treatAt === p ? 'none' : p)} />
      {#if disease.treatAt !== 'none'}
        <button class="link" type="button" onclick={() => setTreatment('none')}>{d.treat.clear}</button>
      {/if}
    </div>
  {/if}

  <p class="disclaimer"><Info size={13} />{d.disclaimer}</p>

  <details class="more">
    <summary>{d.more.assumptions}<ChevronDown size={15} /></summary>
    <div class="body">
      <RangeSlider id="efficacy" label={d.treat.efficacy} hint={d.treat.efficacyHint} value={disease.efficacy} min={0.05} max={0.6} step={0.05}
        format={v => `${Math.round(v * 100)}%`} oninput={setEfficacy} />
      {#if ui.dev}
        <p class="label">{d.reserve.eyebrow}</p>
        <Segmented label={d.reserve.eyebrow} options={reserveOptions} value={disease.reserve} onchange={setReserve} />
        <p class="aside hint">{d.reserve.hint}</p>
      {/if}
    </div>
  </details>

  <details class="more">
    <summary>{d.more.how}<ChevronDown size={15} /></summary>
    <div class="body">
      <ol class="how">
        {#each d.reality.how as line, i (i)}<li>{line}</li>{/each}
      </ol>
      <p class="aside">{d.reality.timing}</p>

      <p class="label">{d.reality.eyebrow}</p>
      {#if course.staging}
        <p class="stat mono">{d.reality.braak(course.staging.rho.toFixed(2))} <span class="badge">{d.reality.strength(course.staging.rho)}</span></p>
        <p class="aside">{d.reality.braakHint}</p>
      {:else}
        <p class="aside">{d.reality.unstaged}</p>
      {/if}

      <p class="label">{d.detect.eyebrow}</p>
      <ul class="detect">
        {#each d.detect.items as item (item.name)}<li><strong>{item.name}</strong> {item.text}</li>{/each}
      </ul>

      <p class="label">{d.sourcesEyebrow}</p>
      <ul class="sources">
        {#each d.sources as s (s.name)}
          <li><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> <span>{s.text}</span></li>
        {/each}
      </ul>
    </div>
  </details>
{/if}

<style>
  .head { margin-bottom: 16px; }
  h2 { margin: 0; font-family: var(--display); font-size: 22px; font-weight: 500; letter-spacing: -.01em; }
  .treat { border-radius: var(--r-lg); transition: box-shadow .2s, background .2s; }
  .spotlight { margin-left: -10px; margin-right: -10px; padding: 10px; background: var(--signal-soft); box-shadow: 0 0 0 2px var(--signal); }
  .block { margin-bottom: 20px; }
  .condition { margin: 8px 0 0; font-size: var(--fs-sm); color: var(--muted); line-height: 1.45; }
  .condition strong { color: var(--text-2); font-weight: 600; }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 0; border: 1px solid var(--line); border-radius: var(--r-lg); overflow: hidden; }
  .kpis div { padding: 10px 12px; min-width: 0; }
  .kpis div + div { border-left: 1px solid var(--line); }
  dt { font-size: var(--fs-xs); color: var(--subtle); font-weight: 500; line-height: 1.3; }
  dd { margin: 2px 0; font-family: var(--display); font-size: 21px; font-weight: 500; letter-spacing: -.01em; color: var(--text); white-space: nowrap; }
  small { display: block; font-size: var(--fs-xs); line-height: 1.35; color: var(--muted); }
  .delta {
    display: inline-block; font-size: var(--fs-xs); font-weight: 500; padding: 1px 6px; border-radius: 999px;
    color: var(--good); background: var(--good-soft); border: 1px solid var(--good-line);
  }
  .eyebrow { margin-bottom: 8px; }
  .link {
    margin-top: 6px; padding: 0; border: 0; background: none; font: inherit; font-size: var(--fs-sm);
    color: var(--signal); cursor: pointer;
  }
  .link:hover { text-decoration: underline; }
  .disclaimer {
    display: flex; gap: 6px; align-items: flex-start; margin: 0 0 12px;
    font-size: var(--fs-xs); line-height: 1.45; color: var(--muted);
  }
  .disclaimer :global(svg) { flex: none; margin-top: 1px; }
  .more { border-top: 1px solid var(--line); }
  .more:last-of-type { border-bottom: 1px solid var(--line); }
  summary {
    display: flex; justify-content: space-between; align-items: center; padding: 12px 0;
    font-size: var(--fs-base); font-weight: 500; color: var(--text-2); cursor: pointer; list-style: none;
  }
  summary::-webkit-details-marker { display: none; }
  summary:hover { color: var(--text); }
  summary :global(svg) { color: var(--subtle); transition: transform .15s; }
  .more[open] summary :global(svg) { transform: rotate(180deg); }
  .body { padding: 0 0 16px; }
  .label { margin: 14px 0 6px; font-size: var(--fs-sm); font-weight: 600; color: var(--text-2); }
  .aside { margin: 0; }
  .hint { margin-top: 8px; }
  .stat { margin: 0 0 4px; font-size: var(--fs-sm); color: var(--text); }
  .badge {
    margin-left: 6px; font-family: var(--font); font-size: var(--fs-xs); font-weight: 500; padding: 1px 7px; border-radius: 999px;
    color: var(--signal); background: var(--signal-soft); border: 1px solid var(--signal-line);
  }
  .how { margin: 0 0 8px; padding-left: 18px; display: grid; gap: 4px; font-size: var(--fs-sm); color: var(--text-2); line-height: 1.45; }
  .detect, .sources { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; font-size: var(--fs-sm); color: var(--muted); line-height: 1.45; }
  .detect strong { color: var(--text); font-weight: 600; }
  .sources a { font-weight: 500; color: var(--signal); text-decoration: none; }
  .sources a:hover { text-decoration: underline; }
</style>
