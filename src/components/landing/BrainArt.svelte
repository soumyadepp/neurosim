<script lang="ts">
  import {
    FOLIA, HIPPO_ANCHOR, HIPPOCAMPUS, REGIONS, SILHOUETTE, SULCI,
    type RegionId, type TauBlob,
  } from '../../lib/landing/brainShape';

  interface Props {
    label: string;
    variant?: 'plain' | 'lobes';
    tau?: TauBlob[];
    progress?: number;
    selected?: RegionId | null;
    names?: Partial<Record<RegionId, string>>;
    deepLabel?: string;
    crop?: boolean;
    onselect?: (id: RegionId) => void;
  }

  let { label, variant = 'plain', tau = [], progress = 1, selected = null, names = {}, deepLabel = '', crop = false, onselect }: Props = $props();

  const uid = `b${Math.random().toString(36).slice(2, 8)}`;
  const interactive = $derived(variant === 'lobes' && !!onselect);

  function grow(at: number): number {
    const t = Math.min(1, Math.max(0, (progress - at) / 0.16));
    return t * t * (3 - 2 * t);
  }

  function key(e: KeyboardEvent, id: RegionId): void {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onselect?.(id); }
  }
</script>

<svg viewBox={crop ? '36 8 328 288' : '0 0 400 300'} role={interactive ? 'group' : 'img'} aria-label={label} class:interactive class="v-{variant}">
  <defs>
    <clipPath id="{uid}-cortex"><path d={SILHOUETTE} /></clipPath>
    <radialGradient id="{uid}-tau">
      <stop offset="0%" stop-color="#c94e1d" stop-opacity=".9" />
      <stop offset="55%" stop-color="#eb6834" stop-opacity=".55" />
      <stop offset="100%" stop-color="#eb6834" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="{uid}-sheen" cx="38%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#ffffff" style="stop-opacity: var(--art-sheen-o)" />
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0" />
      <stop offset="100%" stop-color="#3c3835" stop-opacity=".06" />
    </radialGradient>
  </defs>

  {#each REGIONS as r (r.id)}
    {#if interactive}
      <path class="region" class:on={selected === r.id} d={r.path} style:--strong={r.strong}
        role="button" tabindex="0" aria-label={names[r.id]} aria-pressed={selected === r.id}
        onclick={() => onselect?.(r.id)} onkeydown={e => key(e, r.id)} />
    {:else}
      <path class="region" class:deep={r.id === 'brainstem' || r.id === 'cerebellum'} d={r.path} style:--strong={r.strong} />
    {/if}
  {/each}

  <g class="texture" aria-hidden="true">
    {#each FOLIA as d (d)}<path class="folia" {d} />{/each}
    <g clip-path="url(#{uid}-cortex)">
      {#each SULCI as d (d)}<path class="sulcus" {d} />{/each}
      <path d={SILHOUETTE} fill="url(#{uid}-sheen)" />
    </g>
  </g>

  {#if tau.length}
    <g clip-path="url(#{uid}-cortex)" class="tau" aria-hidden="true">
      {#each tau as b, i (i)}
        {@const s = grow(b.at)}
        {#if s > 0}<circle cx={b.x} cy={b.y} r={b.r * (0.3 + 0.7 * s)} fill="url(#{uid}-tau)" opacity={s} />{/if}
      {/each}
    </g>
  {/if}

  <path class="outline" d={SILHOUETTE} aria-hidden="true" />

  {#if variant === 'lobes'}
    {#if interactive}
      <path class="region hippo" class:on={selected === 'hippocampus'} d={HIPPOCAMPUS.path} style:--strong={HIPPOCAMPUS.strong}
        role="button" tabindex="0" aria-label={names.hippocampus} aria-pressed={selected === 'hippocampus'}
        onclick={() => onselect?.('hippocampus')} onkeydown={e => key(e, 'hippocampus')} />
    {:else}
      <path class="region hippo" d={HIPPOCAMPUS.path} style:--strong={HIPPOCAMPUS.strong} />
    {/if}
    <g class="labels" aria-hidden="true">
      {#each REGIONS as r (r.id)}
        <text x={r.label.x} y={r.label.y} text-anchor="middle" class:on={selected === r.id}>{names[r.id]}</text>
      {/each}
      <path class="leader" d="M{HIPPO_ANCHOR.x - 14} {HIPPO_ANCHOR.y + 8} L{HIPPOCAMPUS.label.x + 10} {HIPPOCAMPUS.label.y - 12}" />
      <text x={HIPPOCAMPUS.label.x} y={HIPPOCAMPUS.label.y} text-anchor="middle" class:on={selected === 'hippocampus'}>{names.hippocampus}</text>
      <text class="deep" x={HIPPOCAMPUS.label.x} y={HIPPOCAMPUS.label.y + 13} text-anchor="middle">{deepLabel}</text>
    </g>
  {/if}
</svg>

<style>
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  .region { stroke: var(--art-line); stroke-opacity: .35; stroke-width: 1; transition: fill .2s; }
  .v-plain .region { fill: var(--art-fill); }
  .v-plain .region.deep { fill: var(--art-fill-deep); }
  .v-lobes .region { stroke-opacity: .45; fill: color-mix(in srgb, var(--strong) 20%, var(--panel)); }
  .interactive .region { cursor: pointer; outline: none; }
  .interactive .region:hover, .interactive .region.on { fill: color-mix(in srgb, var(--strong) 36%, var(--panel)); }
  .interactive .region:focus-visible { stroke: var(--focus); stroke-opacity: 1; stroke-width: 2.5; }
  .v-lobes .hippo { fill: color-mix(in srgb, var(--strong) 30%, var(--panel)); }
  .hippo { stroke: var(--art-accent); stroke-opacity: .9; stroke-width: 1.3; stroke-dasharray: 3 2.5; }
  .interactive .hippo:hover, .interactive .hippo.on { fill: color-mix(in srgb, var(--strong) 44%, var(--panel)); }
  .texture, .labels { pointer-events: none; }
  .sulcus { fill: var(--art-sulcus); fill-opacity: var(--art-sulcus-o); }
  .folia { fill: none; stroke: var(--art-line); stroke-opacity: .45; stroke-width: 1.2; stroke-linecap: round; }
  .outline { fill: none; stroke: var(--art-line); stroke-opacity: .8; stroke-width: 1.7; pointer-events: none; }
  .tau { mix-blend-mode: var(--art-tau-blend); pointer-events: none; }
  .labels text { font-family: var(--font); font-size: 11.5px; font-weight: 600; fill: var(--text-2); paint-order: stroke; stroke: var(--art-halo); stroke-width: 4px; stroke-linejoin: round; }
  .labels text.on { fill: var(--text); }
  .labels .deep { font-size: 10px; font-weight: 500; fill: var(--muted); }
  .leader { fill: none; stroke: var(--art-accent); stroke-width: 1; stroke-dasharray: 2 2; opacity: .8; }
  @media (prefers-reduced-motion: reduce) { .region { transition: none; } }
</style>
