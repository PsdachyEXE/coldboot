/** Pieces shared by the paper and marking views: section tabs, the question list, the flag icon and the discard dialog. */
import { useRef, type KeyboardEvent } from 'react';
import { announce } from '../ui/announce';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { VisuallyHidden } from '../ui/VisuallyHidden';
import { EXAM_PANEL_ID, tabId } from './hooks';
import { SECTION_LETTER } from './links';
import { useExam, type SectionId } from './store';
import styles from './Exam.module.css';

/** A small flag, drawn so it doesn't depend on a font having the glyph. */
export function FlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false" className={className}>
      <path d="M2.5 1v10.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M3 1.5h7.5L8.5 4l2 2.5H3z" fill="currentColor" />
    </svg>
  );
}

export interface SectionTab {
  id: SectionId;
  /** Read after "Section A", e.g. "20 marks". */
  detail: string;
}

/**
 * Section tabs A, B and C (only sections the paper has). Arrow keys, Home and End move between
 * them and select as they go, as tabs do.
 */
export function SectionTabs({ tabs, current, onSelect }: { tabs: readonly SectionTab[]; current: SectionId; onSelect(section: SectionId): void }) {
  const refs = useRef(new Map<SectionId, HTMLButtonElement>());
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = tabs.findIndex((t) => t.id === current);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next === -1) return;
    e.preventDefault();
    onSelect(tabs[next].id);
    refs.current.get(tabs[next].id)?.focus();
  };
  return (
    <div role="tablist" aria-label="Sections" className={styles.tabs}>
      {tabs.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            if (el) refs.current.set(t.id, el);
            else refs.current.delete(t.id);
          }}
          type="button"
          role="tab"
          id={tabId(t.id)}
          aria-selected={t.id === current}
          aria-controls={EXAM_PANEL_ID}
          tabIndex={t.id === current ? 0 : -1}
          className={styles.tab}
          onClick={() => onSelect(t.id)}
          onKeyDown={onKeyDown}
        >
          Section {SECTION_LETTER[t.id]}
          <VisuallyHidden>{`, ${t.detail}`}</VisuallyHidden>
        </button>
      ))}
    </div>
  );
}

export interface QuestionState {
  id: string;
  /** Solid box when true, dashed when false. */
  answered: boolean;
  flagged: boolean;
  /** A second line, e.g. "2/3" or "✓" while marking. */
  sub?: string;
  /** Spoken after "Question 3", e.g. "answered, flagged" or "2 of 3 marks". */
  spoken: string;
}

/** The question numbers in a section. */
export function QuestionList({
  section,
  items,
  current,
  onGo,
}: {
  section: SectionId;
  items: readonly QuestionState[];
  current: number;
  onGo(index: number): void;
}) {
  const tall = items.some((q) => q.sub);
  return (
    <nav aria-label={`Section ${SECTION_LETTER[section]} questions`}>
      <ol className={styles.qlist}>
        {items.map((q, i) => (
          <li key={q.id}>
            <button
              type="button"
              className={[styles.qbtn, tall ? styles.qbtnTall : ''].filter(Boolean).join(' ')}
              data-answered={q.answered ? 'true' : 'false'}
              aria-current={i === current ? 'true' : undefined}
              aria-label={`Question ${i + 1}${q.spoken ? `, ${q.spoken}` : ''}`}
              onClick={() => onGo(i)}
            >
              <span aria-hidden="true">{i + 1}</span>
              {q.sub ? (
                <span className={styles.qsub} aria-hidden="true">
                  {q.sub}
                </span>
              ) : null}
              {q.flagged ? <FlagIcon className={styles.qflag} /> : null}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Confirms "Stop and discard this paper". */
export function DiscardDialog({ open, onClose, onDiscard }: { open: boolean; onClose(): void; onDiscard?(): void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Stop and discard this paper?"
      actions={
        <>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              useExam.getState().discard();
              announce('Paper discarded.');
              onDiscard?.();
            }}
          >
            Discard paper
          </Button>
          <Button onClick={onClose}>Keep this paper</Button>
        </>
      }
    >
      <p>Your answers will be deleted, and nothing from this paper is recorded. This can't be undone.</p>
    </Dialog>
  );
}
