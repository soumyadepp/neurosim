<script lang="ts">
  interface Props {
    id: string;
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    digits?: number;
    hint?: string;
    format?: (value: number) => string;
    oninput: (value: number) => void;
  }

  let { id, label, value, min, max, step, digits = 2, hint, format, oninput }: Props = $props();
</script>

<div class="slider">
  <label for={id}>{label}</label>
  <output class="mono" for={id}>{format ? format(value) : value.toFixed(digits)}</output>
  <input {id} type="range" {min} {max} {step} {value} oninput={e => oninput(e.currentTarget.valueAsNumber)} />
  {#if hint}<small>{hint}</small>{/if}
</div>

<style>
  .slider { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: center; margin-bottom: 14px; }
  .slider:last-child { margin-bottom: 0; }
  label { font-size: var(--fs-base); font-weight: 500; }
  output {
    font-size: var(--fs-sm); color: var(--text-2); min-width: 48px; text-align: center;
    padding: 1px 6px; background: var(--panel2); border: 1px solid var(--line); border-radius: var(--r-sm);
  }
  input { grid-column: 1 / 3; width: 100%; margin: 2px 0; accent-color: var(--signal); }
  small { grid-column: 1 / 3; color: var(--muted); font-size: var(--fs-sm); line-height: 1.45; }
</style>
