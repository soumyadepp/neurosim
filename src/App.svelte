<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Brain from '@lucide/svelte/icons/brain';
  import AppHeader from './components/AppHeader.svelte';
  import Viewport from './components/Viewport.svelte';
  import SidePanel from './components/SidePanel.svelte';
  import Landing from './components/landing/Landing.svelte';
  import Evidence from './components/landing/Evidence.svelte';
  import { enterDisease, leaveDisease } from './lib/disease.svelte';
  import { ensureBooted, ui } from './lib/engine.svelte';
  import { nav, startRouter } from './lib/router.svelte';
  import { strings } from './lib/strings';

  const LANDING_BOOT_DELAY_MS = 1500;

  onMount(() => {
    const stop = startRouter();
    const timer = setTimeout(ensureBooted, nav.route.page === 'story' || nav.route.page === 'lab' ? 0 : LANDING_BOOT_DELAY_MS);
    return () => { stop(); clearTimeout(timer); };
  });

  $effect(() => {
    if (nav.route.page === 'story' || nav.route.page === 'lab') { void ensureBooted(); document.title = strings.hud.title; }
  });

  $effect(() => {
    const active = ui.ready && ui.mode === 'story' && nav.route.page === 'story';
    if (!active) return;
    untrack(enterDisease);
    return () => untrack(leaveDisease);
  });
</script>

{#if nav.route.page === 'landing'}
  <Landing />
{:else if nav.route.page === 'evidence'}
  <Evidence />
{:else if ui.ready}
  <div class="shell">
    <AppHeader />
    <main class:solo={!ui.dev}>
      <Viewport />
      {#if ui.dev}<SidePanel />{/if}
    </main>
  </div>
{:else}
  <div class="boot" role="status" aria-live="polite">
    <span class="mark"><Brain size={22} /></span>
    <h1>{strings.boot.title}</h1>
    <p>{ui.dataSource === 'procedural' ? strings.boot.procedural : strings.boot.atlas}</p>
    <div class="bar"><i></i></div>
  </div>
{/if}

<style>
  .shell {
    display: grid;
    grid-template-rows: auto 1fr;
    height: 100%;
    min-height: 0;
  }
  main {
    display: grid;
    grid-template-columns: 1fr 400px;
    min-height: 0;
  }
  main.solo { grid-template-columns: 1fr; }
  .boot {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--scene);
    text-align: center;
    padding: 16px;
  }
  .mark { display: grid; place-items: center; width: 44px; height: 44px; border-radius: var(--r-lg); background: var(--text); color: var(--paper); margin-bottom: 6px; }
  h1 { margin: 0; font-size: var(--fs-lg); font-weight: 600; }
  p { margin: 0; color: var(--muted); max-width: 44ch; }
  .bar { width: 200px; height: 3px; margin-top: 12px; background: var(--line); border-radius: 2px; overflow: hidden; }
  .bar i { display: block; width: 40%; height: 100%; background: var(--signal); animation: slide 1.2s ease-in-out infinite; }
  @keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
  @media (prefers-reduced-motion: reduce) { .bar i { animation: none; width: 100%; } }
  @media (max-width: 860px) {
    main {
      grid-template-columns: 1fr;
      grid-template-rows: 52vh 1fr;
    }
    main.solo {
      grid-template-rows: 1fr;
    }
  }
</style>
