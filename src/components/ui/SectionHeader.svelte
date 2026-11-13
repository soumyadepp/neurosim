<script lang="ts">
  interface Props {
    eyebrow: string;
    title: string;
    intro?: string;
  }

  let { eyebrow, title, intro }: Props = $props();
</script>

<div class="head">
  <p class="eyebrow">{eyebrow}</p>
  <h2>{title}</h2>
  {#if intro}<p class="intro">{intro}</p>{/if}
</div>

<style>
  .head { margin-bottom: 16px; }
  .eyebrow { margin-bottom: 4px; }
  h2 { margin: 0; font-size: var(--fs-lg); font-weight: 600; letter-spacing: -.01em; }
  .intro { margin: 6px 0 0; font-size: var(--fs-base); color: var(--muted); line-height: 1.55; }
</style>
