/**
 * Routing for labelled connectors (DFD and context diagram flows, use case links). Every node sits
 * where the data puts it; this module only works out where each line leaves one shape and meets
 * the next, where its arrowhead goes, and where its label sits.
 *
 * - A connector runs from the edge of its `from` shape to the edge of its `to` shape, through any
 *   `via` points.
 * - Two or more straight connectors between the same pair of nodes would sit on top of each
 *   other, so they are spread sideways (PARALLEL_GAP apart) and their labels move to the outer
 *   side of their own line. This is a drawing convention, not layout: nodes never move.
 * - A label sits at the midpoint of its line on a --void backing, unless `labelAt` pins it. On a
 *   line too short to show both the label and the arrowhead, it moves beside the line instead.
 *   Labels are kept on the canvas.
 */
import {
  add,
  arrowHead,
  centreOf,
  exitPoint,
  perp,
  pointAlong,
  polylineLength,
  scale,
  sub,
  trimEnd,
  unit,
  type Pt,
  type Shape,
} from './geometry';
import { LABEL_SIZE, LINE_HEIGHT, linesWidth, wrapText } from './text';

export const PARALLEL_GAP = 22;
export const ARROW_LENGTH = 10;
/** Flow labels longer than this wrap (snake_case labels break after an underscore). */
export const FLOW_LABEL_MAX = 200;
const LABEL_PAD_X = 4;
const LABEL_PAD_Y = 2;

export interface Connector {
  /** The id `highlight` uses: the flow's own id, or `from->to`. */
  key: string;
  from: string;
  to: string;
  label: string;
  via?: readonly Pt[];
  labelAt?: Pt;
  /** Draw an arrowhead at the `to` end: filled (DFD flows) or open (<<includes>>/<<extends>>). */
  head: 'filled' | 'open' | 'none';
}

export interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The canvas; labels are kept inside it. */
export interface Bounds {
  width: number;
  height: number;
}

export interface RoutedConnector {
  connector: Connector;
  /** From the edge of `from` to the edge of `to` (the arrow tip). */
  points: Pt[];
  /** The stroked line: `points`, stopped at the base of a filled arrowhead. */
  line: Pt[];
  /** Filled triangle or open chevron, when the connector has a head. */
  head: Pt[] | null;
  label: { lines: string[]; centre: Pt; box: LabelBox } | null;
  /** Centre of the label, or the midpoint of the line for an unlabelled connector. */
  anchor: Pt;
}

/** The key a flow is addressed by. */
export function connectorKey(flow: { id?: string; from: string; to: string }): string {
  return flow.id ?? `${flow.from}->${flow.to}`;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

/** Automatic loop for a connector whose ends are the same node and which has no `via`. */
function selfLoop(shape: Shape): Pt[] {
  const c = centreOf(shape);
  const top = shape.kind === 'rect' ? shape.h / 2 : shape.kind === 'circle' ? shape.r : shape.ry;
  return [
    { x: c.x + 18, y: c.y - top - 28 },
    { x: c.x - 18, y: c.y - top - 28 },
  ];
}

export function labelBoxAt(centre: Pt, lines: readonly string[]): LabelBox {
  const w = linesWidth(lines, LABEL_SIZE) + 2 * LABEL_PAD_X;
  const h = lines.length * LINE_HEIGHT + 2 * LABEL_PAD_Y;
  return { x: centre.x - w / 2, y: centre.y - h / 2, w, h };
}

/**
 * Routes every connector. Connectors naming an unknown node are skipped (the content checker
 * rejects them; a game-built figure should never crash the page).
 */
export function routeConnectors(connectors: readonly Connector[], shapes: ReadonlyMap<string, Shape>, bounds?: Bounds): RoutedConnector[] {
  // Group straight connectors by the unordered pair of nodes they join.
  const groups = new Map<string, number[]>();
  connectors.forEach((c, i) => {
    if (c.via?.length || c.from === c.to) return;
    const key = pairKey(c.from, c.to);
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });

  const out: RoutedConnector[] = [];
  connectors.forEach((c, i) => {
    const a = shapes.get(c.from);
    const b = shapes.get(c.to);
    if (!a || !b) return;
    const ca = centreOf(a);
    const cb = centreOf(b);

    let points: Pt[];
    let offset = 0;
    let normal: Pt = { x: 0, y: -1 };
    const via = c.via?.length ? c.via : c.from === c.to ? selfLoop(a) : null;
    if (via) {
      points = [exitPoint(a, ca, via[0]), ...via, exitPoint(b, cb, via[via.length - 1])];
    } else {
      const group = groups.get(pairKey(c.from, c.to)) ?? [i];
      if (group.length > 1) {
        // Spread the group across a normal that is the same for both directions of travel.
        const [first, second] = c.from < c.to ? [ca, cb] : [cb, ca];
        normal = perp(unit(sub(second, first)));
        offset = (group.indexOf(i) - (group.length - 1) / 2) * PARALLEL_GAP;
      }
      const shift = scale(normal, offset);
      const sa = add(ca, shift);
      const sb = add(cb, shift);
      points = [exitPoint(a, sa, sb), exitPoint(b, sb, sa)];
    }

    const n = points.length;
    const endDir = unit(sub(points[n - 1], points[n - 2]));
    let head: Pt[] | null = null;
    let line = points;
    if (c.head === 'filled') {
      head = arrowHead(points[n - 1], endDir, ARROW_LENGTH);
      line = trimEnd(points, ARROW_LENGTH - 1);
    } else if (c.head === 'open') {
      const [tip, left, right] = arrowHead(points[n - 1], endDir, ARROW_LENGTH, 5);
      head = [left, tip, right];
    }

    const { point: mid, dir } = pointAlong(points, 0.5);
    let label: RoutedConnector['label'] = null;
    if (c.label.trim()) {
      const lines = wrapText(c.label, FLOW_LABEL_MAX, { breakUnderscores: true });
      const { w, h } = labelBoxAt({ x: 0, y: 0 }, lines);
      const beside = (n: Pt, side: number) => add(mid, scale(n, side * (Math.abs(n.x) * (w / 2) + Math.abs(n.y) * (h / 2) + 3)));
      let centre: Pt;
      if (c.labelAt) {
        centre = c.labelAt;
      } else if (offset !== 0) {
        // Beside its own line, on the outer side of the group.
        centre = beside(normal, Math.sign(offset));
      } else {
        // On the line, unless the label would hide the arrowhead or either end of the line: then
        // beside the line, above a flatter line or right of a steeper one, switching sides if
        // that side leaves the canvas.
        const length = polylineLength(points);
        const endClear = c.head === 'none' ? 4 : ARROW_LENGTH + 2;
        const guard = [
          pointAlong(points, Math.min(0.5, 4 / length)).point,
          pointAlong(points, Math.max(0.5, 1 - endClear / length)).point,
          ...(head ?? []),
        ];
        const onLine = labelBoxAt(mid, lines);
        const covered = (p: Pt) => p.x >= onLine.x - 2 && p.x <= onLine.x + onLine.w + 2 && p.y >= onLine.y - 2 && p.y <= onLine.y + onLine.h + 2;
        if (!guard.some(covered)) {
          centre = mid;
        } else {
          const n = perp(dir);
          const side = Math.abs(dir.x) >= Math.abs(dir.y) ? (n.y <= 0 ? 1 : -1) : n.x >= 0 ? 1 : -1;
          centre = beside(n, side);
          if (bounds && !fits(labelBoxAt(centre, lines), bounds) && fits(labelBoxAt(beside(n, -side), lines), bounds)) centre = beside(n, -side);
        }
      }
      if (bounds) centre = clampInto(centre, w, h, bounds);
      label = { lines, centre, box: labelBoxAt(centre, lines) };
    }
    out.push({ connector: c, points, line, head, label, anchor: label?.centre ?? mid });
  });
  return out;
}

const EDGE = 2;

function fits(box: LabelBox, bounds: Bounds): boolean {
  return box.x >= EDGE && box.y >= EDGE && box.x + box.w <= bounds.width - EDGE && box.y + box.h <= bounds.height - EDGE;
}

/** Moves a label's centre so its box stays on the canvas. */
function clampInto(centre: Pt, w: number, h: number, bounds: Bounds): Pt {
  const x = Math.min(Math.max(centre.x, EDGE + w / 2), bounds.width - EDGE - w / 2);
  const y = Math.min(Math.max(centre.y, EDGE + h / 2), bounds.height - EDGE - h / 2);
  return { x, y };
}
