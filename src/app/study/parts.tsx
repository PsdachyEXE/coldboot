/** Small pieces shared by the study screens. */
import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { KkId } from '../../content/schema';
import { kkLabel } from '../../content/studyDesign';
import { KkTag } from '../../ui/Tag';
import { Markdown } from '../../ui/Markdown';
import { learnPath } from '../paths';
import styles from './study.module.css';

/**
 * The KKs an item is tagged with, ids and titles. With `learn`, each tag opens its Learn page; the
 * study screens pass it once an answer has been seen, never during a live exam.
 */
export function KkTagList({ kks, label = 'Key knowledge', learn = false }: { kks: readonly KkId[]; label?: string; learn?: boolean }) {
  return (
    <ul className={styles.tags} aria-label={label}>
      {kks.map((kk) => (
        <li key={kk}>{learn ? <LearnTag kk={kk} /> : <KkTag kk={kk} showTitle />}</li>
      ))}
    </ul>
  );
}

/** A KK tag that opens the point's Learn page: "Read about U3O1-KK04 Data types in Learn". */
export function LearnTag({ kk }: { kk: KkId }) {
  return (
    <Link to={learnPath({ kk })} className={styles.tagLink} aria-label={`Read about ${kkLabel(kk)} in Learn`}>
      <KkTag kk={kk} showTitle className={styles.tagLinked} />
    </Link>
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
export function PhaseHeading({ level = 1, focus = false, id, children }: { level?: 1 | 2; focus?: boolean; id?: string; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus]);
  const Tag = level === 1 ? 'h1' : 'h2';
  return (
    <Tag ref={ref} id={id} tabIndex={-1} className={styles.focusTarget}>
      {children}
    </Tag>
  );
}
