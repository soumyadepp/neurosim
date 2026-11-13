<script lang="ts">
  import X from '@lucide/svelte/icons/x';
  import type { TaskResult } from '../lib/sim/network';
  import { ui } from '../lib/engine.svelte';
  import { strings } from '../lib/strings';

  const t = strings.tasks;

  let dismissed = $state<TaskResult | null>(null);
  const result = $derived(ui.taskResult && ui.taskResult !== dismissed && !ui.runningTaskId ? ui.taskResult : null);
  const pct = $derived(result ? Math.round(result.ratio * 100) : 0);
  const level = $derived(pct >= 75 ? 'intact' : pct >= 35 ? 'impaired' : 'severe');
  const verdict = $derived(level === 'intact' ? t.intact : level === 'impaired' ? t.impaired : t.severe);
</script>

{#if result}
  <div class="toast {level}" role="status" aria-live="polite">
    <div class="text">
      <p class="eyebrow">{t.resultEyebrow}</p>
      <strong>{result.def.name}</strong>
    </div>
    <div class="score">
      <span class="pct mono">{pct}<small>%</small></span>
      <span class="badge">{verdict}</span>
    </div>
    <div class="meter"><i style:width="{Math.min(100, pct)}%"></i></div>
    <button class="close" type="button" aria-label={t.dismiss} title={t.dismiss} onclick={() => (dismissed = result)}><X size={14} /></button>
  </div>
{/if}

<style>
  .toast {
    --tone: var(--good); --tone-soft: var(--good-soft); --tone-line: var(--good-line);
    position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 3;
    display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 4px 16px;
    width: min(360px, calc(100% - 32px)); padding: 12px 40px 12px 14px;
    background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-md);
    animation: rise .2s ease-out;
  }
  .impaired { --tone: var(--warn); --tone-soft: var(--warn-soft); --tone-line: var(--warn-line); }
  .severe { --tone: var(--bad); --tone-soft: var(--harm-soft); --tone-line: var(--harm-line); }
  @keyframes rise { from { opacity: 0; transform: translate(-50%, 4px); } to { opacity: 1; transform: translate(-50%, 0); } }
  @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
  .eyebrow { margin: 0; }
  strong { font-size: var(--fs-md); font-weight: 600; }
  .score { display: flex; align-items: center; gap: 10px; }
  .pct { font-size: 24px; font-weight: 500; letter-spacing: -.02em; }
  .pct small { font-size: var(--fs-md); color: var(--muted); margin-left: 1px; }
  .badge {
    font-size: var(--fs-xs); font-weight: 500; padding: 2px 8px; border-radius: 999px; white-space: nowrap;
    color: var(--tone); background: var(--tone-soft); border: 1px solid var(--tone-line);
  }
  .meter { grid-column: 1 / 3; height: 5px; background: var(--hover); border-radius: 3px; overflow: hidden; }
  .meter i { display: block; height: 100%; background: var(--tone); }
  .close {
    position: absolute; top: 8px; right: 8px; display: grid; place-items: center; width: 24px; height: 24px;
    padding: 0; border: 0; border-radius: var(--r-sm); background: none; color: var(--subtle); cursor: pointer;
  }
  .close:hover { background: var(--hover); color: var(--text); }
</style>
