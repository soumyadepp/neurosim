<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="sticky" role="status" aria-live="polite">
  <p class="note">{@render children()}</p>
</div>

<style>
  .sticky {
    position: sticky; top: -20px; z-index: 2;
    margin: 0 -20px 16px; padding: 8px 20px;
    background: var(--panel);
  }
  .sticky::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: -8px; height: 8px;
    background: linear-gradient(var(--panel), transparent); pointer-events: none;
  }
</style>
