import type { Orbit } from './scene';

const MIN_RADIUS = 1.6;
const MAX_RADIUS = 9;
const CLICK_SLOP_PX = 5;

/**
 * Pointer and wheel handling for orbiting the camera. A press that barely moves counts as a click.
 * Returns a function that removes every listener.
 */
export function attachOrbitControls(canvas: HTMLCanvasElement, orbit: Orbit, onClick: (x: number, y: number) => void): () => void {
  const pointers = new Map<number, { x: number; y: number }>();
  let dragDist = 0, lastPinch = 0;
  const clampR = (r: number) => Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, r));

  const down = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragDist = 0;
  };
  const move = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 1) {
      dragDist += Math.abs(dx) + Math.abs(dy);
      orbit.theta += dx * 0.006;
      orbit.phi = Math.max(0.15, Math.min(Math.PI - 0.15, orbit.phi - dy * 0.006));
      if (dragDist > 4) orbit.auto = false;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch) orbit.r = clampR(orbit.r * lastPinch / d);
      lastPinch = d;
      orbit.auto = false;
    }
  };
  const up = (e: PointerEvent) => {
    if (pointers.has(e.pointerId) && dragDist < CLICK_SLOP_PX && pointers.size === 1) onClick(e.clientX, e.clientY);
    pointers.delete(e.pointerId);
    lastPinch = 0;
  };
  const cancel = (e: PointerEvent) => { pointers.delete(e.pointerId); lastPinch = 0; };
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    orbit.r = clampR(orbit.r * (1 + e.deltaY * 0.0012));
    orbit.auto = false;
  };

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('wheel', wheel, { passive: false });
  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', cancel);
    canvas.removeEventListener('wheel', wheel);
  };
}
