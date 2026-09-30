/**
 * Renders one TerminalBlock. Plain text is always React text; only blocks built from bundled content
 * (markdown, pseudo, and choices or feedback with `markdown: true`) go through the Markdown renderer.
 */
import { memo } from 'react';
import { Link } from 'react-router';
import { renderPseudo } from '../content/markdown';
import { FigureView } from '../figures';
import { Markdown } from '../ui/Markdown';
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

export const BlockView = memo(function BlockView({ block, animate = false, onNavigate }: BlockViewProps) {
  switch (block.kind) {
    case 'text':
      return <p className={cx(styles.text, styles[block.tone ?? 'normal'])}>{block.text}</p>;

    case 'markdown':
      return <Markdown text={block.text} className={styles.markdown} />;

    case 'pseudo':
      return (
        <figure className={styles.pseudo}>
          {block.title && <figcaption className={styles.caption}>{block.title}</figcaption>}
          {block.indexBase !== undefined && <p className={styles.caption}>Array indexes start at {block.indexBase}.</p>}
          <div dangerouslySetInnerHTML={{ __html: renderPseudo(block.code, { highlightLines: block.highlightLines }) }} />
        </figure>
      );

    case 'table': {
      const wide = block.columns.length > 6;
      // Columns whose cells are all numbers line up on the right.
      const numeric = block.columns.map((_, i) => i > 0 && block.rows.length > 0 && block.rows.every((r) => /^-?[\d,.]+$/.test(r[i] ?? '')));
      const align = (i: number) => (numeric[i] ? styles.numeric : undefined);
      return (
        <div className={styles.tableWrap} tabIndex={wide ? 0 : undefined} role={wide ? 'region' : undefined} aria-label={wide ? (block.caption ?? 'Table') : undefined}>
          <table className={styles.table}>
            {block.caption && <caption className={styles.caption}>{block.caption}</caption>}
            <thead>
              <tr>
                {block.columns.map((c, i) => (
                  <th key={i} scope="col" className={align(i)}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={i} className={align(i)}>
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

    case 'figure':
      return (
        <div className={styles.figure}>
          <FigureView figure={block.figure} highlight={block.highlight} compact={block.compact} />
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
      return (
        <figure className={styles.preBlock}>
          {block.label && <figcaption className={styles.caption}>{block.label}</figcaption>}
          <pre className={styles.pre}>{block.text}</pre>
        </figure>
      );

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
