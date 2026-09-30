/**
 * Shared SVG building blocks for figures. Geometry comes in as numbers and goes out as attributes;
 * colour and type come only from classes in Figure.module.css, never from style attributes.
 */
import type { ReactNode } from 'react';
import type { RoutedConnector, LabelBox } from './flows';
import { boundsOf, inflate, pathData, pointsAttr, r1, type Pt, type Shape } from './geometry';
import { baselineOffset, LABEL_SIZE, LINE_HEIGHT, MIN_LABEL_PX, textWidth } from './text';
import { useFigureId, useScrollable } from './useScrollable';
import { cx } from './cx';
import styles from './Figure.module.css';

interface CanvasProps {
  width: number;
  height: number;
  /** Accessible name (the figure title). */
  title: string;
  /** Short description: the summary of the text description. */
  desc: string;
  children: ReactNode;
}

/**
 * An SVG canvas in a sideways scroll box. The SVG is `role="img"`, named by its <title> and
 * <desc>. It shows at its natural size where it fits and scales down on narrower screens, but
 * never below MIN_LABEL_PX / LABEL_SIZE of its width, so labels stay at least 12 px; below that
 * the box scrolls instead of the page.
 */
export function Canvas({ width, height, title, desc, children }: CanvasProps) {
  const id = useFigureId();
  const [ref, scrollable] = useScrollable<HTMLDivElement>();
  const minWidth = Math.ceil((width * MIN_LABEL_PX) / LABEL_SIZE);
  return (
    <div
      ref={ref}
      className={styles.scroll}
      tabIndex={scrollable ? 0 : undefined}
      role={scrollable ? 'group' : undefined}
      aria-label={scrollable ? `${title} (scrolls sideways)` : undefined}
    >
      <div className={styles.stage}>
        <svg
          className={styles.svg}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-labelledby={`${id}-title ${id}-desc`}
          viewBox={`0 0 ${r1(width)} ${r1(height)}`}
          width={r1(width)}
          height={r1(height)}
        >
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-desc`}>{desc}</desc>
          {children}
        </svg>
        <svg className={styles.sizer} width={minWidth} height={0} aria-hidden="true" />
      </div>
    </div>
  );
}

interface TextLinesProps {
  lines: readonly string[];
  /** Anchor point: the vertical centre of the block, and its middle, start or end horizontally. */
  x: number;
  y: number;
  anchor?: 'start' | 'middle' | 'end';
  size?: number;
  lineHeight?: number;
  className?: string;
}

/** A block of lines centred vertically on (x, y). */
export function TextLines({ lines, x, y, anchor = 'middle', size = LABEL_SIZE, lineHeight = LINE_HEIGHT, className }: TextLinesProps) {
  const first = y - ((lines.length - 1) * lineHeight) / 2 + baselineOffset(size);
  return (
    <text className={cx(styles.label, className)} x={r1(x)} y={r1(first)} textAnchor={anchor}>
      {lines.map((line, i) => (
        <tspan key={i} x={r1(x)} dy={i === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/** A connector's line and arrowhead. */
export function ConnectorLine({ routed, dashed = false }: { routed: RoutedConnector; dashed?: boolean }) {
  const { line, head, connector } = routed;
  return (
    <g data-flow={connector.key}>
      <path className={cx(styles.line, dashed && styles.dashed)} d={pathData(line)} />
      {head && connector.head === 'filled' && <polygon className={styles.head} points={pointsAttr(head)} />}
      {head && connector.head === 'open' && <polyline className={styles.line} points={pointsAttr(head)} />}
    </g>
  );
}

/** A connector's label on its --void backing, so it reads cleanly where it crosses lines. */
export function ConnectorLabel({ routed }: { routed: RoutedConnector }) {
  if (!routed.label) return null;
  const { box, centre, lines } = routed.label;
  return (
    <g>
      <rect className={styles.backing} x={r1(box.x)} y={r1(box.y)} width={r1(box.w)} height={r1(box.h)} />
      <TextLines lines={lines} x={centre.x} y={centre.y} />
    </g>
  );
}

function shapeElement(shape: Shape, className: string) {
  switch (shape.kind) {
    case 'circle':
      return <circle className={className} cx={r1(shape.cx)} cy={r1(shape.cy)} r={r1(shape.r)} />;
    case 'ellipse':
      return <ellipse className={className} cx={r1(shape.cx)} cy={r1(shape.cy)} rx={r1(shape.rx)} ry={r1(shape.ry)} />;
    case 'rect':
      return <rect className={className} x={r1(shape.cx - shape.w / 2)} y={r1(shape.cy - shape.h / 2)} width={r1(shape.w)} height={r1(shape.h)} />;
  }
}

export function ShapeOutline({ shape, className }: { shape: Shape; className?: string }) {
  return shapeElement(shape, cx(styles.shape, className));
}

interface CanvasSize {
  width: number;
  height: number;
}

/** A text marker in a small box, kept inside the canvas. */
function MarkerTag({ at, text, canvas }: { at: Pt; text: string; canvas: CanvasSize }) {
  const w = textWidth(text, LABEL_SIZE, true) + 10;
  const h = 20;
  const x = Math.min(Math.max(1, at.x - w / 2), canvas.width - w - 1);
  const y = Math.min(Math.max(1, at.y - h / 2), canvas.height - h - 1);
  return (
    <g>
      <rect className={styles.markerBox} x={r1(x)} y={r1(y)} width={r1(w)} height={h} rx={2} />
      <TextLines lines={[text]} x={x + w / 2} y={y + h / 2} className={styles.markerText} />
    </g>
  );
}

/** A dashed cobalt ring around a shape, with its text marker at the top right. */
export function HighlightRing({ shape, marker, canvas, gap = 6 }: { shape: Shape; marker: string; canvas: CanvasSize; gap?: number }) {
  const ring = inflate(shape, gap);
  const b = boundsOf(ring);
  const corner = ring.kind === 'rect' ? { x: b.x + b.w, y: b.y } : { x: ring.cx + b.w * 0.36, y: ring.cy - b.h * 0.36 };
  return (
    <g data-highlight={marker}>
      {shapeElement(ring, styles.ring)}
      <MarkerTag at={corner} text={marker} canvas={canvas} />
    </g>
  );
}

interface HighlightsProps {
  markers: ReadonlyMap<string, string>;
  routed: readonly RoutedConnector[];
  shapes: ReadonlyMap<string, Shape>;
  canvas: CanvasSize;
}

/** Rings every highlighted node or connector, drawn over everything else. */
export function Highlights({ markers, routed, shapes, canvas }: HighlightsProps) {
  return (
    <>
      {[...markers].flatMap(([id, marker]) => {
        const flows = routed.filter((c) => c.connector.key === id);
        if (flows.length) return flows.map((c, i) => <ConnectorHighlight key={`${id}:${i}`} routed={c} marker={marker} canvas={canvas} />);
        const shape = shapes.get(id);
        return shape ? [<HighlightRing key={id} shape={shape} marker={marker} canvas={canvas} />] : [];
      })}
    </>
  );
}

/** Highlight for a connector: a ring around its label, or around its midpoint when unlabelled. */
export function ConnectorHighlight({ routed, marker, canvas }: { routed: RoutedConnector; marker: string; canvas: CanvasSize }) {
  const box: LabelBox | undefined = routed.label?.box;
  const shape: Shape = box
    ? { kind: 'rect', cx: box.x + box.w / 2, cy: box.y + box.h / 2, w: box.w, h: box.h }
    : { kind: 'circle', cx: routed.anchor.x, cy: routed.anchor.y, r: 8 };
  return <HighlightRing shape={shape} marker={marker} canvas={canvas} gap={4} />;
}
