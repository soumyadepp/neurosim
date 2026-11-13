import { afterEach, describe, expect, it, vi } from 'vitest';
import { crossesAny, haptic } from './haptics';

function setup({ coarse = true, supported = true } = {}) {
  const vibrate = vi.fn(() => true);
  vi.stubGlobal('navigator', supported ? { vibrate } : {});
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('coarse') ? coarse : false }));
  return vibrate;
}

afterEach(() => vi.unstubAllGlobals());

describe('haptic', () => {
  it('fires a short pulse on a touch device', () => {
    const vibrate = setup();
    expect(haptic('select')).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(8);
  });

  it('uses a distinct pattern for crossing a milestone', () => {
    const vibrate = setup();
    haptic('milestone');
    expect(vibrate).toHaveBeenCalledWith([0, 10, 45, 18]);
  });

  it('stays silent on a mouse pointer', () => {
    const vibrate = setup({ coarse: false });
    expect(haptic('select')).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('stays silent where the browser has no vibration support', () => {
    setup({ supported: false });
    expect(haptic('select')).toBe(false);
  });
});

describe('crossesAny', () => {
  it('detects a milestone passed in either direction', () => {
    expect(crossesAny(10, 20, [15])).toBe(true);
    expect(crossesAny(20, 10, [15])).toBe(true);
  });

  it('is false when no milestone lies between the two years', () => {
    expect(crossesAny(10, 14, [15, 30])).toBe(false);
    expect(crossesAny(10, 10, [10])).toBe(false);
  });

  it('ignores milestones that were never reached', () => {
    expect(crossesAny(10, 20, [null, 15])).toBe(true);
    expect(crossesAny(10, 20, [null])).toBe(false);
  });
});
