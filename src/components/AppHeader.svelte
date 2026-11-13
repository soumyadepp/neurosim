<script lang="ts">
  import Brain from '@lucide/svelte/icons/brain';
  import { brain, ui, type AppMode } from '../lib/engine.svelte';
  import { go } from '../lib/router.svelte';
  import { strings } from '../lib/strings';
  import Segmented from './ui/Segmented.svelte';
  import ThemeToggle from './ui/ThemeToggle.svelte';

  const h = strings.hud;
  const m = strings.mode;
  const TONE = { quiet: 'quiet', normal: 'good', hyperactive: 'warn', 'seizure-like': 'bad' } as const;
  const MODES: { value: AppMode; label: string; title: string }[] = [
    { value: 'story', label: m.story, title: m.storyTitle },
    { value: 'lab', label: m.lab, title: m.labTitle },
  ];

  let network = $derived(ui.hud.network);
</script>

<header>
  <a class="brand" href="#/" aria-label={strings.landing.nav.home}>
    <span class="mark"><Brain size={18} strokeWidth={2} /></span>
    <span class="name">{h.title}</span>
  </a>

  <div class="mode">
    {#if ui.dev}
      <Segmented label={m.label} options={MODES} value={ui.mode} onchange={mode => go({ page: mode })} />
    {/if}
  </div>

  <div class="right">
  {#if ui.mode === 'lab'}
    <dl class="stats">
      <div class="stat">
        <dt>{h.stats.state}</dt>
        <dd class="state {network ? TONE[network.label] : 'quiet'}"><i></i>{network?.label ?? h.warmingUp}</dd>
      </div>
      <div class="stat">
        <dt>{h.stats.rate}</dt>
        <dd class="mono">{h.rateValue(network?.hz ?? 0)}</dd>
      </div>
      <div class="stat">
        <dt>{h.stats.alive}</dt>
        <dd class="mono">{h.aliveValue(ui.hud.alive, brain.n)}</dd>
      </div>
    </dl>
  {:else}
    <span class="source">{ui.dev ? (ui.dataSource === 'atlas' ? strings.source.atlas : strings.source.procedural) : strings.source.product}</span>
  {/if}
  <ThemeToggle />
  </div>
</header>

<style>
  header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 24px;
    height: calc(52px + env(safe-area-inset-top, 0px));
    padding: env(safe-area-inset-top, 0px) 16px 0;
    background: var(--paper);
    border-bottom: 1px solid var(--line);
    min-width: 0;
  }
  .brand { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; justify-self: start; }
  .mark {
    display: grid; place-items: center; width: 28px; height: 28px; border-radius: var(--r-md);
    background: var(--text); color: var(--paper);
  }
  .name { font-size: var(--fs-lg); font-weight: 600; letter-spacing: -.01em; }
  .mode { width: 200px; }
  .right { justify-self: end; display: flex; align-items: center; gap: 16px; min-width: 0; }
  .source { justify-self: end; font-size: var(--fs-sm); color: var(--subtle); white-space: nowrap; }
  .stats { display: flex; margin: 0; min-width: 0; }
  .stat { padding: 0 14px; border-left: 1px solid var(--line); }
  .stat:first-child { border-left: 0; }
  dt { font-size: var(--fs-xs); color: var(--subtle); font-weight: 500; }
  dd { margin: 0; font-size: var(--fs-base); font-weight: 500; color: var(--text); white-space: nowrap; }
  .state { display: flex; align-items: center; gap: 6px; text-transform: capitalize; }
  .state i { width: 8px; height: 8px; border-radius: 50%; background: var(--subtle); }
  .state.good { color: var(--good); }
  .state.good i { background: var(--good); box-shadow: 0 0 0 3px var(--good-soft); }
  .state.warn { color: var(--warn); }
  .state.warn i { background: var(--warn); box-shadow: 0 0 0 3px var(--warn-soft); }
  .state.bad { color: var(--bad); }
  .state.bad i { background: var(--bad); box-shadow: 0 0 0 3px var(--harm-soft); }

  @media (max-width: 1100px) {
    .source { display: none; }
    .stats .stat:nth-child(n + 2) { display: none; }
  }
  @media (max-width: 640px) {
    header { grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; padding: 0 12px; }
    .mode { width: auto; justify-self: center; }
    .stats, .source { display: none; }
  }
</style>
