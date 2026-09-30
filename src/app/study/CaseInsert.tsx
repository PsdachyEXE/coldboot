/**
 * The Section C case study panel, shared by Written's case study practice and the exam simulator:
 * the insert and its figures, the layout that puts it beside the question on wide screens (or folds
 * it above the question on narrow ones), and a question's references to the insert's figures.
 * Figures a question refers to are framed and labelled "Referred to in this question".
 */
import { memo, type ReactNode } from 'react';
import type { CaseStudy, Figure } from '../../content/schema';
import { FigureView } from '../../figures';
import { Markdown } from '../../ui/Markdown';
import styles from './Written.module.css';
import study from './study.module.css';

/** Wide enough for the insert to sit beside the question. */
export const CASE_WIDE_QUERY = '(min-width: 1100px)';

function figureName(cs: CaseStudy, f: Figure): string {
  return f.title ?? `Figure ${cs.figures.indexOf(f) + 1}`;
}

function insertFigureId(cs: CaseStudy, figureId: string): string {
  return `insert-${cs.id}-${figureId}`;
}

/** The insert text and every figure, with the figures in `refs` framed and labelled. */
export const CaseInsert = memo(function CaseInsert({ cs, refs }: { cs: CaseStudy; refs: ReadonlySet<string> }) {
  return (
    <>
      <div className={styles.insertBody}>
        <Markdown text={cs.insert} />
      </div>
      <div className={styles.insertFigures}>
        {cs.figures.map((f) => (
          <div key={f.id} id={insertFigureId(cs, f.id)} tabIndex={-1} className={styles.insertFigure} data-referenced={refs.has(f.id) ? 'true' : 'false'}>
            {refs.has(f.id) ? <p className={styles.refLabel}>Referred to in this question</p> : null}
            <FigureView figure={f} />
          </div>
        ))}
      </div>
    </>
  );
});

export interface CaseStudyLayoutProps {
  cs: CaseStudy;
  /** Figure ids the current question refers to. */
  refs: ReadonlySet<string>;
  /** From `useMediaQuery(CASE_WIDE_QUERY)`. */
  wide: boolean;
  /** The question side. */
  children: ReactNode;
}

/**
 * Wide: the insert in a sticky side panel beside the question. Narrow: the insert folds into a
 * collapsible section above it. A page with a sticky bar of its own sets `--case-insert-top` so the
 * panel sticks below the bar.
 */
export function CaseStudyLayout({ cs, refs, wide, children }: CaseStudyLayoutProps) {
  if (wide) {
    return (
      <div className={[styles.caseLayout, styles.caseLayoutWide].join(' ')}>
        <aside className={styles.insert} aria-label={`Case study insert: ${cs.title}`}>
          <h2>Insert</h2>
          <CaseInsert cs={cs} refs={refs} />
        </aside>
        {children}
      </div>
    );
  }
  return (
    <div className={styles.caseLayout}>
      <details className={styles.details}>
        <summary>Case study insert</summary>
        <div className={styles.detailsBody}>
          <CaseInsert cs={cs} refs={refs} />
        </div>
      </details>
      {children}
    </div>
  );
}

/**
 * A question's figures. Wide: a line naming them, each a button that scrolls the insert to it.
 * Narrow: the figures themselves, shown with the question.
 */
export function QuestionFigureRefs({ cs, figureRefs, wide }: { cs: CaseStudy; figureRefs: readonly string[] | undefined; wide: boolean }) {
  const refs = new Set(figureRefs ?? []);
  const referenced = cs.figures.filter((f) => refs.has(f.id));
  if (!referenced.length) return null;

  const scrollToFigure = (id: string) => {
    const el = document.getElementById(insertFigureId(cs, id));
    el?.scrollIntoView({ block: 'nearest' });
    el?.focus();
  };

  if (wide) {
    return (
      <p className={styles.refs}>
        This question refers to{' '}
        {referenced.map((f, i) => (
          <span key={f.id}>
            {i > 0 ? (i === referenced.length - 1 ? ' and ' : ', ') : null}
            <button type="button" className={styles.refButton} onClick={() => scrollToFigure(f.id)}>
              {figureName(cs, f)}
            </button>
          </span>
        ))}{' '}
        in the insert.
      </p>
    );
  }
  return (
    <div className={study.figures}>
      {referenced.map((f) => (
        <div key={f.id} className={study.figure}>
          <p className={styles.refLabel}>Referred to in this question</p>
          <FigureView figure={f} />
        </div>
      ))}
    </div>
  );
}
