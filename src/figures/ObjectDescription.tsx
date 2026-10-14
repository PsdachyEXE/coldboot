/**
 * Object description in VCAA's layout: a bordered box of three rows, headed Name,
 * Properties/Attributes and Methods. A property is written `name (type)`, or by name alone when
 * it has no data type; a method keeps its brackets and any parameters. A member's optional
 * description sits on its own line beneath it. A semantic HTML table rather than SVG: the text
 * wraps to fit a phone instead of scrolling sideways, stays selectable, and screen readers can move
 * through it row by row.
 */
import { Fragment, type ReactNode } from 'react';
import type { ObjectDescription } from '../content/schema';
import { cx } from './cx';
import { propertyText } from './describe';
import type { BodyProps } from './types';
import styles from './Figure.module.css';

interface Member {
  /** The id `highlight` uses: the property or method name. */
  id: string;
  text: ReactNode;
  description?: string;
}

/**
 * A method name with a line break allowed before each parameter (after the opening bracket or a
 * comma), so a long signature on a phone wraps at its parameters rather than inside a name.
 */
function methodText(name: string): ReactNode {
  return name.split(/(?<=[(,])(?!\))/).map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
    </Fragment>
  ));
}

function Members({ members, markers }: { members: Member[]; markers: ReadonlyMap<string, string> }) {
  if (!members.length) return <>None</>;
  return (
    <ul className={styles.members}>
      {members.map((m, i) => {
        const marker = markers.get(m.id);
        return (
          <li key={`${i}:${m.id}`} className={cx(marker && styles.marked)}>
            {m.text}
            {marker && <span className={styles.rowMarker}>({marker})</span>}
            {m.description && <span className={styles.memberNote}>{m.description}</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function ObjectDescriptionView({ figure: f, markers, titleId }: BodyProps<ObjectDescription>) {
  const properties = f.properties.map((p) => ({ id: p.name, text: propertyText(p), description: p.description }));
  const methods = f.methods.map((m) => ({ id: m.name, text: methodText(m.name), description: m.description }));
  return (
    <table className={cx(styles.table, styles.objectTable)} aria-labelledby={titleId}>
      <tbody>
        <tr>
          <th scope="row">Name</th>
          <td>{f.name}</td>
        </tr>
        <tr>
          {/* Wraps after the slash, as VCAA's does, so the headings stay narrow on a phone. */}
          <th scope="row">
            Properties/
            <wbr />
            Attributes
          </th>
          <td>
            <Members members={properties} markers={markers} />
          </td>
        </tr>
        <tr>
          <th scope="row">Methods</th>
          <td>
            <Members members={methods} markers={markers} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
