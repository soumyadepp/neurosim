<script lang="ts">
  import type { Component } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import Droplet from '@lucide/svelte/icons/droplet';
  import FastForward from '@lucide/svelte/icons/fast-forward';
  import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
  import Hourglass from '@lucide/svelte/icons/hourglass';
  import Pill from '@lucide/svelte/icons/pill';
  import { START_AGE, course, disease, endTour, nextTourStep, tour } from '../../lib/disease.svelte';
  import { TOUR_STEPS, type TourStep } from '../../lib/disease/tour';
  import { strings } from '../../lib/strings';

  const t = strings.disease.tour;
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = still ? 0 : 260;

  const STEP_ART: Record<TourStep, { icon: Component<{ size?: number }>; tone: string }> = {
    start: { icon: Hourglass, tone: 'calm' },
    biomarker: { icon: Droplet, tone: 'signal' },
    symptoms: { icon: CircleAlert, tone: 'warn' },
    care: { icon: HeartHandshake, tone: 'harm' },
    treat: { icon: Pill, tone: 'good' },
  };

  const index = $derived(tour.step ? TOUR_STEPS.indexOf(tour.step) : -1);
  const last = $derived(index === TOUR_STEPS.length - 1);
  const age = $derived(Math.floor(START_AGE + disease.year));
  const gap = $derived.by(() => {
    const m = course.untreated?.milestones;
    return m && m.biomarker !== null && m.symptoms !== null ? (m.symptoms - m.biomarker).toFixed(0) : '';
  });
  const copy = $derived(tour.step ? t.steps[tour.step] : null);
  const art = $derived(tour.step ? STEP_ART[tour.step] : null);
</script>

{#if tour.step && copy && art}
  {#if disease.playing}
    <div class="travel" role="status" transition:fade={{ duration: DUR / 2 }}>
      <span class="ff" aria-hidden="true"><FastForward size={14} /></span>
      <span>{t.fastForward}</span>
      <strong>{strings.disease.age(age)}</strong>
    </div>
  {:else}
    {#key tour.step}
      <div
        class="card"
        role="dialog"
        aria-label={t.label}
        aria-live="polite"
        in:fly={{ y: 14, duration: DUR, delay: DUR / 2 }}
        out:fade={{ duration: DUR / 2 }}
      >
        <div class="head">
          <span class="badge {art.tone}"><art.icon size={20} /></span>
          <div>
            <p class="eyebrow">{t.label} · {t.progress(index + 1, TOUR_STEPS.length)}</p>
            <h3>{copy.title(age)}</h3>
          </div>
        </div>
        <p class="body">{copy.body(gap)}</p>
        <div class="bar" aria-hidden="true">
          {#each TOUR_STEPS as s, i (s)}<i class:on={i <= index}></i>{/each}
        </div>
        <div class="actions">
          {#if !last}<button class="link" type="button" onclick={endTour}>{t.skip}</button>{/if}
          <button class="btn primary" type="button" onclick={last ? endTour : nextTourStep}>
            {last ? t.finish : t.next}{#if !last}<ArrowRight size={14} />{/if}
          </button>
        </div>
      </div>
    {/key}
  {/if}
{/if}

<style>
  .card {
    position: absolute; left: 20px; top: 88px; z-index: 4;
    width: min(440px, calc(100% - 40px)); padding: 22px 24px 18px;
    background: color-mix(in srgb, var(--panel) 96%, transparent); backdrop-filter: blur(8px);
    border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 18px 50px rgba(28, 23, 18, .13);
  }
  .head { display: flex; gap: 14px; align-items: flex-start; }
  .badge {
    flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px;
    animation: pop .35s cubic-bezier(.3, 1.4, .5, 1) both; animation-delay: .18s;
  }
  @keyframes pop { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: scale(1); } }
  @media (prefers-reduced-motion: reduce) { .badge { animation: none; } }
  .badge.calm { color: var(--text-2); background: var(--hover); }
  .badge.signal { color: var(--signal); background: var(--signal-soft); }
  .badge.warn { color: var(--st-serious-text); background: var(--st-serious-soft); }
  .badge.harm { color: var(--st-critical-text); background: var(--st-critical-soft); }
  .badge.good { color: var(--good); background: var(--good-soft); }
  .eyebrow { margin: 0 0 3px; }
  h3 { margin: 0; font-family: var(--display); font-size: 21px; font-weight: 500; line-height: 1.2; color: var(--text); }
  .body { margin: 12px 0 16px; font-size: var(--fs-md); line-height: 1.6; color: var(--text-2); }
  .bar { display: flex; gap: 5px; margin-bottom: 14px; }
  .bar i { flex: 1; height: 3px; border-radius: 2px; background: var(--line); transition: background .3s; }
  .bar i.on { background: var(--signal); }
  .actions { display: flex; align-items: center; justify-content: flex-end; gap: 16px; }
  .link { padding: 0; border: 0; background: none; font: inherit; font-size: var(--fs-sm); color: var(--muted); cursor: pointer; }
  .link:hover { color: var(--text); }

  .travel {
    position: absolute; left: 20px; top: 88px; z-index: 4;
    display: flex; align-items: center; gap: 10px; padding: 10px 16px;
    background: color-mix(in srgb, var(--panel) 94%, transparent); backdrop-filter: blur(8px);
    border: 1px solid var(--line); border-radius: 999px; box-shadow: var(--shadow-md);
    font-size: var(--fs-sm); color: var(--muted);
  }
  .travel strong { font-family: var(--display); font-size: var(--fs-lg); font-weight: 500; color: var(--text); min-width: 64px; }
  .ff { display: grid; place-items: center; color: var(--signal); animation: nudge 1s ease-in-out infinite; }
  @keyframes nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
  @media (prefers-reduced-motion: reduce) { .ff { animation: none; } }

  @media (max-width: 640px) {
    .card {
      left: 8px; right: 8px; top: auto; bottom: 10px;
      width: auto; padding: 16px 16px 12px; border-radius: 16px;
    }
    .head { gap: 12px; }
    .badge { width: 38px; height: 38px; border-radius: 11px; }
    h3 { font-size: 18px; }
    .body { margin: 10px 0 12px; font-size: var(--fs-base); }
    .actions { gap: 12px; }
    .travel { left: 8px; top: auto; bottom: 10px; }
  }
</style>
