/**
 * Renders one TerminalBlock. Plain text is always React text; only blocks built from bundled content
 * (markdown, pseudo, and choices or feedback with `markdown: true`) go through the Markdown renderer.
 */
import { memo, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { renderPseudo } from '../content/markdown';
import { FigureView } from '../figures';
import { useScrollable } from '../figures/useScrollable';
import { Markdown } from '../ui/Markdown';
import { useScrollableChildren } from '../ui/useScrollableChildren';
import type { TerminalBlock } from './blocks';
import styles from './Block.module.css';

const LETTERS = 'ABCDEFGH';

function cx(...names: (string | false | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

interface BlockViewProps {
  block: TerminalBlock;
  /** Play the incorrect-answer nudge. The view passes it for new blocks only, never under reduced motion. */
  animate?: boolean;
  /** Called when a link block is followed (the drawer closes). */
  onNavigate?: () => void;
}

function Progress({ current, total, label }: { current: number; total: number; label?: string }) {
  const bar = total <= 20 ? `[${'#'.repeat(current)}${'.'.repeat(Math.max(0, total - current))}]` : '';
  return (
    <p className={styles.progress}>
      {label ?? 'Question'} {current} of {total}
      {bar && (
        <span className={styles.bar} aria-hidden="true">
          {bar}
        </span>
      )}
    </p>
  );
}

/**
 * A table. On phones a two-column table stacks each row (see Block.module.css); the explicit roles
 * keep it a table for screen readers when its rows display as blocks. When the table is wider than
 * the terminal, its scroll box becomes a labelled tab stop so keyboard users can scroll it.
 */
function TableBlock({ block }: { block: Extract<TerminalBlock, { kind: 'table' }> }) {
  const [ref, scrollable] = useScrollable<HTMLDivElement>();
  // Columns whose cells are all numbers line up on the right.
  const numeric = block.columns.map((_, i) => i > 0 && block.rows.length > 0 && block.rows.every((r) => /^-?[\d,.]+$/.test(r[i] ?? '')));
  const align = (i: number) => (numeric[i] ? styles.numeric : undefined);
  const stacked = block.columns.length === 2;
  return (
    <div
      ref={ref}
      className={styles.tableWrap}
      tabIndex={scrollable ? 0 : undefined}
      role={scrollable ? 'region' : undefined}
      aria-label={scrollable ? `${block.caption ?? 'Table'} (scrolls sideways)` : undefined}
    >
      <table className={cx(styles.table, stacked && styles.stacked)} role="table">
        {block.caption && <caption className={styles.caption}>{block.caption}</caption>}
        <thead role="rowgroup">
          <tr role="row">
            {block.columns.map((c, i) => (
              <th key={i} scope="col" role="columnheader" className={align(i)}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {block.rows.map((row, r) => (
            <tr key={r} role="row">
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row" role="rowheader">
                    {cell}
                  </th>
                ) : (
                  <td key={i} role="cell" className={align(i)}>
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A pseudocode listing. A listing wider than the terminal scrolls, and is then a labelled tab stop. */
function PseudoBlock({ block }: { block: Extract<TerminalBlock, { kind: 'pseudo' }> }) {
  const ref = useRef<HTMLDivElement>(null);
  const html = useMemo(() => renderPseudo(block.code, { highlightLines: block.highlightLines }), [block.code, block.highlightLines]);
  useScrollableChildren(ref, 'pre', () => block.title ?? 'Pseudocode', html);
  return (
    <figure className={styles.pseudo}>
      {block.title && <figcaption className={styles.caption}>{block.title}</figcaption>}
      {block.indexBase !== undefined && <p className={styles.caption}>Array indexes start at {block.indexBase}.</p>}
      <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
}

/** Preformatted text. It scrolls sideways when too wide (and is then a tab stop), unless it wraps. */
function PreBlock({ block }: { block: Extract<TerminalBlock, { kind: 'pre' }> }) {
  const [ref, scrollable] = useScrollable<HTMLPreElement>();
  const focusable = scrollable && !block.wrap;
  return (
    <figure className={styles.preBlock}>
      {block.label && <figcaption className={styles.caption}>{block.label}</figcaption>}
      <pre
        ref={ref}
        className={cx(styles.pre, block.wrap && styles.preWrap)}
        tabIndex={focusable ? 0 : undefined}
        role={focusable ? 'region' : undefined}
        aria-label={focusable ? `${block.label ?? 'Text'} (scrolls sideways)` : undefined}
      >
        {block.text}
      </pre>
    </figure>
  );
}

export const BlockView = memo(function BlockView({ block, animate = false, onNavigate }: BlockViewProps) {
  switch (block.kind) {
    case 'text':
      return <p className={cx(styles.text, styles[block.tone ?? 'normal'])}>{block.text}</p>;

    case 'markdown':
      return <Markdown text={block.text} className={cx(styles.markdown, block.tone === 'muted' && styles.markdownMuted)} />;

    case 'pseudo':
      return <PseudoBlock block={block} />;

    case 'table':
      return <TableBlock block={block} />;

    case 'figure':
      return (
        <div className={styles.figure}>
          <FigureView figure={block.figure} />
        </div>
      );

    case 'link':
      return (
        <p className={styles.text}>
          <Link to={block.to} className={styles.link} onClick={onNavigate}>
            {block.label}
          </Link>
        </p>
      );

    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={cx(styles.list, block.ordered && styles.ordered)}>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </Tag>
      );
    }

    case 'pre':
      return <PreBlock block={block} />;

    case 'choices':
      return (
        <ol className={styles.choices}>
          {block.options.map((option, i) => (
            <li key={i} className={styles.choice}>
              <span className={styles.choiceLabel}>{block.labels === 'numbers' ? `${i + 1}.` : `${LETTERS[i]}.`}</span>
              {block.markdown ? <Markdown inline text={option} className={styles.inline} /> : <span>{option}</span>}
            </li>
          ))}
        </ol>
      );

    case 'feedback':
      return (
        <div className={cx(styles.feedback, block.correct ? styles.feedbackCorrect : styles.feedbackIncorrect, !block.correct && animate && styles.nudge)}>
          <p className={cx(styles.verdict, block.correct ? styles.correct : styles.incorrect)}>
            <span aria-hidden="true">{block.correct ? '✓' : '✗'}</span> {block.correct ? 'Correct' : 'Incorrect'}
          </p>
          {!block.correct && block.expected && (
            <p className={styles.expected}>
              Expected: {block.markdown ? <Markdown inline text={block.expected} className={styles.inline} /> : block.expected}
            </p>
          )}
          {block.reason &&
            (block.markdown ? <Markdown text={block.reason} className={styles.reasonMd} /> : <p className={styles.reason}>{block.reason}</p>)}
        </div>
      );

    case 'progress':
      return <Progress current={block.current} total={block.total} label={block.label} />;

    case 'command':
      return (
        <p className={styles.command}>
          <span className={styles.commandPrompt}>{block.prompt}</span> <span className={styles.commandInput}>{block.input}</span>
        </p>
      );

    case 'rule':
      return <hr className={styles.rule} />;
  }
});
