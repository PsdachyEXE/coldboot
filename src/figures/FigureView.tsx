/**
 * Renders any Figure from its structured data (Section 8.4): one component per kind, each inside
 * a <figure> whose <figcaption> carries the title and caption, followed by a "Text description"
 * disclosure generated from the same data.
 */
import { Fragment, useMemo, type ReactNode } from 'react';
import type { Figure } from '../content/schema';
import { ContextDiagramView } from './ContextDiagram';
import { cx } from './cx';
import { DfdDiagramView } from './DfdDiagram';
import { describeFigure, shortDescription, type FigureDescription } from './describe';
import { GanttChartView } from './gantt/GanttChart';
import { highlightMarkers, type Highlight } from './highlight';
import { MockupFigureView } from './MockupFigure';
import { ObjectDescriptionView } from './ObjectDescription';
import { PseudocodeFigureView } from './PseudocodeFigure';
import { TableFigureView } from './TableFigure';
import type { BodyProps } from './types';
import { UseCaseDiagramView } from './UseCaseDiagram';
import { useFigureId } from './useScrollable';
import styles from './Figure.module.css';

export interface FigureViewProps {
  figure: Figure;
  /**
   * Elements to ring with a dashed cobalt outline and a text marker: an array of ids (marked A,
   * B, C, ...) or an object mapping ids to their marker text. See src/figures/highlight.ts.
   */
  highlight?: Highlight;
  /** Tighter spacing and a 14 px caption, for terminal output. */
  compact?: boolean;
}

function defaultTitle(f: Figure): string {
  switch (f.kind) {
    case 'context':
      return 'Context diagram';
    case 'dfd':
      return f.level === undefined ? 'Data flow diagram' : `Level ${f.level} data flow diagram`;
    case 'usecase':
      return 'Use case diagram';
    case 'gantt':
      return 'Gantt chart';
    case 'object':
      return `Object description: ${f.name}`;
    case 'pseudocode':
      return 'Pseudocode';
    case 'table':
      return 'Table';
    case 'mockup':
      return 'Mock-up';
  }
}

function Body({ figure, ...props }: Omit<BodyProps<Figure>, 'figure'> & { figure: Figure }) {
  switch (figure.kind) {
    case 'context':
      return <ContextDiagramView figure={figure} {...props} />;
    case 'dfd':
      return <DfdDiagramView figure={figure} {...props} />;
    case 'usecase':
      return <UseCaseDiagramView figure={figure} {...props} />;
    case 'gantt':
      return <GanttChartView figure={figure} {...props} />;
    case 'object':
      return <ObjectDescriptionView figure={figure} {...props} />;
    case 'pseudocode':
      return <PseudocodeFigureView figure={figure} {...props} />;
    case 'table':
      return <TableFigureView figure={figure} {...props} />;
    case 'mockup':
      return <MockupFigureView figure={figure} {...props} />;
  }
}

function TextDescription({ description }: { description: FigureDescription }) {
  const id = useFigureId();
  return (
    <details className={styles.details}>
      <summary>Text description</summary>
      <p className={styles.descSummary}>{description.summary}</p>
      {description.sections.map((s, i) => (
        <Fragment key={i}>
          <p className={styles.descHeading} id={`${id}-${i}`}>
            {s.heading}
          </p>
          <ul className={styles.descList} aria-labelledby={`${id}-${i}`}>
            {s.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        </Fragment>
      ))}
    </details>
  );
}

/** Caption notes: the array index base for pseudocode, and which lines or rows are marked. */
function captionNotes(figure: Figure, markers: ReadonlyMap<string, string>): ReactNode[] {
  const notes: ReactNode[] = [];
  if (figure.kind === 'pseudocode' && figure.indexBase !== undefined) {
    notes.push(`Arrays are indexed from ${figure.indexBase}.`);
  }
  if ((figure.kind === 'pseudocode' || figure.kind === 'table') && markers.size) {
    const what = figure.kind === 'pseudocode' ? 'line' : 'row';
    const marked = [...markers].filter(([id]) => /^\d+$/.test(id)).map(([id, m]) => `${what} ${id} (${m})`);
    if (marked.length) notes.push(`Marked: ${marked.join(', ')}.`);
  }
  return notes;
}

export function FigureView({ figure, highlight, compact = false }: FigureViewProps) {
  const titleId = useFigureId();
  const markers = useMemo(() => highlightMarkers(highlight), [highlight]);
  const description = useMemo(() => describeFigure(figure, markers), [figure, markers]);
  const title = figure.title ?? defaultTitle(figure);
  const notes = captionNotes(figure, markers);
  return (
    <figure className={cx(styles.figure, compact && styles.compact)} data-figure={figure.kind} data-figure-id={figure.id}>
      <figcaption className={styles.caption}>
        <span className={styles.title} id={titleId}>
          {title}
        </span>
        {figure.caption && <span className={styles.captionText}>{figure.caption}</span>}
        {notes.map((n, i) => (
          <span key={i} className={styles.note}>
            {n}
          </span>
        ))}
      </figcaption>
      <Body figure={figure} markers={markers} title={title} titleId={titleId} desc={shortDescription(description)} />
      <TextDescription description={description} />
    </figure>
  );
}
