/**
 * The hand-laid use case layout, checked the way the renderer draws it: links are routed with the
 * figures' own routeConnectors, then no line may pass through an actor, an actor's name or a use
 * case it doesn't join, and no <<includes>> or <<extends>> label may overlap another label, a
 * shape, or a line it doesn't belong to. Runs for every system and every error.
 */
import { describe, expect, it } from 'vitest';
import type { UseCaseDiagram } from '../../content/schema';
import { connectorKey, routeConnectors, type Connector, type LabelBox } from '../../figures/flows';
import { boundsOf, type Pt, type Shape } from '../../figures/geometry';
import { LINE_HEIGHT, textWidth } from '../../figures/text';
import { DEFAULTS } from '../../figures/types';
import { diagramFor, SYSTEMS, USE_CASE_ERRORS } from './systems';

function overlap(a: LabelBox, b: LabelBox, pad = 1): boolean {
  return a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;
}

function crosses(points: readonly Pt[], box: LabelBox, pad = 1): boolean {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
    for (let k = 0; k <= steps; k++) {
      const t = steps ? k / steps : 0;
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (p.x > box.x + pad && p.x < box.x + box.w - pad && p.y > box.y + pad && p.y < box.y + box.h - pad) return true;
    }
  }
  return false;
}

function problems(fig: UseCaseDiagram): string[] {
  const shapes = new Map<string, Shape>();
  const obstacles = new Map<string, LabelBox>();
  for (const a of fig.actors) {
    shapes.set(a.id, { kind: 'rect', cx: a.x, cy: a.y, w: 40, h: 72 });
    obstacles.set(a.id, boundsOf({ kind: 'rect', cx: a.x, cy: a.y, w: 40, h: 72 }));
    const w = textWidth(a.label);
    obstacles.set(`${a.id} name`, { x: a.x - w / 2, y: a.y + 40, w, h: LINE_HEIGHT });
  }
  for (const u of fig.useCases) {
    const shape: Shape = { kind: 'ellipse', cx: u.x, cy: u.y, rx: u.rx ?? DEFAULTS.useCaseRx, ry: u.ry ?? DEFAULTS.useCaseRy };
    shapes.set(u.id, shape);
    obstacles.set(u.id, boundsOf(shape));
  }
  const connectors: Connector[] = fig.links.map((l) => ({
    key: connectorKey(l),
    from: l.from,
    to: l.to,
    label: l.type === 'association' ? '' : `<<${l.type}>>`,
    via: l.via,
    labelAt: l.labelAt,
    head: l.type === 'association' ? 'none' : 'open',
  }));
  const routed = routeConnectors(connectors, shapes, fig);
  const out: string[] = [];
  for (const r of routed) {
    for (const [id, box] of obstacles) {
      const owner = id.split(' ')[0];
      if (owner === r.connector.from || owner === r.connector.to) continue;
      // Use case bounding boxes are loose around the ellipse, so ask for a real miss of 4 units.
      if (crosses(r.points, box, id.startsWith('u') ? 4 : 1)) out.push(`link ${r.connector.key} crosses ${id}`);
    }
    if (!r.label) continue;
    const box = r.label.box;
    for (const other of routed) {
      if (other === r) continue;
      if (other.label && overlap(box, other.label.box)) out.push(`label on ${r.connector.key} overlaps label on ${other.connector.key}`);
      if (crosses(other.line, { x: box.x - 4, y: box.y - 4, w: box.w + 8, h: box.h + 8 })) out.push(`label on ${r.connector.key} is crossed by ${other.connector.key}`);
    }
    for (const [id, obstacle] of obstacles) if (overlap(box, obstacle, 2)) out.push(`label on ${r.connector.key} overlaps ${id}`);
  }
  // Actors and use cases don't overlap each other.
  const all = [...obstacles];
  all.forEach(([a, boxA], i) => {
    for (const [b, boxB] of all.slice(i + 1)) if (a.split(' ')[0] !== b.split(' ')[0] && overlap(boxA, boxB, 0)) out.push(`${a} overlaps ${b}`);
  });
  return out;
}

describe('usecase layout', () => {
  it('keeps lines, labels, actors and use cases clear of each other', () => {
    const found: string[] = [];
    for (const sys of SYSTEMS) {
      for (const error of [null, ...USE_CASE_ERRORS]) {
        for (const p of problems(diagramFor(sys, error))) found.push(`${sys.id} ${error ?? 'correct'}: ${p}`);
      }
    }
    expect(found).toEqual([]);
  });
});
