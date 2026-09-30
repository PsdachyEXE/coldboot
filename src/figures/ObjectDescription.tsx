/**
 * Object description in the three-part layout: the object name, then its properties with their
 * data types, then its methods. A semantic HTML table rather than SVG: the text wraps, stays
 * selectable, and screen readers can move through it cell by cell.
 */
import type { ObjectDescription } from '../content/schema';
import { cx } from './cx';
import type { BodyProps } from './types';
import { useScrollable } from './useScrollable';
import styles from './Figure.module.css';

function Marker({ text }: { text: string | undefined }) {
  return text ? <span className={styles.rowMarker}>({text})</span> : null;
}

export function ObjectDescriptionView({ figure: f, markers, title, titleId }: BodyProps<ObjectDescription>) {
  const [ref, scrollable] = useScrollable<HTMLDivElement>();
  const described = f.properties.some((p) => p.description) || f.methods.some((m) => m.description);
  const cols = described ? 3 : 2;
  return (
    <div
      ref={ref}
      className={styles.tableScroll}
      tabIndex={scrollable ? 0 : undefined}
      role={scrollable ? 'group' : undefined}
      aria-label={scrollable ? `${title} (scrolls sideways)` : undefined}
    >
      <table className={cx(styles.table, styles.objectTable)} aria-labelledby={titleId}>
        <thead>
          <tr>
            <th scope="colgroup" colSpan={cols} className={styles.objectName}>
              {f.name}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="rowgroup" colSpan={cols} className={styles.section}>
              Properties
            </th>
          </tr>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Data type</th>
            {described && <th scope="col">Description</th>}
          </tr>
          {f.properties.length ? (
            f.properties.map((p) => (
              <tr key={p.name} className={cx(markers.has(p.name) && styles.marked)}>
                <th scope="row">
                  <span className={styles.member}>{p.name}</span>
                  <Marker text={markers.get(p.name)} />
                </th>
                <td>{p.type}</td>
                {described && <td>{p.description}</td>}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={cols}>None</td>
            </tr>
          )}
        </tbody>
        <tbody>
          <tr>
            <th scope="rowgroup" colSpan={cols} className={styles.section}>
              Methods
            </th>
          </tr>
          {f.methods.length ? (
            f.methods.map((m) => (
              <tr key={m.name} className={cx(markers.has(m.name) && styles.marked)}>
                <th scope="row" colSpan={described ? 2 : cols}>
                  <span className={styles.member}>{m.name}</span>
                  <Marker text={markers.get(m.name)} />
                </th>
                {described && <td>{m.description}</td>}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={cols}>None</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
