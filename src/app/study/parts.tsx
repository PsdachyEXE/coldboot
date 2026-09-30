/** Small pieces shared by the study screens. */
import { useEffect, useRef, type ReactNode } from 'react';
import type { KkId } from '../../content/schema';
import { KkTag } from '../../ui/Tag';
import { Markdown } from '../../ui/Markdown';
import styles from './study.module.css';

/** The KKs an item is tagged with, ids and titles. */
export function KkTagList({ kks, label = 'Key knowledge' }: { kks: readonly KkId[]; label?: string }) {
  return (
    <ul className={styles.tags} aria-label={label}>
      {kks.map((kk) => (
        <li key={kk}>
          <KkTag kk={kk} showTitle />
        </li>
      ))}
    </ul>
  );
}

/** The common misconception for an item (bundled content, so Markdown). */
export function MistakeNote({ text }: { text: string }) {
  return (
    <aside className={styles.mistake} aria-label="Common mistake">
      <p className={styles.mistakeTitle}>Common mistake</p>
      <Markdown text={text} />
    </aside>
  );
}

/**
 * A heading for a phase of a study screen ("Review complete"). With `focus`, it takes focus when it
 * mounts, so keyboard and screen reader users start at the new phase.
 */
export function PhaseHeading({ level = 1, focus = false, children }: { level?: 1 | 2; focus?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus]);
  const Tag = level === 1 ? 'h1' : 'h2';
  return (
    <Tag ref={ref} tabIndex={-1} className={styles.focusTarget}>
      {children}
    </Tag>
  );
}
