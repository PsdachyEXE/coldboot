/**
 * Table figure (test tables, data dictionaries, IPO charts): a semantic <table> whose cells go
 * through the inline Markdown renderer. The first cell of each row is its row header.
 */
import type { TableFigure } from '../content/schema';
import { renderInline } from '../content/markdown';
import { cx } from './cx';
import type { BodyProps } from './types';
import { useScrollable } from './useScrollable';
import styles from './Figure.module.css';

/** Bundled content or a game template only: markdown-it escapes raw HTML. */
function Inline({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderInline(text) }} />;
}

export function TableFigureView({ figure: f, markers, title, titleId }: BodyProps<TableFigure>) {
  const [ref, scrollable] = useScrollable<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={styles.tableScroll}
      tabIndex={scrollable ? 0 : undefined}
      role={scrollable ? 'group' : undefined}
      aria-label={scrollable ? `${title} (scrolls sideways)` : undefined}
    >
      <table className={styles.table} aria-labelledby={titleId}>
        <thead>
          <tr>
            {f.columns.map((c, i) => (
              <th key={i} scope="col">
                <Inline text={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {f.rows.map((row, r) => {
            const marker = markers.get(String(r + 1));
            return (
              <tr key={r} className={cx(marker && styles.marked)}>
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row">
                      <Inline text={cell} />
                      {marker && <span className={styles.rowMarker}>({marker})</span>}
                    </th>
                  ) : (
                    <td key={i}>
                      <Inline text={cell} />
                    </td>
                  ),
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
