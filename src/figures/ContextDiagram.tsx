/**
 * Context diagram: the system as one circle labelled with its name, external entities as
 * rectangles, and labelled data flows between them drawn edge to edge.
 */
import { useMemo } from 'react';
import type { ContextDiagram } from '../content/schema';
import { connectorKey, routeConnectors, type Connector } from './flows';
import type { Shape } from './geometry';
import { Canvas, ConnectorLabel, ConnectorLine, Highlights, ShapeOutline, TextLines } from './svg';
import { wrapText } from './text';
import { DEFAULTS, INSET, type BodyProps } from './types';
import styles from './Figure.module.css';

function layout(f: ContextDiagram) {
  const r = f.system.r ?? DEFAULTS.systemR;
  const shapes = new Map<string, Shape>([['system', { kind: 'circle', cx: f.system.x, cy: f.system.y, r }]]);
  const entities = f.entities.map((e) => {
    const w = e.w ?? DEFAULTS.entityW;
    const shape: Shape = { kind: 'rect', cx: e.x, cy: e.y, w, h: e.h ?? DEFAULTS.entityH };
    shapes.set(e.id, shape);
    return { entity: e, shape, lines: wrapText(e.label, w - 2 * INSET) };
  });
  const connectors: Connector[] = f.flows.map((fl) => ({
    key: connectorKey(fl),
    from: fl.from,
    to: fl.to,
    label: fl.label,
    via: fl.via,
    labelAt: fl.labelAt,
    head: 'filled',
  }));
  return {
    system: { shape: shapes.get('system')!, lines: wrapText(f.system.label, r * 1.5, { bold: true }) },
    entities,
    shapes,
    routed: routeConnectors(connectors, shapes),
  };
}

export function ContextDiagramView({ figure: f, markers, title, desc }: BodyProps<ContextDiagram>) {
  const { system, entities, shapes, routed } = useMemo(() => layout(f), [f]);
  return (
    <Canvas width={f.width} height={f.height} title={title} desc={desc}>
      {routed.map((c, i) => (
        <ConnectorLine key={i} routed={c} />
      ))}
      <g data-node="system">
        <ShapeOutline shape={system.shape} />
        <TextLines lines={system.lines} x={f.system.x} y={f.system.y} className={styles.bold} />
      </g>
      {entities.map(({ entity, shape, lines }) => (
        <g key={entity.id} data-node={entity.id}>
          <ShapeOutline shape={shape} />
          <TextLines lines={lines} x={entity.x} y={entity.y} />
        </g>
      ))}
      {routed.map((c, i) => (
        <ConnectorLabel key={i} routed={c} />
      ))}
      <Highlights markers={markers} routed={routed} shapes={shapes} canvas={f} />
    </Canvas>
  );
}
