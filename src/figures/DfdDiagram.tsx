/**
 * Data flow diagram, drawn the VCAA way: a process is a circle holding its name, a data store is
 * two horizontal parallel lines, open at both ends, with its name between them, and an external
 * entity is a rectangle. Processes and stores are known by name alone: a node's optional `number`
 * is never drawn. Flows are labelled one-way arrows drawn edge to edge; an unlabelled flow still
 * draws (the `dfd` game teaches that error).
 */
import { useMemo } from 'react';
import type { Dfd, DfdNode } from '../content/schema';
import { connectorKey, routeConnectors, type Connector } from './flows';
import { r1, type Shape } from './geometry';
import { Canvas, ConnectorLabel, ConnectorLine, Highlights, ShapeOutline, TextLines } from './svg';
import { wrapText } from './text';
import { DEFAULTS, INSET, type BodyProps } from './types';
import styles from './Figure.module.css';

function shapeOf(n: DfdNode): Shape {
  switch (n.type) {
    case 'process':
      return { kind: 'circle', cx: n.x, cy: n.y, r: n.w ? n.w / 2 : DEFAULTS.processR };
    case 'store':
      return { kind: 'rect', cx: n.x, cy: n.y, w: n.w ?? DEFAULTS.storeW, h: n.h ?? DEFAULTS.storeH };
    case 'entity':
      return { kind: 'rect', cx: n.x, cy: n.y, w: n.w ?? DEFAULTS.entityW, h: n.h ?? DEFAULTS.entityH };
  }
}

function Process({ node, shape }: { node: DfdNode; shape: Extract<Shape, { kind: 'circle' }> }) {
  return (
    <>
      <ShapeOutline shape={shape} />
      <TextLines lines={wrapText(node.label, shape.r * 1.5)} x={node.x} y={node.y} />
    </>
  );
}

/**
 * Two lines along the top and bottom of the store's box, with no ends drawn. Flows still meet the
 * box's edge, so one arriving from the side points into the open end. The --void backing keeps
 * the name clear of anything drawn beneath it.
 */
function Store({ node, shape }: { node: DfdNode; shape: Extract<Shape, { kind: 'rect' }> }) {
  const left = shape.cx - shape.w / 2;
  const right = shape.cx + shape.w / 2;
  const top = shape.cy - shape.h / 2;
  const bottom = shape.cy + shape.h / 2;
  return (
    <>
      <rect className={styles.fillVoid} x={r1(left)} y={r1(top)} width={r1(shape.w)} height={r1(shape.h)} />
      <path className={styles.line} d={`M${r1(left)} ${r1(top)} H${r1(right)} M${r1(left)} ${r1(bottom)} H${r1(right)}`} />
      <TextLines lines={wrapText(node.label, shape.w - 2 * INSET)} x={node.x} y={node.y} />
    </>
  );
}

function layout(f: Dfd) {
  const shapes = new Map<string, Shape>(f.nodes.map((n) => [n.id, shapeOf(n)]));
  const connectors: Connector[] = f.flows.map((fl) => ({
    key: connectorKey(fl),
    from: fl.from,
    to: fl.to,
    label: fl.label,
    via: fl.via,
    labelAt: fl.labelAt,
    head: 'filled',
  }));
  return { shapes, routed: routeConnectors(connectors, shapes, f) };
}

export function DfdDiagramView({ figure: f, markers, title, desc }: BodyProps<Dfd>) {
  const { shapes, routed } = useMemo(() => layout(f), [f]);
  return (
    <Canvas width={f.width} height={f.height} title={title} desc={desc}>
      {routed.map((c, i) => (
        <ConnectorLine key={i} routed={c} />
      ))}
      {f.nodes.map((n) => {
        const shape = shapes.get(n.id)!;
        return (
          <g key={n.id} data-node={n.id} data-node-type={n.type}>
            {shape.kind === 'circle' ? (
              <Process node={n} shape={shape} />
            ) : n.type === 'store' && shape.kind === 'rect' ? (
              <Store node={n} shape={shape} />
            ) : (
              <>
                <ShapeOutline shape={shape} />
                <TextLines lines={wrapText(n.label, (shape.kind === 'rect' ? shape.w : DEFAULTS.entityW) - 2 * INSET)} x={n.x} y={n.y} />
              </>
            )}
          </g>
        );
      })}
      {routed.map((c, i) => (
        <ConnectorLabel key={i} routed={c} />
      ))}
      <Highlights markers={markers} routed={routed} shapes={shapes} canvas={f} />
    </Canvas>
  );
}
