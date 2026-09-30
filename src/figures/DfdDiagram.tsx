/**
 * Data flow diagram. Processes are circles with their number above the label, data stores are
 * open-ended rectangles with the store id in a left compartment, and external entities are
 * rectangles. Flows are labelled arrows drawn edge to edge; an unlabelled flow still draws (the
 * `dfd` game teaches that error).
 */
import { useMemo } from 'react';
import type { Dfd, DfdNode } from '../content/schema';
import { connectorKey, routeConnectors, type Connector } from './flows';
import { r1, type Shape } from './geometry';
import { Canvas, ConnectorLabel, ConnectorLine, Highlights, ShapeOutline, TextLines } from './svg';
import { LINE_HEIGHT, textWidth, wrapText } from './text';
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
  const lines = wrapText(node.label, shape.r * 1.5);
  const total = lines.length + (node.number ? 1 : 0);
  const top = node.y - ((total - 1) * LINE_HEIGHT) / 2;
  return (
    <>
      <ShapeOutline shape={shape} />
      {node.number && <TextLines lines={[node.number]} x={node.x} y={top} className={styles.bold} />}
      <TextLines lines={lines} x={node.x} y={node.number ? top + LINE_HEIGHT + ((lines.length - 1) * LINE_HEIGHT) / 2 : node.y} />
    </>
  );
}

function Store({ node, shape }: { node: DfdNode; shape: Extract<Shape, { kind: 'rect' }> }) {
  const left = shape.cx - shape.w / 2;
  const right = shape.cx + shape.w / 2;
  const top = shape.cy - shape.h / 2;
  const bottom = shape.cy + shape.h / 2;
  const compartment = node.number ? Math.max(36, textWidth(node.number, 14, true) + 2 * INSET) : 0;
  const divider = left + compartment;
  const lines = wrapText(node.label, right - divider - 2 * INSET);
  return (
    <>
      <rect className={styles.fillVoid} x={r1(left)} y={r1(top)} width={r1(shape.w)} height={r1(shape.h)} />
      <path className={styles.line} d={`M${r1(right)} ${r1(top)} H${r1(left)} V${r1(bottom)} H${r1(right)}`} />
      {node.number && (
        <>
          <path className={styles.line} d={`M${r1(divider)} ${r1(top)} V${r1(bottom)}`} />
          <TextLines lines={[node.number]} x={left + compartment / 2} y={node.y} className={styles.bold} />
        </>
      )}
      <TextLines lines={lines} x={(divider + right) / 2} y={node.y} />
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
