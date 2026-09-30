/**
 * The hand-laid dfd layouts, checked the way the renderer draws them: every flow is routed with
 * the figures' own routeConnectors, then no label may overlap another label, a node, or a line it
 * doesn't belong to. This runs for every business, every view, the correct diagrams and every
 * injected error, on both kinds of diagram.
 */
import { describe, expect, it } from 'vitest';
import type { ContextDiagram, Dfd } from '../../content/schema';
import { connectorKey, routeConnectors, type Connector, type LabelBox, type RoutedConnector } from '../../figures/flows';
import { boundsOf, type Pt, type Shape } from '../../figures/geometry';
import { DEFAULTS } from '../../figures/types';
import { buildContext, buildDfd, injectionsFor, VIEWS, type DiagramKind } from './diagrams';
import { SYSTEMS } from './systems';

function shapesOf(fig: Dfd | ContextDiagram): Map<string, Shape> {
  const shapes = new Map<string, Shape>();
  if (fig.kind === 'context') {
    shapes.set('system', { kind: 'circle', cx: fig.system.x, cy: fig.system.y, r: fig.system.r ?? DEFAULTS.systemR });
    for (const e of fig.entities) shapes.set(e.id, { kind: 'rect', cx: e.x, cy: e.y, w: e.w ?? DEFAULTS.entityW, h: e.h ?? DEFAULTS.entityH });
  } else {
    for (const n of fig.nodes) {
      if (n.type === 'process') shapes.set(n.id, { kind: 'circle', cx: n.x, cy: n.y, r: n.w ? n.w / 2 : DEFAULTS.processR });
      else if (n.type === 'store') shapes.set(n.id, { kind: 'rect', cx: n.x, cy: n.y, w: n.w ?? DEFAULTS.storeW, h: n.h ?? DEFAULTS.storeH });
      else shapes.set(n.id, { kind: 'rect', cx: n.x, cy: n.y, w: n.w ?? DEFAULTS.entityW, h: n.h ?? DEFAULTS.entityH });
    }
  }
  return shapes;
}

function route(fig: Dfd | ContextDiagram): { routed: RoutedConnector[]; shapes: Map<string, Shape> } {
  const shapes = shapesOf(fig);
  const connectors: Connector[] = fig.flows.map((f) => ({ key: connectorKey(f), from: f.from, to: f.to, label: f.label, via: f.via, labelAt: f.labelAt, head: 'filled' }));
  return { routed: routeConnectors(connectors, shapes, fig), shapes };
}

function overlap(a: LabelBox, b: LabelBox, pad = 1): boolean {
  return a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;
}

function inside(p: Pt, box: LabelBox, pad = 1): boolean {
  return p.x > box.x + pad && p.x < box.x + box.w - pad && p.y > box.y + pad && p.y < box.y + box.h - pad;
}

/** True when the polyline passes through the box (sampled every unit). */
function crosses(points: readonly Pt[], box: LabelBox): boolean {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
    for (let k = 0; k <= steps; k++) {
      const t = steps ? k / steps : 0;
      if (inside({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, box)) return true;
    }
  }
  return false;
}

function problems(fig: Dfd | ContextDiagram): string[] {
  const { routed, shapes } = route(fig);
  const out: string[] = [];
  const labelled = routed.filter((r) => r.label);
  // A marked label gets a ring 4 units out and a marker tag on the ring's top-right corner, so
  // labels keep that much room between them, and a tag never covers another label.
  const ring = (b: LabelBox): LabelBox => ({ x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 });
  const tag = (b: LabelBox): LabelBox => ({ x: b.x + b.w + 4 - 9, y: b.y - 4 - 9, w: 18, h: 18 });
  labelled.forEach((r, i) => {
    const box = r.label!.box;
    const name = r.connector.label;
    for (const other of labelled.slice(i + 1)) if (overlap(ring(box), ring(other.label!.box))) out.push(`label ${name} is too close to label ${other.connector.label}`);
    for (const other of labelled) if (other !== r && overlap(tag(box), other.label!.box)) out.push(`the marker on ${name} would cover label ${other.connector.label}`);
    for (const [id, shape] of shapes) if (overlap(box, boundsOf(shape) as LabelBox, 0)) out.push(`label ${name} overlaps node ${id}`);
    for (const other of routed) if (other !== r && crosses(other.line, ring(box))) out.push(`label ${name} is crossed by ${other.connector.label || other.connector.key}`);
    if (box.x < 0 || box.y < 0 || box.x + box.w > fig.width || box.y + box.h > fig.height) out.push(`label ${name} leaves the canvas`);
  });
  // No line passes through a node it doesn't join.
  for (const r of routed) {
    for (const [id, shape] of shapes) {
      if (id === r.connector.from || id === r.connector.to) continue;
      if (crosses(r.points, boundsOf(shape) as LabelBox)) out.push(`flow ${r.connector.label || r.connector.key} crosses node ${id}`);
    }
  }
  return out;
}

describe('dfd layouts', () => {
  for (const kind of ['dfd', 'context'] as DiagramKind[]) {
    it(`keep every ${kind} label clear of other labels, nodes and lines`, () => {
      const found: string[] = [];
      for (const sys of SYSTEMS) {
        for (const view of VIEWS) {
          for (const injection of [null, ...injectionsFor(sys, kind)]) {
            const fig = kind === 'dfd' ? buildDfd(sys, { view, injection }) : buildContext(sys, { view, injection });
            for (const p of problems(fig)) found.push(`${sys.id} view ${view} ${injection ?? 'correct'}: ${p}`);
          }
        }
      }
      expect([...new Set(found)]).toEqual([]);
    });
  }
});
