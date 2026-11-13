import { describe, expect, it } from 'vitest';
import { TASKS } from '../sim/catalog';
import { SCENARIOS, scenarioNodes } from './scenarios';
import { BRAAK_STAGE } from './staging';
import atlas from '../../../public/data/brain.json';

const brain = atlas as { nodes: { label: string; hemi: 'L' | 'R' }[] };
const labels = new Set(brain.nodes.map(n => n.label));

describe('SCENARIOS', () => {
  it('only names regions that exist in the atlas', () => {
    for (const s of SCENARIOS) for (const l of [...s.seeds, ...s.functionRegions]) expect(labels.has(l), l).toBe(true);
    for (const l of Object.keys(BRAAK_STAGE)) expect(labels.has(l), l).toBe(true);
  });

  it('tests each scenario with a real task', () => {
    for (const s of SCENARIOS) expect(TASKS.some(t => t.id === s.taskId)).toBe(true);
  });

  it('seeds both hemispheres', () => {
    const ad = SCENARIOS[0];
    const seeds = scenarioNodes(brain.nodes, ad.seeds);
    expect(seeds.map(i => brain.nodes[i].hemi).sort()).toEqual(['L', 'R']);
  });
});
