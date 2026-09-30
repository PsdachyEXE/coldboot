import { describe, expect, it } from 'vitest';
import { arrowHead, contains, exitPoint, pointAlong, polylineLength, trimEnd, type Pt, type Shape } from './geometry';
import { PARALLEL_GAP, routeConnectors, type Connector } from './flows';
import { textWidth, wrapText } from './text';

const close = (p: Pt, x: number, y: number, digits = 6) => {
  expect(p.x).toBeCloseTo(x, digits);
  expect(p.y).toBeCloseTo(y, digits);
};

const circle: Shape = { kind: 'circle', cx: 0, cy: 0, r: 10 };
const rect: Shape = { kind: 'rect', cx: 0, cy: 0, w: 20, h: 10 };
const ellipse: Shape = { kind: 'ellipse', cx: 0, cy: 0, rx: 20, ry: 10 };

describe('exitPoint from the centre', () => {
  it('meets a circle at its radius in any direction', () => {
    close(exitPoint(circle, { x: 0, y: 0 }, { x: 100, y: 0 }), 10, 0);
    close(exitPoint(circle, { x: 0, y: 0 }, { x: 100, y: 100 }), Math.SQRT1_2 * 10, Math.SQRT1_2 * 10);
    close(exitPoint(circle, { x: 0, y: 0 }, { x: 0, y: -3 }), 0, -10);
  });

  it('meets a rectangle on the side the line crosses first', () => {
    close(exitPoint(rect, { x: 0, y: 0 }, { x: 100, y: 100 }), 5, 5); // top or bottom edge first
    close(exitPoint(rect, { x: 0, y: 0 }, { x: 100, y: 10 }), 10, 1); // right edge
    close(exitPoint(rect, { x: 0, y: 0 }, { x: -100, y: 0 }), -10, 0);
    close(exitPoint(rect, { x: 0, y: 0 }, { x: 0, y: 50 }), 0, 5);
  });

  it('meets an ellipse where (x/rx)^2 + (y/ry)^2 = 1', () => {
    close(exitPoint(ellipse, { x: 0, y: 0 }, { x: 0, y: 100 }), 0, 10);
    close(exitPoint(ellipse, { x: 0, y: 0 }, { x: -1, y: 0 }), -20, 0);
    const t = Math.sqrt(80); // t^2 (1/400 + 1/100) = 1
    close(exitPoint(ellipse, { x: 0, y: 0 }, { x: 1, y: 1 }), t, t);
  });

  it('works for shapes away from the origin', () => {
    const c: Shape = { kind: 'circle', cx: 300, cy: 200, r: 64 };
    close(exitPoint(c, { x: 300, y: 200 }, { x: 100, y: 200 }), 236, 200);
    const r: Shape = { kind: 'rect', cx: 100, cy: 80, w: 128, h: 48 };
    close(exitPoint(r, { x: 100, y: 80 }, { x: 300, y: 80 }), 164, 80);
  });
});

describe('exitPoint from an offset start', () => {
  it('leaves a circle along a line that misses the centre', () => {
    // Horizontal line 6 units above the centre: x^2 + 6^2 = 10^2.
    close(exitPoint(circle, { x: 0, y: -6 }, { x: 50, y: -6 }), 8, -6);
  });

  it('leaves a rectangle and an ellipse along a shifted line', () => {
    close(exitPoint(rect, { x: 0, y: 3 }, { x: 50, y: 3 }), 10, 3);
    // (x/20)^2 + (6/10)^2 = 1 -> x = 16
    close(exitPoint(ellipse, { x: 0, y: 6 }, { x: 50, y: 6 }), 16, 6);
  });

  it('falls back to the centre when the start is outside the shape', () => {
    close(exitPoint(circle, { x: 0, y: -40 }, { x: 50, y: -40 }), 10 * (50 / Math.hypot(50, 40)), -10 * (40 / Math.hypot(50, 40)));
  });

  it('always lands on the boundary', () => {
    for (let a = 0; a < 360; a += 15) {
      const towards = { x: Math.cos((a * Math.PI) / 180) * 500, y: Math.sin((a * Math.PI) / 180) * 500 };
      for (const s of [circle, rect, ellipse]) {
        const p = exitPoint(s, { x: 1, y: 1 }, towards);
        expect(contains(s, p, 1e-6)).toBe(true);
        expect(contains(s, { x: p.x * 1.01, y: p.y * 1.01 }, 0)).toBe(false);
      }
    }
  });
});

describe('polylines and arrowheads', () => {
  it('measures and walks a polyline by length', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 40 },
    ];
    expect(polylineLength(pts)).toBe(70);
    close(pointAlong(pts, 0.5).point, 30, 5);
    close(pointAlong(pts, 0.5).dir, 0, 1);
    close(pointAlong(pts, 0).point, 0, 0);
    close(pointAlong(pts, 1).point, 30, 40);
    close(trimEnd(pts, 10)[2], 30, 30);
  });

  it('puts the arrow tip on the end point, pointing along the line', () => {
    const [tip, left, right] = arrowHead({ x: 100, y: 50 }, { x: 1, y: 0 }, 10, 4);
    close(tip, 100, 50);
    close(left, 90, 54);
    close(right, 90, 46);
  });
});

describe('routeConnectors', () => {
  const shapes = new Map<string, Shape>([
    ['a', { kind: 'rect', cx: 100, cy: 100, w: 128, h: 48 }],
    ['b', { kind: 'circle', cx: 400, cy: 100, r: 64 }],
    ['c', { kind: 'ellipse', cx: 400, cy: 300, rx: 84, ry: 28 }],
  ]);
  const flow = (from: string, to: string, label = 'x', extra: Partial<Connector> = {}): Connector => ({
    key: `${from}->${to}`,
    from,
    to,
    label,
    head: 'filled',
    ...extra,
  });

  it('runs edge to edge with the arrowhead touching the target', () => {
    const [r] = routeConnectors([flow('a', 'b', 'booking_details')], shapes);
    close(r.points[0], 164, 100);
    close(r.points[1], 336, 100);
    close(r.head![0], 336, 100);
    expect(r.line[1].x).toBeCloseTo(327, 6); // stroke stops inside the arrowhead
    close(r.label!.centre, 250, 100);
    expect(r.label!.box.w).toBeGreaterThan(textWidth('booking_details'));
  });

  it('bends through via points and pins labels with labelAt', () => {
    const [r] = routeConnectors([flow('a', 'c', 'x', { via: [{ x: 100, y: 300 }], labelAt: { x: 60, y: 200 } })], shapes);
    close(r.points[0], 100, 124); // leaves a downwards towards the bend
    close(r.points[1], 100, 300);
    close(r.points[2], 316, 300); // meets the ellipse's left end
    close(r.label!.centre, 60, 200);
  });

  it('spreads two flows between the same pair and puts each label outside', () => {
    const [ab, ba] = routeConnectors([flow('a', 'b', 'request'), flow('b', 'a', 'reply')], shapes);
    expect(Math.abs(ab.points[0].y - ba.points[0].y)).toBeCloseTo(PARALLEL_GAP, 6);
    expect(ab.label!.centre.y).toBeLessThan(ab.points[0].y);
    expect(ba.label!.centre.y).toBeGreaterThan(ba.points[0].y);
    expect(ab.label!.box.y + ab.label!.box.h).toBeLessThanOrEqual(ab.points[0].y);
    // Both ends still sit on the boundaries.
    expect(contains(shapes.get('b')!, ab.points[1])).toBe(true);
    expect(ab.points[0].x).toBeCloseTo(164, 6);
  });

  it('keeps unlabelled flows, gives them an anchor and skips unknown nodes', () => {
    const routed = routeConnectors([flow('a', 'b', ''), flow('a', 'zzz')], shapes);
    expect(routed).toHaveLength(1);
    expect(routed[0].label).toBeNull();
    close(routed[0].anchor, 250, 100);
  });

  it('draws open heads for dependencies and no head for associations', () => {
    const [open, plain] = routeConnectors([flow('b', 'c', '<<includes>>', { head: 'open' }), flow('a', 'c', '', { head: 'none' })], shapes);
    expect(open.head).toHaveLength(3);
    close(open.head![1], 400, 272);
    expect(plain.head).toBeNull();
    expect(plain.line).toEqual(plain.points);
  });
});

describe('text measurement', () => {
  it('estimates wider text for longer and bolder labels', () => {
    expect(textWidth('booking_details')).toBeGreaterThan(textWidth('booking'));
    expect(textWidth('Customer', 14, true)).toBeGreaterThan(textWidth('Customer'));
    // Measured in Chromium: 'Make a booking' is 6.953 em-thousandths x 14 px = 97.3 px.
    expect(textWidth('Make a booking')).toBeGreaterThan(97.3);
    expect(textWidth('Make a booking')).toBeLessThan(103);
  });

  it('wraps on spaces and breaks long snake_case after underscores', () => {
    expect(wrapText('Process booking request', 80)).toEqual(['Process', 'booking', 'request']);
    expect(wrapText('Process booking request', 200)).toEqual(['Process booking request']);
    expect(wrapText('customer_booking_confirmation_details', 130, { breakUnderscores: true })).toEqual([
      'customer_booking_',
      'confirmation_details',
    ]);
    expect(wrapText('customer_booking_confirmation_details', 100, { breakUnderscores: true })).toEqual([
      'customer_',
      'booking_',
      'confirmation_',
      'details',
    ]);
    expect(wrapText('', 100)).toEqual(['']);
  });
});
