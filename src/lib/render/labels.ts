export interface LabelAnchor {
  region: number;
  x: number;
  y: number;
  front: boolean;
  deep: boolean;
}

export interface LabelView {
  cx: number;
  cy: number;
  anchors: LabelAnchor[];
}

export interface PlacedLabel extends LabelAnchor {
  lx: number;
  ly: number;
  side: 'left' | 'right';
}

const LEADER_PX = 48;
const ROW_GAP_PX = 22;

/**
 * Pushes each label radially out from the brain's screen centre, then spreads labels on the same
 * side apart vertically so they never stack on top of each other.
 */
export function layoutLabels(view: LabelView): PlacedLabel[] {
  const placed: PlacedLabel[] = view.anchors.map(a => {
    const dx = a.x - view.cx, dy = a.y - view.cy, len = Math.hypot(dx, dy) || 1;
    return { ...a, lx: a.x + (dx / len) * LEADER_PX, ly: a.y + (dy / len) * LEADER_PX, side: dx < 0 ? 'left' : 'right' };
  });
  for (const side of ['left', 'right'] as const) {
    const column = placed.filter(p => p.side === side).sort((a, b) => a.ly - b.ly);
    for (let i = 1; i < column.length; i++) {
      if (column[i].ly < column[i - 1].ly + ROW_GAP_PX) column[i].ly = column[i - 1].ly + ROW_GAP_PX;
    }
  }
  return placed;
}
