import type { ReactNode } from 'react';
import type { KkId } from '../content/schema';
import { kkById, studyDesign } from '../content/studyDesign';
import styles from './Tag.module.css';

export interface TagProps {
  /** The identifier shown in the box, e.g. "U3O1-KK04". */
  children: ReactNode;
  /** Optional plain-text title shown after the box, e.g. "Data types". */
  title?: string;
  className?: string;
}

/** A small identifier tag (KK ids, area ids). Martian Mono in a hairline box. */
export function Tag({ children, title, className }: TagProps) {
  return (
    <span className={[styles.tag, className].filter(Boolean).join(' ')}>
      <span className={styles.id}>{children}</span>
      {title ? <span className={styles.title}>{title}</span> : null}
    </span>
  );
}

/** Title of a KK or group from the study design map, or undefined when unknown. */
function kkTitle(kk: KkId): string | undefined {
  if (kk === 'TERMS' || kk === 'PSM') return studyDesign.groups.find((g) => g.id === kk)?.title;
  return kkById.get(kk)?.title;
}

export interface KkTagProps {
  kk: KkId;
  /** Show the KK's title after its id (default false: the id alone, with the title for screen readers). */
  showTitle?: boolean;
  className?: string;
}

/** A KK tag, e.g. "U3O1-KK04 Data types". The title comes from the study design map. */
export function KkTag({ kk, showTitle = false, className }: KkTagProps) {
  const title = kkTitle(kk);
  if (kk === 'TERMS' || kk === 'PSM') {
    return <Tag className={className}>{title ?? kk}</Tag>;
  }
  return (
    <span className={[styles.tag, className].filter(Boolean).join(' ')}>
      <span className={styles.id}>{kk}</span>
      {title ? <span className={showTitle ? styles.title : styles.srOnly}>{title}</span> : null}
    </span>
  );
}
