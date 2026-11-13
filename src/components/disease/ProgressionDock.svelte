<script lang="ts">
  import Pause from '@lucide/svelte/icons/pause';
  import Play from '@lucide/svelte/icons/play';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import FlaskConical from '@lucide/svelte/icons/flask-conical';
  import {
    HORIZON, NETWORK_TIMES, START_AGE, course, currentPhase, disease, scenarioTask, setTreatment, setYear, startTour, testAtCurrentAge, togglePlay, tour, type TreatmentStart,
  } from '../../lib/disease.svelte';
  import { ui } from '../../lib/engine.svelte';
  import { strings } from '../../lib/strings';
  import { COURSE_COLORS } from '../../lib/render/paint';
  import ProgressionChart from './ProgressionChart.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import { go } from '../../lib/router.svelte';

  const d = strings.disease;

  const scenario = $derived(d.scenarios[disease.scenario]);
  const phase = $derived(currentPhase());
  const atEnd = $derived(disease.year >= HORIZON);
  const busy = $derived(!!ui.runningTaskId);
  const simulating = $derived(course.networkDone < NETWORK_TIMES.length);
  const task = $derived(scenarioTask());
  const testing = $derived(ui.runningTaskId === task.id);
  const result = $derived(ui.taskResult && ui.taskResult.def.id === task.id && disease.testAge !== null && !testing ? ui.taskResult : null);
  const pct = $derived(result ? Math.round(result.ratio * 100) : 0);
  const tone = $derived(pct >= 75 ? 'good' : pct >= 35 ? 'warn' : 'bad');
  const treatOptions = (['none', 'biomarker', 'network', 'symptoms'] as TreatmentStart[]).map(value => ({
    value, label: d.treat.options[value], title: d.treat.optionTitles[value],
  }));
  const gain = $derived(disease.treatAt !== 'none' ? course.gains[disease.treatAt] : undefined);
  const legend = $derived([
    { color: COURSE_COLORS.tau, label: d.series.tau },
    { color: COURSE_COLORS.network, label: d.series.network },
    { color: COURSE_COLORS.decline, label: d.series.decline(scenario.symptom) },
  ]);
</script>

{#if course.untreated}
  <section class="dock" aria-label={d.heading}>
    <div class="top">
      <button
        class="btn primary play"
        type="button"
        disabled={busy}
        onclick={togglePlay}
        aria-label={disease.playing ? d.pause : atEnd ? d.replay : d.play}
        title={disease.playing ? d.pause : atEnd ? d.replay : d.play}
      >
        {#if disease.playing}<Pause size={16} />{:else if atEnd}<RotateCcw size={15} />{:else}<Play size={16} />{/if}
      </button>
      <div class="when">
        <strong>{d.age(Math.floor(START_AGE + disease.year))}</strong>
        <span>{d.sinceOnset(disease.year)}</span>
      </div>
      <span class="phase {phase}">{d.phases[phase]}</span>
      <p class="caption" aria-live="polite">{scenario.captions[phase]}</p>
      <div class="test">
        {#if result}<span class="result {tone}" role="status">{d.test.result(pct, disease.testAge!)}</span>{/if}
        <button
          class="btn sm"
          type="button"
          disabled={busy}
          title={d.test.hint}
          aria-label={d.test.run(scenario.test, Math.floor(START_AGE + disease.year))}
          onclick={testAtCurrentAge}
        >
          <FlaskConical size={13} />
          <span class="test-label">{testing ? d.test.running : d.test.run(scenario.test, Math.floor(START_AGE + disease.year))}</span>
        </button>
      </div>
    </div>

    <ProgressionChart
      untreated={course.untreated}
      treated={course.treated}
      treatmentYear={course.treatmentYear}
      year={disease.year}
      symptom={scenario.symptom}
      disabled={busy}
      onscrub={setYear}
    />

    {#if !ui.dev}
      <div class="treat-row">
        <span class="treat-label">{d.treat.start}</span>
        <div class="treat-seg" class:glow={tour.step === 'treat'}><Segmented label={d.treat.start} options={treatOptions} value={disease.treatAt} onchange={setTreatment} /></div>
        {#if disease.treatAt !== 'none'}
          <span class="gain-chip" role="status">{typeof gain === 'number' ? d.treat.gainChip(gain) : gain === null ? d.treat.beyond : d.treat.pending}</span>
        {/if}
        <button class="note-line" type="button" onclick={() => go({ page: 'evidence' })}>{d.shortNote}</button>
      </div>
    {/if}
    <div class="foot">
      <ul class="legend">
        {#each legend as l (l.label)}<li><i style:background={l.color}></i>{l.label}</li>{/each}
        {#if course.treated}<li class="ghost"><i></i>{d.untreated}</li>{/if}
      </ul>
      <span class="status" role="status">
        {#if simulating}
          <span class="spinner" aria-hidden="true"></span>
          {#if ui.dev}{d.simulating(course.networkDone, NETWORK_TIMES.length)}{:else}<span class="sr">{d.simulating(course.networkDone, NETWORK_TIMES.length)}</span>{/if}
        {:else if tour.step === null}<button class="tour" type="button" onclick={startTour}>{d.tour.replay}</button>{/if}
      </span>
    </div>
  </section>
{/if}

<style>
  .dock {
    padding: 12px 16px calc(10px + env(safe-area-inset-bottom, 0px));
    background: var(--panel);
    border-top: 1px solid var(--line);
    box-shadow: 0 -4px 12px rgba(15, 23, 42, .04);
  }
  .top { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; min-width: 0; }
  .play { width: 36px; height: 36px; padding: 0; border-radius: 50%; flex: none; }
  .when { display: grid; flex: none; line-height: 1.2; }
  .when strong { font-family: var(--display); font-size: 19px; font-weight: 500; letter-spacing: 0; color: var(--text); min-width: 76px; }
  .when span { font-size: var(--fs-xs); color: var(--muted); }
  .phase {
    flex: none; display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px;
    font-size: var(--fs-sm); font-weight: 600; border: 1px solid var(--line); color: var(--text-2); background: var(--panel2);
  }
  .phase::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--subtle); }
  .phase.detectable { color: var(--st-warning-text); background: var(--st-warning-soft); border-color: var(--st-warning-line); }
  .phase.detectable::before { background: var(--st-warning); }
  .phase.symptoms { color: var(--st-serious-text); background: var(--st-serious-soft); border-color: var(--st-serious-line); }
  .phase.symptoms::before { background: var(--st-serious); }
  .phase.care { color: var(--st-critical-text); background: var(--st-critical-soft); border-color: var(--st-critical-line); }
  .phase.care::before { background: var(--st-critical); }
  .caption {
    margin: 0; flex: 1; min-width: 0; font-size: var(--fs-base); color: var(--text-2); line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .test { flex: none; display: flex; align-items: center; gap: 8px; }
  .result {
    font-size: var(--fs-xs); font-weight: 500; padding: 2px 8px; border-radius: 999px; white-space: nowrap;
    color: var(--good); background: var(--good-soft); border: 1px solid var(--good-line);
  }
  .result.warn { color: var(--warn); background: var(--warn-soft); border-color: var(--warn-line); }
  .result.bad { color: var(--bad); background: var(--harm-soft); border-color: var(--harm-line); }
  .treat-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 6px 0 2px; }
  .treat-label { font-size: var(--fs-sm); font-weight: 500; color: var(--text-2); flex: none; }
  .treat-seg { width: min(380px, 100%); }
  .treat-seg.glow { border-radius: var(--r-md); animation: glow 1.5s ease-in-out infinite; }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 0 2px var(--signal-line); }
    50% { box-shadow: 0 0 0 6px rgba(37, 99, 235, .18); }
  }
  @media (prefers-reduced-motion: reduce) { .treat-seg.glow { animation: none; box-shadow: 0 0 0 2px var(--signal); } }
  .gain-chip {
    font-size: var(--fs-sm); font-weight: 600; padding: 3px 12px; border-radius: 999px; white-space: nowrap;
    color: var(--good); background: var(--good-soft); border: 1px solid var(--good-line);
  }
  .note-line { margin-left: auto; padding: 0; border: 0; background: none; font: inherit; font-size: var(--fs-xs); color: var(--subtle); cursor: pointer; text-decoration: underline; text-decoration-color: var(--line-strong); text-underline-offset: 3px; }
  .note-line:hover { color: var(--text-2); }
  .foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 2px; flex-wrap: wrap; }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; padding: 0; list-style: none; font-size: var(--fs-xs); color: var(--text-2); }
  .legend li { display: flex; align-items: center; gap: 6px; }
  .legend i { width: 14px; height: 3px; border-radius: 2px; }
  .legend .ghost i { background: repeating-linear-gradient(90deg, var(--muted) 0 4px, transparent 4px 7px); opacity: .7; }
  .status { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-xs); color: var(--subtle); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .tour { padding: 0; border: 0; background: none; font: inherit; font-size: var(--fs-xs); font-weight: 500; color: var(--signal); cursor: pointer; }
  .tour:hover { text-decoration: underline; }
  .spinner {
    width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid var(--line-strong); border-top-color: var(--signal);
    animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
  @media (max-width: 860px) {
    .caption { display: none; }
    .test { margin-left: auto; }
  }
  @media (max-width: 640px) {
    .dock { padding: 12px 14px calc(10px + env(safe-area-inset-bottom, 0px)); }

    .top { flex-wrap: wrap; gap: 10px; row-gap: 10px; margin-bottom: 10px; }
    .play { order: 1; width: 48px; height: 48px; }
    .when { order: 2; }
    .when strong { font-size: 22px; min-width: 0; }
    .when span { display: none; }
    .phase { order: 3; margin-left: auto; font-size: var(--fs-base); padding: 5px 12px; }
    .caption {
      order: 4; flex: 1 0 100%; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2;
      font-size: var(--fs-md); line-height: 1.45;
    }
    .test { display: none; }

    .treat-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 10px; margin: 14px 0 0; }
    .treat-label { grid-area: 1 / 1; align-self: center; font-size: var(--fs-md); }
    .gain-chip { grid-area: 1 / 2; justify-self: end; font-size: var(--fs-base); }
    .treat-seg { grid-area: 2 / 1 / 3 / -1; width: 100%; }
    .note-line { display: none; }

    .foot { gap: 10px; margin-top: 10px; }
    .legend { font-size: var(--fs-sm); gap: 6px 14px; }
    .legend i { width: 16px; }
    .status { font-size: var(--fs-sm); }
  }

  @media (max-width: 640px) and (max-height: 820px) {
    .dock { padding-top: 10px; }
    .top { margin-bottom: 8px; gap: 8px; row-gap: 8px; }
    .play { width: 44px; height: 44px; }
    .when strong { font-size: 20px; }
    .caption { -webkit-line-clamp: 2; line-clamp: 2; font-size: var(--fs-base); }
    .treat-row { margin-top: 10px; gap: 6px 10px; }
    .foot { margin-top: 8px; gap: 6px; }
    .legend { font-size: var(--fs-xs); gap: 4px 12px; }
    .legend i { width: 13px; }
  }

  @media (max-width: 640px) and (max-height: 700px) {
    .dock { padding: 8px 14px calc(8px + env(safe-area-inset-bottom, 0px)); }
    .top { margin-bottom: 6px; row-gap: 6px; }
    .play { width: 40px; height: 40px; }
    .when strong { font-size: 18px; }
    .phase { font-size: var(--fs-sm); padding: 3px 10px; }
    .caption { -webkit-line-clamp: 1; line-clamp: 1; font-size: var(--fs-base); }
    .treat-row { margin-top: 8px; }
    .treat-label { font-size: var(--fs-base); }
    .foot { margin-top: 6px; }
    .legend { font-size: 11px; gap: 3px 10px; }
  }
</style>
