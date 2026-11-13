<script lang="ts">
  import { onMount } from 'svelte';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Brain from '@lucide/svelte/icons/brain';
  import ClipboardList from '@lucide/svelte/icons/clipboard-list';
  import Droplet from '@lucide/svelte/icons/droplet';
  import Play from '@lucide/svelte/icons/play';
  import ScanLine from '@lucide/svelte/icons/scan-line';
  import Stethoscope from '@lucide/svelte/icons/stethoscope';
  import { SCENARIOS, type ScenarioId } from '../../lib/disease/scenarios';
  import { HERO_SPREAD, START_SPOTS, type RegionId } from '../../lib/landing/brainShape';
  import { SIM_FACTS } from '../../lib/landing/facts';
  import { reveal } from '../../lib/landing/reveal';
  import { setDev, ui } from '../../lib/engine.svelte';
  import { go } from '../../lib/router.svelte';
  import { strings } from '../../lib/strings';
  import ThemeToggle from '../ui/ThemeToggle.svelte';
  import BrainArt from './BrainArt.svelte';
  import SilentYears from './SilentYears.svelte';

  const L = strings.landing;
  const D = strings.disease;

  const LOOP_MS = 16000;
  const HOLD = 0.16;
  const REST_PROGRESS = 0.62;

  let progress = $state(REST_PROGRESS);
  let heroEl = $state<HTMLElement>();
  let scroller = $state<HTMLElement>();
  let heroInView = $state(true);
  let selected = $state<RegionId>('hippocampus');
  let chartVisible = $state(false);

  const heroAge = $derived(Math.min(85, Math.floor(50 + Math.min(1, progress) * 25)));
  const heroPhase = $derived.by(() => {
    const a = SIM_FACTS.ages;
    return heroAge >= a.care ? 'care' : heroAge >= a.symptoms ? 'symptoms' : heroAge >= a.biomarker ? 'detectable' : 'silent';
  });
  const names = Object.fromEntries(Object.entries(L.brain.regions).map(([k, v]) => [k, v.name])) as Record<RegionId, string>;
  const region = $derived(L.brain.regions[selected]);
  const FACT_ROWS = (['biomarker', 'network', 'symptoms'] as const).map(k => ({
    key: k, label: L.early.rows[k], age: SIM_FACTS.ages[k], gain: SIM_FACTS.gains[k],
  }));
  const maxGain = Math.max(...FACT_ROWS.map(r => r.gain));
  const DETECT_ICONS = [Droplet, ScanLine, Brain, ClipboardList];

  onMount(() => {
    document.title = L.title;
    scroller?.scrollTo({ top: 0 });
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, start = 0, running = false;
    const tick = (t: number) => {
      if (!start) start = t;
      const phase = ((t - start) % LOOP_MS) / LOOP_MS;
      progress = Math.min(1, phase / (1 - HOLD));
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      heroInView = e.isIntersecting;
      if (still) return;
      if (e.isIntersecting && !running) { running = true; start = 0; raf = requestAnimationFrame(tick); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    });
    if (heroEl) io.observe(heroEl);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  });

  function jump(id: string): void {
    scroller?.querySelector(`#${id}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  const openStory = (scenario?: ScenarioId) => go(scenario ? { page: 'story', scenario } : { page: 'story' });
</script>

<div class="landing" bind:this={scroller}>
  <header class="nav">
    <div class="wrap nav-inner">
      <a class="brand" href="#/" aria-label={L.nav.home}><span class="mark"><Brain size={16} /></span>NeuroSim</a>
      <nav aria-label={L.nav.label}>
        <button type="button" onclick={() => jump('brain')}>{L.nav.brain}</button>
        <button type="button" onclick={() => jump('dementias')}>{L.nav.dementias}</button>
        <button type="button" onclick={() => jump('silent')}>{L.nav.silent}</button>
        <button type="button" onclick={() => jump('detection')}>{L.nav.detection}</button>
        <button type="button" onclick={() => go({ page: 'evidence' })}>{strings.evidence.nav}</button>
        {#if ui.dev}<button type="button" class="lab-link" onclick={() => go({ page: 'lab' })}>{L.hero.lab}</button>{/if}
      </nav>
      <div class="nav-theme"><ThemeToggle /></div>
    </div>
  </header>

  <main>
    <section class="hero" bind:this={heroEl}>
      <p class="eyebrow">{L.hero.eyebrow}</p>
      <h1>{L.hero.heading.pre}<em>{L.hero.heading.em}</em>{L.hero.heading.post}</h1>
      <p class="lede center">{L.hero.body}</p>
      <div class="ctas">
        <button class="btn primary xl" type="button" onclick={() => openStory('alzheimers')}><Play size={16} />{L.hero.cta}</button>
      </div>
      <p class="fine">{L.hero.note}</p>
      <div class="hero-art">
        <BrainArt label={L.hero.art} tau={HERO_SPREAD} {progress} crop />
        <div class="hero-chip" aria-hidden="true">
          <strong class="mono">{L.hero.age(heroAge)}</strong>
          <span class="dot" aria-hidden="true"></span>
          <span class="phase">{D.phases[heroPhase]}</span>
          <span class="dot" aria-hidden="true"></span>
          <span class="tau"><i></i>{L.hero.legend}</span>
        </div>
      </div>
    </section>

    <section class="stats" aria-label={L.stats.source}>
      <div class="wrap">
        <dl class="stat-row">
          {#each L.stats.items as s (s.value)}
            <div><dt>{s.value}</dt><dd>{s.label}</dd></div>
          {/each}
        </dl>
        <p class="source"><a href={L.stats.sourceUrl} target="_blank" rel="noreferrer">{L.stats.source}</a></p>
      </div>
    </section>

    <section id="brain" class="block reveal" use:reveal>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{L.brain.eyebrow}</p>
          <h2>{L.brain.heading}</h2>
          <p class="lede">{L.brain.body}</p>
        </header>
        <div class="explorer">
          <div class="explorer-art">
            <BrainArt label={L.brain.art} variant="lobes" {names} deepLabel={L.brain.deep} {selected} onselect={id => (selected = id)} />
          </div>
          <aside class="explorer-card" aria-live="polite">
            <h3>{region.name}</h3>
            <p>{region.job}</p>
            <p class="label">{region.hit.length ? L.brain.firstHit : L.brain.spared}</p>
            {#if region.hit.length}
              <ul class="chips">{#each region.hit as h (h)}<li>{h}</li>{/each}</ul>
            {/if}
            <div class="region-pills" role="group" aria-label={L.brain.eyebrow}>
              {#each Object.keys(L.brain.regions) as id (id)}
                <button type="button" class:on={selected === id} aria-pressed={selected === id} onclick={() => (selected = id as RegionId)}>{names[id as RegionId]}</button>
              {/each}
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section id="dementias" class="block reveal" use:reveal>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{L.dementias.eyebrow}</p>
          <h2>{L.dementias.heading}</h2>
        </header>
        <div class="cards">
          {#each SCENARIOS as s (s.id)}
            {@const item = L.dementias.items[s.id]}
            <article class="card">
              <div class="card-art"><BrainArt label={L.dementias.art(D.scenarios[s.id].name)} tau={START_SPOTS[s.id]} crop /></div>
              <h3>{D.scenarios[s.id].name}</h3>
              <dl>
                <div><dt>{L.dementias.startsIn}</dt><dd>{item.starts}</dd></div>
                <div><dt>{L.dementias.firstSigns}</dt><dd>{item.signs}</dd></div>
                <div><dt>{L.dementias.howCommon}</dt><dd>{item.common}</dd></div>
              </dl>
              <button class="link" type="button" onclick={() => openStory(s.id)}>{L.dementias.follow}<ArrowRight size={14} /></button>
            </article>
          {/each}
        </div>
      </div>
    </section>

    <section id="silent" class="block reveal" use:reveal={() => (chartVisible = true)}>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{L.silent.eyebrow}</p>
          <h2>{L.silent.heading}</h2>
          <p class="lede">{L.silent.body(SIM_FACTS.ages)}</p>
        </header>
        <div class="panel-card"><SilentYears visible={chartVisible} /></div>
      </div>
    </section>

    <section class="block reveal" use:reveal>
      <div class="wrap split">
        <div>
          <p class="eyebrow">{L.early.eyebrow}</p>
          <h2 class="left">{L.early.heading}</h2>
          <p class="lede">{L.early.body(Math.round(SIM_FACTS.efficacy * 100), SIM_FACTS.gains.biomarker, SIM_FACTS.gains.symptoms)}</p>
          <p class="fine left">{L.early.note}</p>
        </div>
        <figure class="panel-card gains">
          <figcaption>{L.early.chartTitle}</figcaption>
          {#each FACT_ROWS as r, i (r.key)}
            <div class="gain-row">
              <span class="gain-label">{r.label}<small>{L.early.ageAt(r.age)}</small></span>
              <span class="gain-track"><i class:top={i === 0} style:width="{(r.gain / maxGain) * 100}%"></i></span>
              <span class="gain-value mono">{L.early.years(r.gain)}</span>
            </div>
          {/each}
        </figure>
      </div>
    </section>

    <section id="detection" class="block reveal" use:reveal>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{L.detection.eyebrow}</p>
          <h2>{L.detection.heading}</h2>
        </header>
        <div class="detect-grid">
          {#each D.detect.items as item, i (item.name)}
            {@const Icon = DETECT_ICONS[i]}
            <div class="detect-card"><span class="icon"><Icon size={18} /></span><h3>{item.name}</h3><p>{item.text}</p></div>
          {/each}
        </div>
        <div class="signs">
          <div class="signs-list">
            <h3>{L.detection.signsTitle}</h3>
            <ul>{#each L.detection.signs as sign (sign)}<li>{sign}</li>{/each}</ul>
          </div>
          <div class="doctor">
            <span class="icon"><Stethoscope size={20} /></span>
            <h3>{L.detection.doctorTitle}</h3>
            <p>{L.detection.doctor}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="block reveal" use:reveal>
      <div class="wrap">
        <header class="intro">
          <p class="eyebrow">{L.honesty.eyebrow}</p>
          <h2>{L.honesty.heading}</h2>
        </header>
        <div class="honesty">
          {#each L.honesty.columns as c (c.title)}<div><h3>{c.title}</h3><p>{c.text}</p></div>{/each}
        </div>
        <button class="link evidence-link" type="button" onclick={() => go({ page: 'evidence' })}>{L.honesty.link}<ArrowRight size={14} /></button>
      </div>
    </section>

    <section class="final">
      <h2>{L.final.heading}</h2>
      <p>{L.final.body}</p>
      <div class="ctas">
        <button class="btn primary xl" type="button" onclick={() => openStory('alzheimers')}><Play size={16} />{L.hero.cta}</button>
        {#if ui.dev}<button class="btn xl ghost" type="button" onclick={() => go({ page: 'lab' })}>{L.hero.lab}</button>{/if}
      </div>
    </section>
  </main>

  <footer>
    <span class="wordmark">NeuroSim</span>
    <p>{L.footer}</p>
    <button class="footer-link" type="button" onclick={() => go({ page: 'evidence' })}>{strings.evidence.nav}</button>
    <button class="dev-toggle" type="button" aria-pressed={ui.dev} onclick={() => setDev(!ui.dev)}>
      {ui.dev ? L.dev.disable : L.dev.enable}
    </button>
  </footer>

  {#if !heroInView}
    <div class="float-cta">
      <span>{L.hero.floatHint}</span>
      <button class="btn primary" type="button" onclick={() => openStory('alzheimers')}><Play size={14} />{L.hero.cta}</button>
    </div>
  {/if}
</div>

<style>
  .landing { height: 100%; overflow-y: auto; background: var(--paper); }
  .wrap { width: min(1080px, 100% - 40px); margin: 0 auto; }

  .nav { position: sticky; top: 0; z-index: 10; background: color-mix(in srgb, var(--paper) 86%, transparent); backdrop-filter: blur(12px); }
  .nav-inner { display: flex; align-items: center; height: 60px; }
  .brand { display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: var(--fs-md); letter-spacing: -.01em; color: var(--text); text-decoration: none; }
  .mark { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; background: var(--text); color: var(--paper); }
  nav { display: flex; gap: 2px; margin-left: auto; }
  .nav-theme { margin-left: 14px; }
  nav button { border: 0; background: none; font: inherit; font-size: var(--fs-sm); font-weight: 500; color: var(--muted); padding: 6px 11px; border-radius: 999px; cursor: pointer; }
  nav button:hover { color: var(--text); }
  .lab-link { color: var(--text-2); }

  .eyebrow { margin: 0 0 14px; font-size: var(--fs-xs); font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--subtle); }
  h1 {
    margin: 0; font-family: var(--display); font-size: clamp(40px, 5.6vw, 72px); font-weight: 500;
    line-height: 1.04; letter-spacing: -.015em; color: var(--text); max-width: 17ch;
  }
  h1 em {
    font-style: normal;
    background: linear-gradient(100deg, var(--ember-a), var(--ember-b));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  h2 {
    margin: 0 auto; font-family: var(--display); font-size: clamp(28px, 3.4vw, 42px); font-weight: 500;
    line-height: 1.12; letter-spacing: -.01em; color: var(--text); max-width: 24ch;
  }
  h2.left { margin: 0; }
  h3 { margin: 0; font-size: var(--fs-lg); font-weight: 600; color: var(--text); }
  .lede { margin: 18px auto 0; font-size: 17px; line-height: 1.65; color: var(--text-2); max-width: 56ch; }
  .lede.center { text-align: center; }
  .fine { margin: 16px 0 0; font-size: var(--fs-sm); color: var(--subtle); }
  .fine.left { text-align: left; }
  .intro { text-align: center; margin-bottom: 52px; }
  .intro .lede { max-width: 62ch; }

  .btn.xl { height: 50px; padding: 0 26px; font-size: var(--fs-md); border-radius: 999px; gap: 9px; }
  .btn.primary { background: linear-gradient(180deg, #2f6ced, #1d4ed8); border-color: #1d4ed8; }
  .btn.primary:hover { background: linear-gradient(180deg, #2563eb, #1a45c2); }
  .btn.ghost { background: transparent; border-color: var(--line-strong); box-shadow: none; color: var(--text-2); }
  .ctas { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; justify-content: center; }

  .hero { color-scheme: inherit; display: flex; flex-direction: column; align-items: center; text-align: center; padding: clamp(48px, 9vh, 96px) 20px 0; }
  .hero .fine { margin-top: 18px; }
  .hero-art { position: relative; width: min(680px, 92vw); margin-top: 22px; }
  .hero-art::before {
    content: ''; position: absolute; left: 50%; bottom: 2%; transform: translateX(-50%);
    width: 72%; height: 36px; border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(60, 50, 40, .14), transparent 68%);
  }
  .hero > .eyebrow, .hero h1, .hero .lede, .hero .ctas, .hero .fine, .hero-art { animation: rise .7s cubic-bezier(.2, .7, .2, 1) both; }
  .hero h1 { animation-delay: .06s; }
  .hero .lede { animation-delay: .14s; }
  .hero .ctas { animation-delay: .22s; }
  .hero .fine { animation-delay: .3s; }
  .hero-art { animation-delay: .34s; }
  @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .hero > *, .hero-art { animation: none !important; } }
  .hero-chip {
    position: absolute; left: 50%; bottom: 4%; transform: translateX(-50%);
    display: flex; align-items: center; gap: 12px; padding: 9px 18px; white-space: nowrap;
    background: var(--panel); border: 1px solid var(--line); border-radius: 999px; font-size: var(--fs-sm);
  }
  .hero-chip strong { font-size: var(--fs-md); font-weight: 600; min-width: 64px; text-align: left; }
  .hero-chip .phase { color: var(--text-2); font-weight: 500; min-width: 76px; text-align: left; }
  .hero-chip .dot { width: 3px; height: 3px; border-radius: 50%; background: var(--line-strong); }
  .hero-chip .tau { display: flex; align-items: center; gap: 7px; color: var(--muted); }
  .hero-chip .tau i { width: 9px; height: 9px; border-radius: 50%; background: var(--series-tau); }

  .stats { margin-top: 72px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 44px 0 30px; }
  .stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin: 0; text-align: center; }
  .stat-row dt { font-family: var(--display); font-size: clamp(26px, 3vw, 38px); font-weight: 500; letter-spacing: -.01em; color: var(--text); }
  .stat-row dd { margin: 6px auto 0; font-size: var(--fs-base); color: var(--muted); max-width: 30ch; }
  .source { margin: 26px 0 0; text-align: center; font-size: var(--fs-xs); }
  .source a { color: var(--subtle); }

  .block { padding: clamp(80px, 11vh, 128px) 0 0; }
  .block:last-of-type { padding-bottom: 0; }
  .reveal { opacity: 0; transform: translateY(16px); transition: opacity .5s ease, transform .5s ease; }
  :global(.reveal.in) { opacity: 1 !important; transform: none !important; }
  @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } }

  .explorer { display: grid; grid-template-columns: 1.35fr 1fr; gap: 48px; align-items: center; }
  .explorer-card { padding: 28px; border: 1px solid var(--line); border-radius: 18px; background: var(--panel); }
  .explorer-card p { margin: 8px 0 0; font-size: var(--fs-md); line-height: 1.6; color: var(--text-2); }
  .explorer-card .label { margin-top: 20px; font-size: var(--fs-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: var(--subtle); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; padding: 0; list-style: none; }
  .chips li { padding: 4px 11px; border-radius: 999px; font-size: var(--fs-sm); font-weight: 500; color: var(--st-serious-text); background: var(--st-serious-soft); border: 1px solid var(--st-serious-line); }
  .region-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--line); }
  .region-pills button { padding: 4px 11px; border: 1px solid var(--line); border-radius: 999px; background: transparent; font: inherit; font-size: var(--fs-sm); color: var(--muted); cursor: pointer; transition: border-color .12s, color .12s; }
  .region-pills button:hover { color: var(--text); border-color: var(--line-strong); }
  .region-pills button.on { color: var(--signal); border-color: var(--signal); background: var(--panel); }

  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .card { display: flex; flex-direction: column; padding: 22px; border: 1px solid var(--line); border-radius: 18px; background: var(--panel); transition: transform .18s ease, border-color .18s ease; }
  .card:hover { transform: translateY(-3px); border-color: var(--line-strong); }
  .card-art { margin: -6px -6px 12px; padding: 10px; border-radius: 12px; background: var(--paper); }
  .card dl { display: grid; gap: 11px; margin: 12px 0 18px; }
  .card dt { font-size: var(--fs-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--subtle); }
  .card dd { margin: 2px 0 0; font-size: var(--fs-base); line-height: 1.55; color: var(--text-2); }
  .link { display: inline-flex; align-items: center; gap: 6px; margin-top: auto; padding: 0; border: 0; background: none; font: inherit; font-size: var(--fs-base); font-weight: 600; color: var(--signal); cursor: pointer; align-self: flex-start; }
  .link:hover { gap: 9px; }

  .panel-card { padding: 30px 32px; border: 1px solid var(--line); border-radius: 18px; background: var(--panel); }
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
  .split .lede { margin-left: 0; }
  .gains { margin: 0; display: grid; gap: 15px; }
  .gains figcaption { font-size: var(--fs-md); font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .gain-row { display: grid; grid-template-columns: 150px 1fr 76px; align-items: center; gap: 14px; }
  .gain-label { display: grid; font-size: var(--fs-base); font-weight: 500; color: var(--text); }
  .gain-label small { font-size: var(--fs-xs); font-weight: 400; color: var(--muted); }
  .gain-track { height: 16px; border-radius: 5px; background: var(--hover); overflow: hidden; }
  .gain-track i { display: block; height: 100%; border-radius: 0 5px 5px 0; background: color-mix(in srgb, var(--signal) 45%, var(--panel)); }
  .gain-track i.top { background: var(--signal); }
  .gain-value { text-align: right; font-size: var(--fs-md); color: var(--text); }

  .detect-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .detect-card { padding: 22px; border: 1px solid var(--line); border-radius: 18px; background: var(--panel); }
  .detect-card p { margin: 6px 0 0; font-size: var(--fs-base); line-height: 1.55; color: var(--muted); }
  .icon { display: grid; place-items: center; width: 36px; height: 36px; margin-bottom: 14px; border-radius: 10px; color: var(--signal); background: var(--signal-soft); }
  .signs { display: grid; grid-template-columns: 1.35fr 1fr; gap: 18px; margin-top: 18px; }
  .signs-list { padding: 22px 26px; border: 1px solid var(--line); border-radius: 18px; background: var(--panel); }
  .signs ul { margin: 12px 0 0; padding-left: 20px; display: grid; gap: 8px; font-size: var(--fs-md); line-height: 1.55; color: var(--text-2); }
  .doctor { padding: 24px 26px; border-radius: 18px; background: var(--good-soft); border: 1px solid var(--good-line); }
  .doctor .icon { color: var(--good); background: var(--panel); }
  .doctor p { margin: 8px 0 0; font-size: var(--fs-md); line-height: 1.6; color: var(--text-2); }

  .honesty { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .honesty div { padding: 24px; border: 1px solid var(--line); border-top-width: 3px; background: var(--panel); border-radius: 18px; }
  .honesty div:nth-child(1) { border-top-color: var(--good); }
  .honesty div:nth-child(2) { border-top-color: var(--signal); }
  .honesty div:nth-child(3) { border-top-color: var(--bad); }
  .honesty p { margin: 8px 0 0; font-size: var(--fs-md); line-height: 1.6; color: var(--text-2); }

  .final { padding: clamp(96px, 14vh, 150px) 20px; text-align: center; }
  .final h2 { max-width: none; }
  .final p { margin: 14px auto 0; font-size: 17px; color: var(--text-2); }

  footer { border-top: 1px solid var(--line); padding: 44px 20px 56px; text-align: center; }
  .wordmark { font-family: var(--display); font-size: 22px; font-weight: 500; color: var(--text); }
  footer p { margin: 12px auto 0; font-size: var(--fs-xs); color: var(--subtle); max-width: 70ch; }
  .evidence-link { margin-top: 22px; font-size: var(--fs-md); }
  .footer-link { margin: 14px 8px 0; padding: 4px 12px; border: 1px solid var(--line); border-radius: 999px; background: none; font: inherit; font-size: var(--fs-xs); color: var(--muted); cursor: pointer; }
  .footer-link:hover { color: var(--text); border-color: var(--line-strong); }
  .dev-toggle { margin-top: 18px; padding: 4px 12px; border: 1px solid var(--line); border-radius: 999px; background: none; font: inherit; font-size: var(--fs-xs); color: var(--subtle); cursor: pointer; }
  .dev-toggle:hover { color: var(--text-2); border-color: var(--line-strong); }

  .float-cta {
    position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 20;
    display: flex; align-items: center; gap: 14px; padding: 8px 10px 8px 20px;
    background: color-mix(in srgb, var(--panel) 92%, transparent); backdrop-filter: blur(10px);
    border: 1px solid var(--line); border-radius: 999px; box-shadow: 0 10px 30px rgba(15, 23, 42, .12);
    font-size: var(--fs-sm); color: var(--muted); white-space: nowrap;
    animation: pill-rise .25s ease-out;
  }
  .float-cta .btn { border-radius: 999px; }
  @keyframes pill-rise { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
  @media (prefers-reduced-motion: reduce) { .float-cta { animation: none; } }

  @media (max-width: 960px) {
    .explorer, .split, .signs { grid-template-columns: 1fr; }
    .cards, .honesty { grid-template-columns: 1fr; }
    .detect-grid { grid-template-columns: 1fr 1fr; }
    .split { gap: 32px; }
  }
  @media (max-width: 720px) {
    nav button:not(.lab-link) { display: none; }
    .stat-row { grid-template-columns: 1fr; gap: 22px; }
    .detect-grid { grid-template-columns: 1fr; }
    .gain-row { grid-template-columns: 108px 1fr 64px; }
    .float-cta span { display: none; }
    .float-cta { padding: 8px 10px; }
  }
</style>
