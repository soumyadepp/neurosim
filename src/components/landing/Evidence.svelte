<script lang="ts">
  import { onMount } from 'svelte';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Brain from '@lucide/svelte/icons/brain';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Play from '@lucide/svelte/icons/play';
  import { bandVerdict } from '../../lib/landing/bands';
  import { EVIDENCE_FACTS } from '../../lib/landing/facts';
  import { reveal } from '../../lib/landing/reveal';
  import { go } from '../../lib/router.svelte';
  import { strings } from '../../lib/strings';
  import ThemeToggle from '../ui/ThemeToggle.svelte';

  const E = strings.evidence;
  const F = EVIDENCE_FACTS;

  const SCORE_VALUES = [F.modelR, F.connectomeR, F.braakRho, F.parkinsons.r];
  const scores = E.scores.map((s, i) => ({ ...s, value: SCORE_VALUES[i] }));
  const M = E.meg;
  const bands = F.meg.bands.map((id, i) => ({
    ...M.bands[id],
    score: F.meg.r[i],
    chance: F.meg.nullMean[i],
    verdict: bandVerdict(F.meg.p[i], F.meg.bands.length),
  }));
  const stats = [
    { value: String(F.regions), label: E.stats.regions },
    { value: String(F.receptors), label: E.stats.receptors },
    { value: String(E.datasets.length), label: E.stats.sources },
  ];

  let scroller = $state<HTMLElement>();

  onMount(() => {
    document.title = E.title;
    scroller?.scrollTo({ top: 0 });
  });
</script>

<div class="evidence" bind:this={scroller}>
  <header class="nav">
    <div class="wrap nav-inner">
      <a class="brand" href="#/"><span class="mark"><Brain size={16} /></span>NeuroSim</a>
      <button class="back" type="button" onclick={() => go({ page: 'landing' })}><ArrowLeft size={14} />{E.back}</button>
      <ThemeToggle />
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="wrap">
        <p class="eyebrow">{E.eyebrow}</p>
        <h1>{E.heading}</h1>
        <p class="lede">{E.lede}</p>
      </div>
    </section>

    <section class="block">
      <div class="wrap">
        <p class="eyebrow">{E.verdictEyebrow}</p>
        <ul class="verdict">
          {#each E.verdict as v (v.strong)}
            <li><strong>{v.strong}</strong> {v.text}</li>
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
        </header>
        <ol class="ladder">
          {#each E.ladder as row, i (row.name)}
            <li>
              <span class="tier">{i + 1}</span>
              <div class="ladder-body">
                <div class="ladder-head">
                  <h3>{row.name}</h3>
                  <span class="level {row.level}">{E.levels[row.level as keyof typeof E.levels]}</span>
                </div>
                <p class="what">{row.what}</p>
                <p class="why">{row.why}</p>
              </div>
            </li>
          {/each}
        </ol>
      </div>
    </section>

    <section class="block reveal" use:reveal>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{E.scoreEyebrow}</p>
          <h2>{E.scoreHeading}</h2>
          <p class="lede">{E.scoreIntro}</p>
        </header>
        <div class="scores">
          {#each scores as s (s.check)}
            <article class="score" class:warn={s.tone === 'warn'} class:good={s.tone === 'good'}>
              <p class="check">{s.check}</p>
              <p class="value mono">{s.value.toFixed(2)}</p>
              <p class="meaning">{s.meaning}</p>
            </article>
          {/each}
        </div>
        <p class="fine">{E.scoreNote}</p>
        <p class="fine">{E.parkinsonsCaveat}</p>
        <div class="meg">
          <p class="eyebrow">{M.eyebrow}</p>
          <h3>{M.heading}</h3>
          <p class="meg-intro">{M.intro}</p>
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
          <p class="meg-legend">
            <span><i class="key-bar"></i>{M.legend.score}</span>
            <span><i class="key-tick"></i>{M.legend.chance}</span>
          </p>
          <div class="callout warn">
            <h3>{M.catchTitle}</h3>
            <p>{M.catch}</p>
          </div>
          <p class="fine">{M.scope}</p>
          <p class="fine">{M.method(F.meg.spins.toLocaleString('en'))}</p>
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

    <section class="block reveal" use:reveal>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{E.dataEyebrow}</p>
          <h2>{E.dataHeading}</h2>
          <p class="lede">{E.dataIntro}</p>
        </header>
        <div class="datasets">
          {#each E.datasets as d (d.name)}
            <article class="dataset">
              <h3>{d.name}</h3>
              <p class="what">{d.what}</p>
              <p class="cite">{d.citation}</p>
              <div class="meta">
                <span class="licence">{d.licence}</span>
                <a href={d.url} target="_blank" rel="noreferrer">{E.visit}<ExternalLink size={12} /></a>
              </div>
            </article>
          {/each}
        </div>
        <p class="fine">{E.hcpNote}</p>
      </div>
    </section>

    <section class="block reveal" use:reveal>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{E.methodEyebrow}</p>
          <h2>{E.methodHeading}</h2>
        </header>
        <ul class="methods">
          {#each E.methods as m (m.citation)}
            <li>
              <span class="idea">{m.idea}</span>
              <a href={m.url} target="_blank" rel="noreferrer">{m.citation}<ExternalLink size={11} /></a>
            </li>
          {/each}
        </ul>
      </div>
    </section>

    <section class="block reveal" use:reveal>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{E.limitsEyebrow}</p>
          <h2>{E.limitsHeading}</h2>
        </header>
        <div class="limits">
          {#each E.limits as l (l.name)}
            <article><h3>{l.name}</h3><p>{l.text}</p></article>
          {/each}
        </div>
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
  .nav-inner { display: flex; align-items: center; gap: 18px; height: 60px; }
  .brand { display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: var(--fs-md); color: var(--text); text-decoration: none; }
  .mark { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; background: var(--text); color: var(--paper); }
  .back { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; background: none; font: inherit; font-size: var(--fs-sm); color: var(--muted); cursor: pointer; }
  .back:hover { color: var(--text); border-color: var(--line-strong); }

  .eyebrow { margin: 0 0 12px; font-size: var(--fs-xs); font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--subtle); }
  h1 { margin: 0; font-family: var(--display); font-size: clamp(34px, 4.6vw, 54px); font-weight: 500; line-height: 1.06; letter-spacing: -.015em; color: var(--text); max-width: 18ch; }
  h2 { margin: 0; font-family: var(--display); font-size: clamp(24px, 3vw, 34px); font-weight: 500; line-height: 1.15; color: var(--text); max-width: 24ch; }
  h3 { margin: 0; font-size: var(--fs-md); font-weight: 600; color: var(--text); }
  .lede { margin: 18px 0 0; font-size: 17px; line-height: 1.65; color: var(--text-2); max-width: 62ch; }
  .fine { margin: 16px 0 0; font-size: var(--fs-xs); line-height: 1.6; color: var(--subtle); max-width: 76ch; }
  .intro { margin-bottom: 34px; }

  .hero { padding: clamp(40px, 7vh, 72px) 0 0; }
  .block { padding: clamp(56px, 8vh, 88px) 0 0; }
  .reveal { opacity: 0; transform: translateY(14px); transition: opacity .5s ease, transform .5s ease; }
  :global(.reveal.in) { opacity: 1 !important; transform: none !important; }
  @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } }

  .verdict { display: grid; gap: 14px; margin: 0; padding: 0; list-style: none; }
  .verdict li { padding-left: 18px; border-left: 2px solid var(--line-strong); font-size: var(--fs-md); line-height: 1.6; color: var(--text-2); max-width: 74ch; }
  .verdict strong { color: var(--text); font-weight: 600; }

  .stat-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin: 32px 0 0; background: var(--line); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
  .stat-strip div { padding: 18px 20px; background: var(--panel); }
  .stat-strip dt { font-family: var(--display); font-size: 30px; font-weight: 500; color: var(--text); line-height: 1; }
  .stat-strip dd { margin: 8px 0 0; font-size: var(--fs-sm); color: var(--muted); line-height: 1.4; }
  .stat-strip .wide dt { color: var(--subtle); }

  .ladder { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; counter-reset: tier; }
  .ladder li { display: flex; gap: 18px; padding: 20px 22px; background: var(--panel); border: 1px solid var(--line); }
  .ladder li:first-child { border-radius: 16px 16px 0 0; }
  .ladder li:last-child { border-radius: 0 0 16px 16px; }
  .tier { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--hover); font-family: var(--mono); font-size: var(--fs-sm); color: var(--muted); }
  .ladder-body { min-width: 0; }
  .ladder-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .level { font-size: var(--fs-xs); font-weight: 600; padding: 2px 10px; border-radius: 999px; }
  .level.high { color: var(--good); background: var(--good-soft); border: 1px solid var(--good-line); }
  .level.moderate { color: var(--signal); background: var(--signal-soft); border: 1px solid var(--signal-line); }
  .level.low { color: var(--st-serious-text); background: var(--st-serious-soft); border: 1px solid var(--st-serious-line); }
  .what { margin: 8px 0 0; font-size: var(--fs-base); line-height: 1.55; color: var(--text-2); }
  .why { margin: 6px 0 0; font-size: var(--fs-sm); line-height: 1.55; color: var(--muted); }

  .scores { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .score { padding: 22px; border: 1px solid var(--line); border-radius: 16px; background: var(--panel); }
  .score.warn { border-color: var(--st-serious-line); background: var(--st-serious-soft); }
  .score.good { border-color: var(--good-line); background: var(--good-soft); }
  .score.good .value { color: var(--good); }
  .check { margin: 0; font-size: var(--fs-sm); font-weight: 600; color: var(--text); line-height: 1.4; min-height: 2.8em; }
  .value { margin: 10px 0 12px; font-size: 40px; font-weight: 500; letter-spacing: -.02em; color: var(--text); line-height: 1; }
  .score.warn .value { color: var(--st-serious-text); }
  .meaning { margin: 0; font-size: var(--fs-sm); line-height: 1.6; color: var(--muted); }

  .meg { margin-top: 28px; padding: 26px; border: 1px solid var(--line); border-radius: 16px; background: var(--panel); }
  .meg > h3 { margin: 6px 0 10px; font-family: var(--display); font-size: 24px; font-weight: 500; letter-spacing: -.01em; line-height: 1.2; }
  .meg-intro { margin: 0 0 22px; max-width: 68ch; font-size: var(--fs-md); line-height: 1.65; color: var(--muted); }
  .bands { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
  .band { display: grid; grid-template-columns: 132px minmax(0, 1fr) 108px 150px; align-items: center; gap: 16px; }
  .band p { margin: 0; }
  .band-name { font-size: var(--fs-md); font-weight: 600; color: var(--text); }
  .band-name span { display: block; font-size: var(--fs-sm); font-weight: 400; color: var(--subtle); }
  .track { position: relative; height: 12px; border-radius: 6px; background: var(--hover); }
  .bar { position: absolute; inset: 0 auto 0 0; border-radius: 6px; background: var(--subtle); }
  .band.solid .bar { background: var(--good); }
  .band.suggestive .bar { background: var(--muted); }
  .tick { position: absolute; top: -5px; bottom: -5px; width: 2px; margin-left: -1px; background: var(--text); box-shadow: 0 0 0 2px var(--panel); }
  .band-score { font-size: var(--fs-lg); font-weight: 500; color: var(--text); }
  .band-score span { display: block; font-size: var(--fs-xs); font-weight: 400; color: var(--subtle); }
  .band-verdict { font-size: var(--fs-sm); font-weight: 500; color: var(--muted); }
  .band.solid .band-verdict { color: var(--good); font-weight: 600; }
  .meg-legend { display: flex; flex-wrap: wrap; gap: 8px 22px; margin: 20px 0 22px; font-size: var(--fs-sm); color: var(--muted); }
  .meg-legend span { display: inline-flex; align-items: center; gap: 8px; }
  .key-bar { width: 22px; height: 8px; border-radius: 4px; background: var(--good); }
  .key-tick { width: 2px; height: 16px; background: var(--text); }
  .meg .fine { margin-top: 14px; }

  .callouts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 28px; }
  .callout { padding: 24px; border-radius: 16px; background: var(--panel2); border: 1px solid var(--line); }
  .callout.warn { background: var(--warn-soft); border-color: var(--warn-line); }
  .callout p { margin: 10px 0 0; font-size: var(--fs-base); line-height: 1.65; color: var(--text-2); }

  .datasets { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .dataset { padding: 22px; border: 1px solid var(--line); border-radius: 16px; background: var(--panel); display: flex; flex-direction: column; }
  .dataset h3 { font-size: var(--fs-base); line-height: 1.4; }
  .dataset .what { margin: 10px 0 0; }
  .cite { margin: 12px 0 0; font-size: var(--fs-xs); line-height: 1.55; color: var(--muted); font-style: italic; }
  .meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: auto; padding-top: 14px; }
  .licence { font-family: var(--mono); font-size: 10.5px; line-height: 1.4; padding: 3px 9px; border-radius: 6px; background: var(--hover); color: var(--muted); }
  .meta a, .methods a { display: inline-flex; align-items: center; gap: 5px; font-size: var(--fs-sm); font-weight: 500; color: var(--signal); text-decoration: none; }
  .meta a:hover, .methods a:hover { text-decoration: underline; }

  .methods { display: grid; gap: 1px; margin: 0; padding: 0; list-style: none; background: var(--line); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
  .methods li { display: grid; grid-template-columns: 1fr auto; gap: 10px 24px; align-items: baseline; padding: 14px 20px; background: var(--panel); }
  .idea { font-size: var(--fs-base); color: var(--text); }
  .methods a { font-size: var(--fs-xs); color: var(--muted); white-space: nowrap; }
  .methods a:hover { color: var(--signal); }

  .limits { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .limits article { padding: 22px; border-radius: 16px; border: 1px solid var(--line); background: var(--panel); }
  .limits p { margin: 8px 0 0; font-size: var(--fs-base); line-height: 1.6; color: var(--text-2); }

  .final { padding: clamp(72px, 11vh, 120px) 20px; text-align: center; }
  .final h2 { max-width: none; margin: 0 auto; }
  .final p { margin: 12px auto 28px; font-size: 17px; color: var(--text-2); max-width: 52ch; }
  .btn.xl { height: 50px; padding: 0 26px; font-size: var(--fs-md); border-radius: 999px; gap: 9px; }

  footer { border-top: 1px solid var(--line); padding: 32px 0 44px; font-size: var(--fs-xs); color: var(--subtle); text-align: center; }

  @media (max-width: 860px) {
    .stat-strip, .scores, .callouts, .datasets, .limits { grid-template-columns: 1fr; }
    .methods li { grid-template-columns: 1fr; }
    .check { min-height: 0; }
    .meg { padding: 20px 16px; }
    .band { grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; }
    .band-name { grid-area: 1 / 1; }
    .band-name span { display: inline; margin-left: 8px; }
    .band-score { grid-area: 1 / 2; text-align: right; }
    .band-score span { display: inline; margin-left: 8px; }
    .track { grid-area: 2 / 1 / 3 / -1; }
    .band-verdict { grid-area: 3 / 1 / 4 / -1; }
  }
</style>
