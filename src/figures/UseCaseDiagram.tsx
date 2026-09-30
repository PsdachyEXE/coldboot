/**
 * Use case diagram: a system boundary with its name at the top left, stick-figure actors with
 * their labels below, and use cases as ellipses. An association is a plain line; an <<includes>>
 * or <<extends>> link is a dashed arrow from `from` to `to`, labelled with its stereotype.
 */
import { useMemo } from 'react';
import type { UseCaseDiagram } from '../content/schema';
import { connectorKey, routeConnectors, type Connector } from './flows';
import { r1, type Shape } from './geometry';
import { Canvas, ConnectorLabel, ConnectorLine, Highlights, ShapeOutline, TextLines } from './svg';
import { LINE_HEIGHT, linesWidth, wrapText } from './text';
import { DEFAULTS, INSET, type BodyProps } from './types';
import styles from './Figure.module.css';

/** The stick figure is 64 units tall; links end on this box around it. */
const ACTOR_BOX = { w: 40, h: 72 };
const ACTOR_LABEL_WIDTH = 132;

function Actor({ x, y, lines }: { x: number; y: number; lines: string[] }) {
  const p = (dx: number, dy: number) => `${r1(x + dx)} ${r1(y + dy)}`;
  return (
    <>
      <circle className={styles.shape} cx={r1(x)} cy={r1(y - 24)} r={8} />
      <path className={styles.line} d={`M${p(0, -16)} L${p(0, 8)} M${p(-16, -8)} L${p(16, -8)} M${p(-13, 32)} L${p(0, 8)} L${p(13, 32)}`} />
      <TextLines lines={lines} x={x} y={y + 32 + INSET + (lines.length * LINE_HEIGHT) / 2} />
    </>
  );
}

function layout(f: UseCaseDiagram) {
  const shapes = new Map<string, Shape>();
  for (const a of f.actors) shapes.set(a.id, { kind: 'rect', cx: a.x, cy: a.y, ...ACTOR_BOX });
  const cases = f.useCases.map((u) => {
    const shape: Shape = { kind: 'ellipse', cx: u.x, cy: u.y, rx: u.rx ?? DEFAULTS.useCaseRx, ry: u.ry ?? DEFAULTS.useCaseRy };
    shapes.set(u.id, shape);
    return { useCase: u, shape, lines: wrapText(u.label, shape.rx * 1.55) };
  });
  const connectors: Connector[] = f.links.map((l) => ({
    key: connectorKey(l),
    from: l.from,
    to: l.to,
    label: l.type === 'association' ? '' : `<<${l.type}>>`,
    via: l.via,
    labelAt: l.labelAt,
    head: l.type === 'association' ? 'none' : 'open',
  }));
  const actors = f.actors.map((a) => ({ actor: a, lines: wrapText(a.label, ACTOR_LABEL_WIDTH) }));
  // A highlighted actor's ring takes in its label as well as the figure.
  const rings = new Map(shapes);
  for (const { actor, lines } of actors) {
    const top = actor.y - 34;
    const bottom = actor.y + 32 + INSET + lines.length * LINE_HEIGHT;
    const w = Math.max(ACTOR_BOX.w, linesWidth(lines) + INSET);
    rings.set(actor.id, { kind: 'rect', cx: actor.x, cy: (top + bottom) / 2, w, h: bottom - top });
  }
  return { shapes, rings, cases, actors, routed: routeConnectors(connectors, shapes, f) };
}

export function UseCaseDiagramView({ figure: f, markers, title, desc }: BodyProps<UseCaseDiagram>) {
  const { rings, cases, actors, routed } = useMemo(() => layout(f), [f]);
  const s = f.system;
  const boundary: Shape = { kind: 'rect', cx: s.x, cy: s.y, w: s.w, h: s.h };
  return (
    <Canvas width={f.width} height={f.height} title={title} desc={desc}>
      <g data-node="boundary">
        <ShapeOutline shape={boundary} />
        <TextLines lines={[s.label]} x={s.x - s.w / 2 + 12} y={s.y - s.h / 2 + 12 + LINE_HEIGHT / 2} anchor="start" className={styles.bold} />
      </g>
      {routed.map((c, i) => (
        <ConnectorLine key={i} routed={c} dashed={c.connector.head === 'open'} />
      ))}
      {actors.map(({ actor, lines }) => (
        <g key={actor.id} data-node={actor.id} data-node-type="actor">
          <Actor x={actor.x} y={actor.y} lines={lines} />
        </g>
      ))}
      {cases.map(({ useCase, shape, lines }) => (
        <g key={useCase.id} data-node={useCase.id} data-node-type="usecase">
          <ShapeOutline shape={shape} />
          <TextLines lines={lines} x={useCase.x} y={useCase.y} />
        </g>
      ))}
      {routed.map((c, i) => (
        <ConnectorLabel key={i} routed={c} />
      ))}
      <Highlights markers={markers} routed={routed} shapes={rings} canvas={f} />
    </Canvas>
  );
}
