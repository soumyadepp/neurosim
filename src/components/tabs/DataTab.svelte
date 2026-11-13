<script lang="ts">
  import Play from '@lucide/svelte/icons/play';
  import Sigma from '@lucide/svelte/icons/sigma';
  import {
    fitCoupling, getAtlas, model, runModel, setCoupling, setHomotopic, setPaint, setSeed, ui, type PaintMode,
  } from '../../lib/engine.svelte';
  import { NETWORK_COLORS, NETWORK_ORDER, rgbCss } from '../../lib/render/paint';
  import { REGIONS, SUBCORTICAL } from '../../lib/sim/catalog';
  import { strings } from '../../lib/strings';
  import ColorLegend from '../data/ColorLegend.svelte';
  import FcHeatmap from '../data/FcHeatmap.svelte';
  import FitCurve from '../data/FitCurve.svelte';
  import RangeSlider from '../ui/RangeSlider.svelte';
  import SectionHeader from '../ui/SectionHeader.svelte';

  const d = strings.data;
  const atlas = getAtlas();
  const data = atlas?.brain ?? null;

  const names = data ? data.nodes.map(n => `${n.name} (${n.hemi})`) : [];
  const order = data
    ? data.nodes
        .map((n, i) => ({ i, h: n.hemi === 'L' ? 0 : 1, net: NETWORK_ORDER.indexOf(n.network) }))
        .sort((a, b) => a.h - b.h || a.net - b.net || a.i - b.i)
        .map(o => o.i)
    : [];
  const realFc = data ? data.fc.flat() : null;

  const paints: { value: PaintMode; label: string }[] = data
    ? [
        { value: 'regions', label: d.paints.regions },
        { value: 'networks', label: d.paints.networks },
        { value: 'fc-real', label: d.paints.fcReal },
        { value: 'fc-model', label: d.paints.fcModel },
        ...data.receptors.names.map(r => ({ value: `receptor:${r}` as PaintMode, label: d.paints.receptor(r) })),
      ]
    : [];

  const busy = $derived(model.status === 'running');
  const usesSeed = $derived(model.paint === 'fc-real' || model.paint === 'fc-model');
  const regionLegend = REGIONS.filter(r => !SUBCORTICAL.includes(r.id)).map(r => ({ label: r.name, color: rgbCss(r.color) }));
  const networkLegend = NETWORK_ORDER.map(n => ({ label: n, color: rgbCss(NETWORK_COLORS[n]) }));
</script>

<SectionHeader eyebrow={d.eyebrow} title={d.heading} intro={d.intro} />

{#if !data || ui.dataSource !== 'atlas'}
  <p class="note">{d.unavailable}</p>
{:else}
  <div class="section">
    <p class="eyebrow">{d.fitEyebrow}</p>
    <dl class="kpis">
      <div>
        <dt>{d.kpi.model}</dt>
        <dd class="mono">{model.result ? model.result.r.toFixed(2) : '—'}</dd>
        <small>{model.result ? d.kpi.modelHint : d.kpi.empty}</small>
      </div>
      <div>
        <dt>{d.kpi.baseline}</dt>
        <dd class="mono">{data.validation.scFcR.toFixed(2)}</dd>
        <small>{d.kpi.baselineHint}</small>
      </div>
      <div>
        <dt>{d.kpi.meanFc}</dt>
        <dd class="mono">{model.result ? model.result.meanFc.toFixed(2) : '—'}</dd>
        <small>{d.kpi.meanFcHint(data.validation.empiricalMeanFc.toFixed(2))}</small>
      </div>
    </dl>
  </div>

  <div class="section">
    <p class="eyebrow">{d.controlsEyebrow}</p>
    <RangeSlider id="coupling" label={d.coupling} hint={d.couplingHint} value={model.G} min={0} max={1.6} step={0.05} oninput={setCoupling} />
    <RangeSlider id="homotopic" label={d.homotopic} hint={d.homotopicHint} value={model.homotopicStrength} min={0} max={1} step={0.05} oninput={setHomotopic} />
    <div class="row actions">
      <button class="btn primary" type="button" disabled={busy} onclick={runModel}><Play size={13} />{busy ? d.running : d.run}</button>
      <button class="btn" type="button" disabled={busy} onclick={fitCoupling}><Sigma size={14} />{d.fit}</button>
    </div>
    <p class="aside">{d.stateNote}</p>
    {#if model.status === 'error'}<p class="error" role="alert">{d.error(model.error)}</p>{/if}
  </div>

  <div class="section">
    <p class="eyebrow">{d.matricesEyebrow}</p>
    <div class="matrices">
      <FcHeatmap title={d.real} matrix={realFc} {order} {names} />
      <FcHeatmap title={d.simulated} matrix={model.result?.fc ?? null} {order} {names} emptyText={d.simulatedEmpty} />
    </div>
    <ColorLegend kind="ramp" ramp="diverging" low={d.fcLow} high={d.fcHigh} />
    <p class="aside hint">{d.matrixHint}</p>
  </div>

  <div class="section">
    <p class="eyebrow">{d.sweepEyebrow}</p>
    {#if model.sweep}
      <FitCurve points={model.sweep.points} best={model.sweep.best} current={model.G} />
    {:else}
      <p class="aside">{d.sweepEmpty}</p>
    {/if}
  </div>

  <div class="section">
    <p class="eyebrow">{d.surfaceEyebrow}</p>
    <label class="field">
      <span>{d.paint}</span>
      <select value={model.paint} onchange={e => setPaint(e.currentTarget.value as PaintMode)}>
        {#each paints as p (p.value)}<option value={p.value}>{p.label}</option>{/each}
      </select>
    </label>
    {#if usesSeed}
      <label class="field">
        <span>{d.seed}</span>
        <select value={model.seed} onchange={e => setSeed(Number(e.currentTarget.value))}>
          {#each ['L', 'R'] as hemi (hemi)}
            <optgroup label={hemi === 'L' ? 'Left' : 'Right'}>
              {#each data.nodes.filter(n => n.hemi === hemi) as n (n.index)}<option value={n.index}>{n.name}</option>{/each}
            </optgroup>
          {/each}
        </select>
      </label>
    {/if}
    <div class="legend">
      {#if model.paint === 'regions'}
        <ColorLegend kind="categories" items={regionLegend} />
      {:else if model.paint === 'networks'}
        <ColorLegend kind="categories" items={networkLegend} />
      {:else if usesSeed}
        {#if model.paint === 'fc-model' && !model.result}<p class="aside">{d.needsRun}</p>{/if}
        <ColorLegend kind="ramp" ramp="diverging" low={d.fcLow} high={d.fcHigh} />
      {:else}
        <ColorLegend kind="ramp" ramp="sequential" low={d.densityLow} high={d.densityHigh} />
      {/if}
    </div>
  </div>

  <div class="section">
    <p class="eyebrow">{d.sourcesEyebrow}</p>
    <p class="note caveat">{d.caveat}</p>
    <ul class="sources">
      {#each data.sources as s (s.name)}
        <li>
          <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>
          <span>{s.citation}</span>
          <small>{s.license}</small>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); margin: 0; border: 1px solid var(--line); border-radius: var(--r-lg); overflow: hidden; }
  .kpis div { padding: 10px 12px; min-width: 0; }
  .kpis div + div { border-left: 1px solid var(--line); }
  dt { font-size: var(--fs-xs); color: var(--subtle); font-weight: 500; }
  dd { margin: 2px 0; font-size: 22px; font-weight: 500; letter-spacing: -.02em; color: var(--text); }
  small { display: block; font-size: var(--fs-xs); line-height: 1.35; color: var(--muted); }
  .actions { margin-top: 4px; }
  .aside { margin: 0; }
  .hint { margin-top: 6px; }
  .error { margin: 8px 0 0; font-size: var(--fs-sm); color: var(--harm); }
  .matrices { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; }
  .field { display: grid; gap: 4px; margin-bottom: 10px; font-size: var(--fs-sm); color: var(--muted); }
  select {
    height: var(--control-h); padding: 0 8px; font: inherit; font-size: var(--fs-base); color: var(--text);
    background: var(--panel); border: 1px solid var(--line-strong); border-radius: var(--r-md);
  }
  .legend { margin-top: 4px; }
  .caveat { margin-bottom: 12px; }
  .sources { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
  .sources li { display: grid; gap: 2px; font-size: var(--fs-xs); color: var(--muted); }
  .sources a { font-size: var(--fs-sm); font-weight: 500; color: var(--signal); text-decoration: none; }
  .sources a:hover { text-decoration: underline; }
</style>
