import { describe, expect, it } from 'vitest';
import { BASELINE_CHEMISTRY } from '../sim/catalog';
import { couplingScale, nodeBifurcation } from './perturbation';

const names = ['GABAa', 'NMDA', 'D1', 'D2', '5HT1a', 'M1'];
const low = [0.5, 1, 1, 1, 1, 1];
const high = [2, 1, 1, 1, 1, 1];

describe('nodeBifurcation', () => {
  it('leaves every node at the baseline under baseline chemistry', () => {
    const a = nodeBifurcation(-0.3, names, [low, high], BASELINE_CHEMISTRY);
    expect(Array.from(a)).toEqual([-0.3, -0.3]);
  });

  it('damps GABA-A dense regions more when GABA is potentiated', () => {
    const a = nodeBifurcation(-0.3, names, [low, high], { ...BASELINE_CHEMISTRY, gaba: 2 });
    expect(a[0]).toBeLessThan(-0.3);
    expect(a[1]).toBeLessThan(a[0]);
  });

  it('excites regions when inhibition is blocked', () => {
    const a = nodeBifurcation(-0.3, names, [high, high], { ...BASELINE_CHEMISTRY, gaba: 0 });
    expect(a[0]).toBeGreaterThan(-0.3);
  });

  it('ignores receptors the data does not include', () => {
    const a = nodeBifurcation(-0.3, ['GABAa'], [[1]], { ...BASELINE_CHEMISTRY, dopamine: 2 });
    expect(a[0]).toBe(-0.3);
  });
});

describe('couplingScale', () => {
  it('follows glutamate, since long-range projections are glutamatergic', () => {
    expect(couplingScale(BASELINE_CHEMISTRY)).toBe(1);
    expect(couplingScale({ ...BASELINE_CHEMISTRY, glutamate: 0.5 })).toBe(0.5);
    expect(couplingScale({ ...BASELINE_CHEMISTRY, glutamate: -1 })).toBe(0);
  });
});
