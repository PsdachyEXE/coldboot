/**
 * Plane geometry for figures: where a line meets a circle, rectangle or ellipse, points along a
 * polyline, and arrowheads. Pure functions over SVG user units (y grows downwards).
 */

export interface Pt {
  x: number;
  y: number;
}

export type Shape =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; cx: number; cy: number; w: number; h: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Unit vector in the direction of `v`, or (1, 0) for a zero vector. */
export function unit(v: Pt): Pt {
  const len = Math.hypot(v.x, v.y);
  return len > 1e-12 ? { x: v.x / len, y: v.y / len } : { x: 1, y: 0 };
}

/** `v` turned a quarter turn (clockwise on screen, since y points down). */
export const perp = (v: Pt): Pt => ({ x: -v.y, y: v.x });

export function centreOf(s: Shape): Pt {
  return { x: s.cx, y: s.cy };
}

/** True when `p` is inside or on the boundary of `s`. */
export function contains(s: Shape, p: Pt, eps = 1e-6): boolean {
  const dx = p.x - s.cx;
  const dy = p.y - s.cy;
  switch (s.kind) {
    case 'circle':
      return dx * dx + dy * dy <= s.r * s.r + eps;
    case 'rect':
      return Math.abs(dx) <= s.w / 2 + eps && Math.abs(dy) <= s.h / 2 + eps;
    case 'ellipse':
      return (dx * dx) / (s.rx * s.rx) + (dy * dy) / (s.ry * s.ry) <= 1 + eps;
  }
}

/** Largest t >= 0 with |o + t d|^2 = 1 (o inside the unit circle). */
function unitCircleExit(o: Pt, d: Pt): number {
  const a = d.x * d.x + d.y * d.y;
  const b = 2 * (o.x * d.x + o.y * d.y);
  const c = o.x * o.x + o.y * o.y - 1;
  const disc = Math.max(0, b * b - 4 * a * c);
  return (-b + Math.sqrt(disc)) / (2 * a);
}

/**
 * Where the ray from `from` towards `towards` leaves the boundary of `s`. `from` should be inside
 * the shape (usually its centre, or the centre shifted sideways for a parallel flow); a start
 * point outside the shape falls back to the centre.
 */
export function exitPoint(s: Shape, from: Pt, towards: Pt): Pt {
  const start = contains(s, from) ? from : centreOf(s);
  const d = sub(towards, start);
  if (Math.hypot(d.x, d.y) < 1e-12) return start;
  let t: number;
  switch (s.kind) {
    case 'circle': {
      t = unitCircleExit({ x: (start.x - s.cx) / s.r, y: (start.y - s.cy) / s.r }, { x: d.x / s.r, y: d.y / s.r });
      break;
    }
    case 'ellipse': {
      t = unitCircleExit({ x: (start.x - s.cx) / s.rx, y: (start.y - s.cy) / s.ry }, { x: d.x / s.rx, y: d.y / s.ry });
      break;
    }
    case 'rect': {
      const tx = d.x > 0 ? (s.cx + s.w / 2 - start.x) / d.x : d.x < 0 ? (s.cx - s.w / 2 - start.x) / d.x : Infinity;
      const ty = d.y > 0 ? (s.cy + s.h / 2 - start.y) / d.y : d.y < 0 ? (s.cy - s.h / 2 - start.y) / d.y : Infinity;
      t = Math.min(tx, ty);
      break;
    }
  }
  return add(start, scale(d, t));
}

/** A copy of `s` grown by `by` units on every side (for highlight rings). */
export function inflate(s: Shape, by: number): Shape {
  switch (s.kind) {
    case 'circle':
      return { ...s, r: s.r + by };
    case 'rect':
      return { ...s, w: s.w + 2 * by, h: s.h + 2 * by };
    case 'ellipse':
      return { ...s, rx: s.rx + by, ry: s.ry + by };
  }
}

/** Axis-aligned bounds of a shape. */
export function boundsOf(s: Shape): { x: number; y: number; w: number; h: number } {
  switch (s.kind) {
    case 'circle':
      return { x: s.cx - s.r, y: s.cy - s.r, w: 2 * s.r, h: 2 * s.r };
    case 'rect':
      return { x: s.cx - s.w / 2, y: s.cy - s.h / 2, w: s.w, h: s.h };
    case 'ellipse':
      return { x: s.cx - s.rx, y: s.cy - s.ry, w: 2 * s.rx, h: 2 * s.ry };
  }
}

export function polylineLength(points: readonly Pt[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}

/** The point a fraction of the way along a polyline (by length), and the direction there. */
export function pointAlong(points: readonly Pt[], fraction: number): { point: Pt; dir: Pt } {
  if (points.length === 0) return { point: { x: 0, y: 0 }, dir: { x: 1, y: 0 } };
  if (points.length === 1) return { point: points[0], dir: { x: 1, y: 0 } };
  const target = polylineLength(points) * Math.min(1, Math.max(0, fraction));
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = dist(points[i - 1], points[i]);
    if (walked + seg >= target - 1e-9 && seg > 0) {
      const k = (target - walked) / seg;
      const dir = unit(sub(points[i], points[i - 1]));
      return { point: add(points[i - 1], scale(sub(points[i], points[i - 1]), k)), dir };
    }
    walked += seg;
  }
  const n = points.length;
  return { point: points[n - 1], dir: unit(sub(points[n - 1], points[n - 2])) };
}

/** Moves the last point of a polyline back towards the previous one by `by` units. */
export function trimEnd(points: readonly Pt[], by: number): Pt[] {
  if (points.length < 2) return points.slice();
  const out = points.slice();
  const n = out.length;
  const seg = dist(out[n - 2], out[n - 1]);
  const k = seg > 0 ? Math.max(0, seg - by) / seg : 0;
  out[n - 1] = add(out[n - 2], scale(sub(out[n - 1], out[n - 2]), k));
  return out;
}

/** Triangle with its tip at `tip`, pointing along `dir`. */
export function arrowHead(tip: Pt, dir: Pt, length = 10, halfWidth = 4.5): Pt[] {
  const u = unit(dir);
  const n = perp(u);
  const base = sub(tip, scale(u, length));
  return [tip, add(base, scale(n, halfWidth)), sub(base, scale(n, halfWidth))];
}

/** Rounds to one decimal place so SVG attributes stay short and stable. */
export function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** `M x y L x y ...` for a polyline. */
export function pathData(points: readonly Pt[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${r1(p.x)} ${r1(p.y)}`).join(' ');
}

/** `x,y x,y ...` for a polygon or polyline `points` attribute. */
export function pointsAttr(points: readonly Pt[]): string {
  return points.map((p) => `${r1(p.x)},${r1(p.y)}`).join(' ');
}
