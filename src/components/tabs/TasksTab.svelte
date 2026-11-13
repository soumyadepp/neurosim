<script lang="ts">
  import { TASKS } from '../../lib/sim/catalog';
  import { runTask, ui } from '../../lib/engine.svelte';
  import { strings } from '../../lib/strings';
  import SectionHeader from '../ui/SectionHeader.svelte';
  import TaskCard from './TaskCard.svelte';

  const t = strings.tasks;
</script>

<SectionHeader eyebrow={t.eyebrow} title={t.heading} intro={t.intro} />
<div class="section">
  {#each TASKS as def (def.id)}
    <TaskCard {def} active={ui.runningTaskId === def.id} disabled={ui.runningTaskId !== null} result={ui.taskResult?.def.id === def.id ? ui.taskResult : null} onrun={() => runTask(def)} />
  {/each}
</div>
<p class="note">{t.tryThis}</p>
