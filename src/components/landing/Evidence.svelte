<script lang="ts">
  import { onMount } from 'svelte';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Brain from '@lucide/svelte/icons/brain';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Gauge from '@lucide/svelte/icons/gauge';
  import Play from '@lucide/svelte/icons/play';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import UserX from '@lucide/svelte/icons/user-x';
  import { SCENARIOS } from '../../lib/disease/scenarios';
  import { EVIDENCE_FACTS } from '../../lib/landing/facts';
  import { reveal } from '../../lib/landing/reveal';
  import { gradeAgainstChance } from '../../lib/landing/verdict';
  import { go } from '../../lib/router.svelte';
  import { strings } from '../../lib/strings';
  import ThemeToggle from '../ui/ThemeToggle.svelte';

  const E = strings.evidence;
  const F = EVIDENCE_FACTS;
  const M = E.meg;
  const T = E.tau;

  const VERDICT_ICONS = { real: ShieldCheck, scored: Gauge, group: UserX };
  const LEVEL_STEPS = { high: 3, moderate: 2, low: 1 };
  const SECTIONS = ['verdict', 'scores', 'data', 'limits'] as const;

  const SCORE_VALUES = [F.modelR, F.connectomeR, F.braakRho, F.parkinsons.r];
  const scores = E.scores.map((s, i) => ({ ...s, value: SCORE_VALUES[i] }));
  const stats = [
    { value: String(F.regions), label: E.stats.regions },
    { value: String(F.receptors), label: E.stats.receptors },
    { value: String(E.datasets.length), label: E.stats.sources },
  ];
  const ladder = E.ladder.map(row => ({ ...row, level: row.level as keyof typeof LEVEL_STEPS }));

  const bands = F.meg.bands.map((id, i) => ({
    ...M.bands[id],
    score: F.meg.r[i],
    chance: F.meg.nullMean[i],
    verdict: gradeAgainstChance(F.meg.p[i], F.meg.bands.length),
  }));

  const tauTests = F.tau.maps.length * F.tau.scenarios.length;
  const tauColumns = F.tau.scenarios.map(id => SCENARIOS.find(s => s.id === id)!);
  const tauRows = F.tau.maps.map((id, m) => ({
    ...T.maps[id],
    cells: tauColumns.map((scenario, s) => ({
      rho: F.tau.rho[m][s],
      verdict: gradeAgainstChance(F.tau.p[m][s], tauTests),
      expected: scenario.tauPattern === id,
    })),
  }));
  const tauCell = (map: string, scenario: string) =>
    F.tau.rho[F.tau.maps.indexOf(map as never)][F.tau.scenarios.indexOf(scenario as never)].toFixed(2);
  const tauFindings = T.findings({
    adLimbic: tauCell('limbic', 'alzheimers'),
    adPosterior: tauCell('posterior', 'alzheimers'),
    pcaPosterior: tauCell('posterior', 'pca'),
    tests: tauTests,
  });

  const shortCitation = (citation: string) => `${citation.split(').')[0]})`;

  let scroller = $state<HTMLElement>();

  function jump(id: string): void {
    scroller?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onMount(() => {
    document.title = E.title;
    scroller?.scrollTo({ top: 0 });
  });
</script>

<div class="evidence" bind:this={scroller}>
  <header class="nav">
    <div class="wrap nav-inner">
      <a class="brand" href="#/"><span class="mark"><Brain size={16} /></span>NeuroSim</a>
      <nav class="jump" aria-label={E.nav}>
        {#each SECTIONS as id (id)}
          <button type="button" onclick={() => jump(id)}>{E.sections[id]}</button>
        {/each}
      </nav>
      <button class="back" type="button" onclick={() => go({ page: 'landing' })} aria-label={E.back}><ArrowLeft size={14} /><span>{E.back}</span></button>
      <ThemeToggle />
    </div>
  </header>

  <main>
    <section class="hero" id="verdict">
      <div class="wrap">
        <p class="eyebrow">{E.eyebrow}</p>
        <h1>{E.heading}</h1>
        <p class="lede">{E.lede}</p>
        <ul class="verdict">
          {#each E.verdict as v (v.strong)}
            {@const Icon = VERDICT_ICONS[v.icon as keyof typeof VERDICT_ICONS]}
            <li>
              <span class="verdict-icon"><Icon size={20} /></span>
              <strong>{v.strong}</strong>
              <p>{v.text}</p>
            </li>
          {/each}
        </ul>
        <dl class="stat-strip">
          {#each stats as s (s.label)}
            <div><dt>{s.value}</dt><dd>{s.label}</dd></div>
          {/each}
          <div class="wide"><dt>0</dt><dd>{E.stats.backend}</dd></div>
        </dl>
      </div>
    </section>

    <section class="block reveal" use:reveal>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{E.ladderEyebrow}</p>
          <h2>{E.ladderHeading}</h2>
          <p class="hint">{E.ladderHint}</p>
        </header>
        <div class="ladder">
          {#each ladder as row (row.name)}
            <details class="layer {row.level}">
              <summary>
                <span class="layer-name">{row.name}</span>
                <span class="meter" aria-hidden="true">
                  {#each [1, 2, 3] as step (step)}<i class:on={step <= LEVEL_STEPS[row.level]}></i>{/each}
                </span>
                <span class="level">{E.levels[row.level]}</span>
                <ChevronDown size={16} />
              </summary>
              <p>{row.what}</p>
              <p class="why">{row.why}</p>
            </details>
          {/each}
        </div>
      </div>
    </section>

    <section class="block reveal" id="scores" use:reveal>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{E.scoreEyebrow}</p>
          <h2>{E.scoreHeading}</h2>
          <p class="hint">{E.scoreIntro}</p>
        </header>

        <div class="panel">
          <ul class="scores">
            {#each scores as s (s.check)}
              <li class="score {s.tone}">
                <p class="score-name">{s.check}<span>{s.takeaway}</span></p>
                <div class="track" aria-hidden="true"><i class="bar" style:width="{s.value * 100}%"></i></div>
                <p class="score-value mono">{s.value.toFixed(2)}</p>
              </li>
            {/each}
          </ul>
          <details class="more">
            <summary>{E.detailsLabel}<ChevronDown size={14} /></summary>
            <p>{E.scoreNote}</p>
            {#each scores as s (s.check)}
              <p><strong>{s.check}.</strong> {s.meaning}</p>
            {/each}
            <p>{E.parkinsonsCaveat}</p>
          </details>
        </div>

        <div class="panel">
          <p class="eyebrow">{T.eyebrow}</p>
          <h3>{T.heading}</h3>
          <p class="panel-intro">{T.intro(F.tau.people.toLocaleString('en'))}</p>
          <table class="matrix">
            <thead>
              <tr>
                <th scope="col">{T.measured}</th>
                {#each tauColumns as c (c.id)}
                  <th scope="col">{strings.disease.scenarios[c.id].short}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each tauRows as row (row.name)}
                <tr>
                  <th scope="row">{row.name}<span>{row.note}</span></th>
                  {#each row.cells as cell, i (i)}
                    <td>
                      <span
                        class="cell mono {cell.verdict}"
                        class:expected={cell.expected}
                        class:negative={cell.rho < 0}
                        style:--strength="{Math.round(Math.abs(cell.rho) * 100)}%"
                      >
                        {cell.rho.toFixed(2)}
                        <span class="sr-only">{T.verdicts[cell.verdict]}{cell.expected ? `, ${T.expectedMark}` : ''}</span>
                      </span>
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
          <p class="heat-key" aria-hidden="true">
            <span>{T.scale.low}</span><i class="ramp"></i><span>{T.scale.high}</span>
            <span class="expected-key"><i></i>{T.expectedMark}</span>
          </p>
          <ul class="findings">
            {#each tauFindings as f (f.strong)}
              <li class={f.tone}>
                {#if f.tone === 'good'}<CircleCheck size={18} />{:else}<TriangleAlert size={18} />{/if}
                <p><strong>{f.strong}</strong> {f.text}</p>
              </li>
            {/each}
          </ul>
          <div class="stat-check">
            <p class="stat-value mono">{F.tauAtrophy.r.toFixed(2)}<span>{T.atrophyChance(F.tauAtrophy.nullMean.toFixed(2))}</span></p>
            <div>
              <h4>{T.atrophyTitle}</h4>
              <p>{T.atrophy(F.tauAtrophy.patients)}</p>
            </div>
          </div>
          <details class="more">
            <summary>{E.detailsLabel}<ChevronDown size={14} /></summary>
            <p>{T.key}</p>
            <p>{T.method(F.tau.spins.toLocaleString('en'))}</p>
          </details>
        </div>

        <div class="panel">
          <p class="eyebrow">{M.eyebrow}</p>
          <h3>{M.heading}</h3>
          <p class="panel-intro">{M.intro}</p>
          <ul class="bands">
            {#each bands as b (b.name)}
              <li class="band {b.verdict}">
                <p class="band-name">{b.name}<span>{b.range}</span></p>
                <div class="track" aria-hidden="true">
                  <i class="bar" style:width="{b.score * 100}%"></i>
                  <i class="tick" style:left="{b.chance * 100}%"></i>
                </div>
                <p class="band-score mono">{b.score.toFixed(2)}<span>{M.chance(b.chance.toFixed(2))}</span></p>
                <p class="band-verdict">{M.verdicts[b.verdict]}</p>
              </li>
            {/each}
          </ul>
          <p class="chart-key">
            <span><i class="key-bar"></i>{M.legend.score}</span>
            <span><i class="key-tick"></i>{M.legend.chance}</span>
          </p>
          <p class="note"><TriangleAlert size={16} /><span><strong>{M.catchTitle}.</strong> {M.catch}</span></p>
          <details class="more">
            <summary>{E.detailsLabel}<ChevronDown size={14} /></summary>
            <p>{M.scope}</p>
            <p>{M.method(F.meg.spins.toLocaleString('en'))}</p>
          </details>
        </div>

        <div class="callouts">
          <div class="callout">
            <h3>{E.humblingTitle}</h3>
            <p>{E.humbling}</p>
          </div>
          <div class="callout warn">
            <h3>{E.calibratedTitle}</h3>
            <p>{E.calibrated}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="block reveal" id="data" use:reveal>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{E.dataEyebrow}</p>
          <h2>{E.dataHeading}</h2>
          <p class="hint">{E.dataIntro(E.datasets.length)}</p>
        </header>
        <ul class="sources">
          {#each E.datasets as d (d.name)}
            <li>
              <div class="source-head">
                <h3>{d.name}</h3>
                <a href={d.url} target="_blank" rel="noreferrer" aria-label="{E.visit}: {d.name}"><ExternalLink size={14} /></a>
              </div>
              <p>{d.what}</p>
              <div class="source-foot">
                <span class="licence">{d.licence}</span>
                <details class="cite">
                  <summary>{E.citationLabel}<ChevronDown size={12} /></summary>
                  <p>{d.citation}</p>
                </details>
              </div>
            </li>
          {/each}
        </ul>
        <p class="fine">{E.hcpNote}</p>

        <header class="intro sub">
          <p class="eyebrow">{E.methodEyebrow}</p>
          <h2>{E.methodHeading}</h2>
        </header>
        <ul class="methods">
          {#each E.methods as m (m.citation)}
            <li>
              <span class="idea">{m.idea}</span>
              <a href={m.url} target="_blank" rel="noreferrer" title={m.citation}>{shortCitation(m.citation)}<ExternalLink size={11} /></a>
            </li>
          {/each}
        </ul>
      </div>
    </section>

    <section class="block reveal" id="limits" use:reveal>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{E.limitsEyebrow}</p>
          <h2>{E.limitsHeading}</h2>
        </header>
        <ul class="limits">
          {#each E.limits as l (l.name)}
            <li><TriangleAlert size={18} /><div><h3>{l.name}</h3><p>{l.text}</p></div></li>
          {/each}
        </ul>
      </div>
    </section>

    <section class="final">
      <h2>{E.ctaHeading}</h2>
      <p>{E.ctaBody}</p>
      <button class="btn primary xl" type="button" onclick={() => go({ page: 'story', scenario: 'alzheimers' })}>
        <Play size={16} />{E.ctaButton}
      </button>
    </section>
  </main>

  <footer><div class="wrap">{strings.landing.footer}</div></footer>
</div>

<style>
  .evidence { height: 100%; overflow-y: auto; background: var(--paper); }
  .wrap { width: min(980px, 100% - 40px); margin: 0 auto; }

  .nav { position: sticky; top: 0; z-index: 10; background: color-mix(in srgb, var(--paper) 86%, transparent); backdrop-filter: blur(12px); }
  .nav-inner { display: flex; align-items: center; gap: 14px; height: 60px; }
  .brand { display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: var(--fs-md); color: var(--text); text-decoration: none; }
  .mark { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; background: var(--text); color: var(--paper); }
  .jump { display: flex; gap: 2px; margin-left: auto; }
  .jump button { padding: 6px 12px; border: 0; border-radius: 999px; background: none; font: inherit; font-size: var(--fs-sm); font-weight: 500; color: var(--muted); cursor: pointer; }
  .jump button:hover { color: var(--text); background: var(--hover); }
  .back { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; background: none; font: inherit; font-size: var(--fs-sm); color: var(--muted); cursor: pointer; }
  .back:hover { color: var(--text); border-color: var(--line-strong); }

  .eyebrow { margin: 0 0 12px; font-size: var(--fs-xs); font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--subtle); }
  h1 { margin: 0; font-family: var(--display); font-size: clamp(34px, 4.6vw, 54px); font-weight: 500; line-height: 1.06; letter-spacing: -.015em; color: var(--text); max-width: 18ch; }
  h2 { margin: 0; font-family: var(--display); font-size: clamp(24px, 3vw, 34px); font-weight: 500; line-height: 1.15; color: var(--text); max-width: 24ch; }
  h3 { margin: 0; font-size: var(--fs-md); font-weight: 600; color: var(--text); }
  h4 { margin: 0; font-size: var(--fs-md); font-weight: 600; color: var(--text); }
  .lede { margin: 18px 0 0; font-size: 17px; line-height: 1.6; color: var(--text-2); max-width: 52ch; }
  .hint { margin: 12px 0 0; font-size: var(--fs-md); line-height: 1.55; color: var(--muted); max-width: 60ch; }
  .fine { margin: 16px 0 0; font-size: var(--fs-xs); line-height: 1.6; color: var(--subtle); max-width: 76ch; }
  .intro { margin-bottom: 28px; }
  .intro.sub { margin-top: 56px; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

  .hero { padding: clamp(40px, 7vh, 72px) 0 0; }
  .block { padding: clamp(56px, 8vh, 88px) 0 0; }
  .hero, .block { scroll-margin-top: 44px; }
  .reveal { opacity: 0; transform: translateY(14px); transition: opacity .5s ease, transform .5s ease; }
  :global(.reveal.in) { opacity: 1 !important; transform: none !important; }
  @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } }

  .verdict { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 36px 0 0; padding: 0; list-style: none; }
  .verdict li { padding: 22px; border: 1px solid var(--line); border-radius: 16px; background: var(--panel); }
  .verdict-icon { display: grid; place-items: center; width: 40px; height: 40px; margin-bottom: 14px; border-radius: 12px; background: var(--hover); color: var(--text); }
  .verdict strong { display: block; font-size: var(--fs-lg); font-weight: 600; color: var(--text); }
  .verdict p { margin: 6px 0 0; font-size: var(--fs-base); line-height: 1.5; color: var(--muted); }

  .stat-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin: 16px 0 0; background: var(--line); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
  .stat-strip div { padding: 18px 20px; background: var(--panel); }
  .stat-strip dt { font-family: var(--display); font-size: 30px; font-weight: 500; color: var(--text); line-height: 1; }
  .stat-strip dd { margin: 8px 0 0; font-size: var(--fs-sm); color: var(--muted); line-height: 1.4; }
  .stat-strip .wide dt { color: var(--subtle); }

  details > summary { list-style: none; cursor: pointer; }
  details > summary::-webkit-details-marker { display: none; }
  details > summary :global(svg) { transition: transform .2s ease; }
  details[open] > summary :global(svg) { transform: rotate(180deg); }
  summary:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 8px; }

  .ladder { display: grid; gap: 2px; }
  .layer { background: var(--panel); border: 1px solid var(--line); }
  .layer:first-child { border-radius: 16px 16px 0 0; }
  .layer:last-child { border-radius: 0 0 16px 16px; }
  .layer summary { display: grid; grid-template-columns: minmax(0, 1fr) auto 92px auto; align-items: center; gap: 16px; padding: 16px 20px; color: var(--subtle); }
  .layer-name { font-size: var(--fs-md); font-weight: 600; color: var(--text); }
  .meter { display: flex; gap: 4px; }
  .meter i { width: 26px; height: 8px; border-radius: 4px; background: var(--hover); }
  .layer.high .meter i.on { background: var(--good); }
  .layer.moderate .meter i.on { background: var(--signal); }
  .layer.low .meter i.on { background: var(--st-serious-text); }
  .level { font-size: var(--fs-sm); font-weight: 600; color: var(--muted); }
  .layer p { margin: 0; padding: 0 20px 6px; font-size: var(--fs-base); line-height: 1.55; color: var(--text-2); max-width: 72ch; }
  .layer p.why { padding-bottom: 18px; font-size: var(--fs-sm); color: var(--muted); }

  .panel { margin-top: 20px; padding: 26px; border: 1px solid var(--line); border-radius: 16px; background: var(--panel); }
  .panel:first-of-type { margin-top: 0; }
  .panel > h3 { margin: 6px 0 8px; font-family: var(--display); font-size: 24px; font-weight: 500; letter-spacing: -.01em; line-height: 1.2; }
  .panel-intro { margin: 0 0 22px; max-width: 60ch; font-size: var(--fs-md); line-height: 1.55; color: var(--muted); }

  .more { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
  .more summary, .cite summary { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-sm); font-weight: 500; color: var(--muted); }
  .more summary:hover, .cite summary:hover { color: var(--text); }
  .more p { margin: 12px 0 0; max-width: 76ch; font-size: var(--fs-sm); line-height: 1.6; color: var(--muted); }
  .more strong { color: var(--text-2); font-weight: 600; }

  .track { position: relative; height: 12px; border-radius: 6px; background: var(--hover); }
  .bar { position: absolute; inset: 0 auto 0 0; border-radius: 6px; background: var(--subtle); }

  .scores { list-style: none; margin: 0; padding: 0; display: grid; gap: 18px; }
  .score { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) 56px; align-items: center; gap: 20px; }
  .score p { margin: 0; }
  .score-name { font-size: var(--fs-md); font-weight: 600; color: var(--text); line-height: 1.35; }
  .score-name span { display: block; margin-top: 2px; font-size: var(--fs-sm); font-weight: 400; color: var(--muted); }
  .score-value { font-size: 22px; font-weight: 500; color: var(--text); text-align: right; }
  .score.plain .bar { background: var(--muted); }
  .score.warn .bar { background: var(--st-serious-text); }
  .score.good .bar { background: var(--good); }

  .matrix { width: 100%; border-collapse: separate; border-spacing: 4px; margin: 0 -4px; }
  .matrix th, .matrix td { padding: 0; text-align: center; }
  .matrix thead th { padding: 0 4px 6px; font-size: var(--fs-sm); font-weight: 600; color: var(--muted); vertical-align: bottom; }
  .matrix th:first-child { text-align: left; }
  .matrix tbody th { padding: 6px 12px 6px 4px; font-size: var(--fs-md); font-weight: 600; color: var(--text); line-height: 1.3; }
  .matrix tbody th span { display: block; font-size: var(--fs-sm); font-weight: 400; color: var(--subtle); }
  .cell {
    display: grid; place-items: center; height: 48px; border-radius: 10px; font-size: var(--fs-lg); color: var(--muted);
    background: color-mix(in srgb, var(--signal) calc(var(--strength) * .6), var(--hover));
  }
  .cell.negative { background: color-mix(in srgb, var(--subtle) calc(var(--strength) * .45), var(--hover)); }
  .cell.suggestive, .cell.solid { color: var(--text); font-weight: 600; }
  .cell.expected { outline: 2px solid var(--text); outline-offset: -2px; }
  .heat-key { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 14px 0 0; font-size: var(--fs-xs); color: var(--subtle); }
  .ramp { width: 120px; height: 8px; border-radius: 4px; background: linear-gradient(90deg, color-mix(in srgb, var(--subtle) 45%, var(--hover)), var(--hover), color-mix(in srgb, var(--signal) 60%, var(--hover))); }
  .expected-key { display: inline-flex; align-items: center; gap: 6px; margin-left: 14px; }
  .expected-key i { width: 16px; height: 12px; border-radius: 4px; outline: 2px solid var(--text); outline-offset: -2px; }

  .findings { list-style: none; margin: 22px 0 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .findings li { display: flex; gap: 10px; padding: 14px; border-radius: 12px; background: var(--panel2); border: 1px solid var(--line); }
  .findings li :global(svg) { flex: none; margin-top: 1px; }
  .findings li.good :global(svg) { color: var(--good); }
  .findings li.warn :global(svg) { color: var(--st-serious-text); }
  .findings p { margin: 0; font-size: var(--fs-sm); line-height: 1.5; color: var(--muted); }
  .findings strong { display: block; font-size: var(--fs-base); color: var(--text); }

  .stat-check { display: flex; align-items: center; gap: 22px; margin-top: 10px; padding: 18px 20px; border-radius: 12px; background: var(--good-soft); border: 1px solid var(--good-line); }
  .stat-value { margin: 0; font-size: 34px; font-weight: 500; line-height: 1; color: var(--good); }
  .stat-value span { display: block; margin-top: 6px; font-size: var(--fs-xs); font-weight: 400; color: var(--muted); white-space: nowrap; }
  .stat-check p:not(.stat-value) { margin: 4px 0 0; font-size: var(--fs-base); line-height: 1.5; color: var(--text-2); }

  .bands { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
  .band { display: grid; grid-template-columns: 132px minmax(0, 1fr) 108px 150px; align-items: center; gap: 16px; }
  .band p { margin: 0; }
  .band-name { font-size: var(--fs-md); font-weight: 600; color: var(--text); }
  .band-name span { display: block; font-size: var(--fs-sm); font-weight: 400; color: var(--subtle); }
  .band.solid .bar { background: var(--good); }
  .band.suggestive .bar { background: var(--muted); }
  .tick { position: absolute; top: -5px; bottom: -5px; width: 2px; margin-left: -1px; background: var(--text); box-shadow: 0 0 0 2px var(--panel); }
  .band-score { font-size: var(--fs-lg); font-weight: 500; color: var(--text); }
  .band-score span { display: block; font-size: var(--fs-xs); font-weight: 400; color: var(--subtle); }
  .band-verdict { font-size: var(--fs-sm); font-weight: 500; color: var(--muted); }
  .band.solid .band-verdict { color: var(--good); font-weight: 600; }
  .chart-key { display: flex; flex-wrap: wrap; gap: 8px 22px; margin: 20px 0 0; font-size: var(--fs-sm); color: var(--muted); }
  .chart-key span { display: inline-flex; align-items: center; gap: 8px; }
  .key-bar { width: 22px; height: 8px; border-radius: 4px; background: var(--good); }
  .key-tick { width: 2px; height: 16px; background: var(--text); }
  .note { display: flex; gap: 10px; margin: 18px 0 0; padding: 14px; border-radius: 12px; background: var(--warn-soft); border: 1px solid var(--warn-line); font-size: var(--fs-sm); line-height: 1.5; color: var(--text-2); }
  .note :global(svg) { flex: none; margin-top: 1px; color: var(--warn); }
  .note strong { color: var(--text); }

  .callouts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
  .callout { padding: 22px; border-radius: 16px; background: var(--panel2); border: 1px solid var(--line); }
  .callout.warn { background: var(--warn-soft); border-color: var(--warn-line); }
  .callout p { margin: 8px 0 0; font-size: var(--fs-base); line-height: 1.6; color: var(--text-2); }

  .sources { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 0; padding: 0; list-style: none; }
  .sources li { display: flex; flex-direction: column; padding: 20px; border: 1px solid var(--line); border-radius: 16px; background: var(--panel); }
  .source-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .source-head h3 { font-size: var(--fs-base); line-height: 1.4; }
  .source-head a { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; color: var(--muted); }
  .source-head a:hover { color: var(--signal); background: var(--hover); }
  .sources li > p { margin: 8px 0 14px; font-size: var(--fs-sm); line-height: 1.5; color: var(--muted); }
  .source-foot { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 8px 12px; margin-top: auto; }
  .licence { font-family: var(--mono); font-size: 10.5px; line-height: 1.4; padding: 3px 9px; border-radius: 6px; background: var(--hover); color: var(--muted); }
  .cite { flex: 1 1 100%; }
  .cite summary { font-size: var(--fs-xs); }
  .cite p { margin: 8px 0 0; font-size: var(--fs-xs); line-height: 1.55; color: var(--muted); font-style: italic; }

  .methods { display: grid; gap: 1px; margin: 0; padding: 0; list-style: none; background: var(--line); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
  .methods li { display: grid; grid-template-columns: 1fr auto; gap: 6px 24px; align-items: baseline; padding: 13px 20px; background: var(--panel); }
  .idea { font-size: var(--fs-base); color: var(--text); }
  .methods a { display: inline-flex; align-items: center; gap: 5px; font-size: var(--fs-xs); font-weight: 500; color: var(--muted); text-decoration: none; white-space: nowrap; }
  .methods a:hover { color: var(--signal); text-decoration: underline; }

  .limits { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 0; padding: 0; list-style: none; }
  .limits li { display: flex; gap: 12px; padding: 20px; border-radius: 16px; border: 1px solid var(--line); background: var(--panel); }
  .limits li :global(svg) { flex: none; margin-top: 2px; color: var(--st-serious-text); }
  .limits p { margin: 6px 0 0; font-size: var(--fs-base); line-height: 1.55; color: var(--muted); }

  .final { padding: clamp(72px, 11vh, 120px) 20px; text-align: center; }
  .final h2 { max-width: none; margin: 0 auto; }
  .final p { margin: 12px auto 28px; font-size: 17px; color: var(--text-2); max-width: 52ch; }
  .btn.xl { height: 50px; padding: 0 26px; font-size: var(--fs-md); border-radius: 999px; gap: 9px; }

  footer { border-top: 1px solid var(--line); padding: 32px 0 44px; font-size: var(--fs-xs); color: var(--subtle); text-align: center; }

  @media (max-width: 860px) {
    .verdict, .stat-strip, .callouts, .sources, .limits, .findings { grid-template-columns: 1fr; }
    .methods li { grid-template-columns: 1fr; }
    .panel { padding: 20px 16px; }
    .back span { display: none; }
    .back { padding: 7px; }
    .jump button { padding: 6px 8px; }
    .verdict li { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 14px; padding: 16px; }
    .verdict-icon { grid-row: 1 / 3; margin-bottom: 0; }
    .layer summary { grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; padding: 14px 16px; }
    .layer .level { display: none; }
    .meter i { width: 16px; }
    .layer p { padding-left: 16px; padding-right: 16px; }
    .score { grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; }
    .score .track { grid-area: 2 / 1 / 3 / -1; }
    .score-value { grid-area: 1 / 2; }
    .matrix { border-spacing: 3px; margin: 0 -3px; }
    .matrix thead th { font-size: var(--fs-xs); }
    .matrix tbody th { padding-right: 6px; font-size: var(--fs-base); }
    .matrix tbody th span { display: none; }
    .cell { height: 42px; font-size: var(--fs-base); }
    .stat-check { gap: 16px; padding: 16px; }
    .band { grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; }
    .band-name { grid-area: 1 / 1; }
    .band-name span { display: inline; margin-left: 8px; }
    .band-score { grid-area: 1 / 2; text-align: right; }
    .band-score span { display: inline; margin-left: 8px; }
    .band .track { grid-area: 2 / 1 / 3 / -1; }
    .band-verdict { grid-area: 3 / 1 / 4 / -1; }
  }
  @media (max-width: 520px) {
    .nav-inner { gap: 8px; }
    .brand { font-size: 0; gap: 0; }
    .jump { margin-left: auto; min-width: 0; }
    .back { display: none; }
  }
</style>
