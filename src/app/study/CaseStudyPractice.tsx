/**
 * Section C practice on a case study (`/written?cs=cs-01&q=cs-01-q03`). On wide screens the insert
 * and its figures sit in a side panel beside the question; on narrow screens the insert folds into
 * a section above it, and the figures the question refers to show with the question. Figures a
 * question refers to are framed and labelled "Referred to in this question".
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { CaseQuestion, CaseStudy, Figure } from '../../content/schema';
import { isMcq } from '../../content/schema';
import { FigureView } from '../../figures';
import { Markdown } from '../../ui/Markdown';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { VisuallyHidden } from '../../ui/VisuallyHidden';
import { writtenPath } from '../paths';
import { plural } from './format';
import { McqQuestion } from './McqQuestion';
import { WrittenQuestion } from './WrittenQuestion';
import type { WrittenResult } from './written';
import styles from './Written.module.css';
import study from './study.module.css';

/** Wide enough for the insert to sit beside the question. */
const CASE_WIDE_QUERY = '(min-width: 1100px)';

type Answer = { kind: 'mcq'; chosen: number; correct: boolean } | { kind: 'short'; result: WrittenResult };

function marksOf(q: CaseQuestion): number {
  return isMcq(q) ? 1 : q.marks;
}

function figureName(cs: CaseStudy, f: Figure): string {
  return f.title ?? `Figure ${cs.figures.indexOf(f) + 1}`;
}

export interface CaseStudyPracticeProps {
  cs: CaseStudy;
  questionId: string | null;
  onSelect(questionId: string): void;
}

export function CaseStudyPractice({ cs, questionId, onSelect }: CaseStudyPracticeProps) {
  const wide = useMediaQuery(CASE_WIDE_QUERY);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const found = cs.questions.findIndex((q) => q.id === questionId);
  const index = found === -1 ? 0 : found;
  const question = cs.questions[index];
  const refs = new Set(question.figureRefs ?? []);
  const referenced = cs.figures.filter((f) => refs.has(f.id));

  // Move focus to the question when the student moves between questions (not on first load).
  const questionRef = useRef<HTMLDivElement>(null);
  const firstIndex = useRef(index);
  useEffect(() => {
    if (index !== firstIndex.current) {
      firstIndex.current = -1;
      questionRef.current?.querySelector<HTMLElement>('section')?.focus();
    }
  }, [index]);

  const go = (i: number) => onSelect(cs.questions[i].id);
  const next = index < cs.questions.length - 1 ? { label: 'Next question', onNext: () => go(index + 1) } : undefined;

  const done = cs.questions.filter((q) => answers[q.id]);
  const earned = done.reduce((sum, q) => {
    const a = answers[q.id];
    return sum + (a.kind === 'mcq' ? (a.correct ? 1 : 0) : a.result.earned);
  }, 0);
  const attempted = done.reduce((sum, q) => sum + marksOf(q), 0);

  const scrollToFigure = (id: string) => {
    const el = document.getElementById(`insert-${cs.id}-${id}`);
    el?.scrollIntoView({ block: 'nearest' });
    el?.focus();
  };

  const insert = (
    <>
      <div className={styles.insertBody}>
        <Markdown text={cs.insert} />
      </div>
      <div className={styles.insertFigures}>
        {cs.figures.map((f) => (
          <div
            key={f.id}
            id={`insert-${cs.id}-${f.id}`}
            tabIndex={-1}
            className={styles.insertFigure}
            data-referenced={refs.has(f.id) ? 'true' : 'false'}
          >
            {refs.has(f.id) ? <p className={styles.refLabel}>Referred to in this question</p> : null}
            <FigureView figure={f} />
          </div>
        ))}
      </div>
    </>
  );

  const body = (
    <div ref={questionRef} className={styles.caseQuestion}>
      <nav aria-label="Case study questions" className={styles.qnav}>
        <ol>
          {cs.questions.map((q, i) => {
            const isDone = Boolean(answers[q.id]);
            return (
              <li key={q.id}>
                <Link
                  to={writtenPath({ cs: cs.id, q: q.id })}
                  replace
                  className={styles.qlink}
                  aria-current={i === index ? 'page' : undefined}
                  data-done={isDone ? 'true' : 'false'}
                >
                  <VisuallyHidden>Question</VisuallyHidden> {i + 1}
                  <VisuallyHidden>{`, ${plural(marksOf(q), 'mark')}${isDone ? ', answered' : ''}`}</VisuallyHidden>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
      <p className={study.small}>
        {done.length === 0
          ? `${plural(cs.questions.length, 'question')}, ${plural(cs.totalMarks, 'mark')} in all.`
          : `Answered ${done.length} of ${cs.questions.length}: ${earned} of ${plural(attempted, 'mark')} so far.`}
      </p>
      {referenced.length ? (
        wide ? (
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
        ) : (
          <div className={study.figures}>
            {referenced.map((f) => (
              <div key={f.id} className={study.figure}>
                <p className={styles.refLabel}>Referred to in this question</p>
                <FigureView figure={f} />
              </div>
            ))}
          </div>
        )
      ) : null}
      {isMcq(question) ? (
        <McqQuestion
          key={question.id}
          mcq={question}
          position={`Question ${index + 1} of ${cs.questions.length} (1 mark)`}
          where={`Written: ${cs.id}`}
          initialChosen={answers[question.id]?.kind === 'mcq' ? (answers[question.id] as { chosen: number }).chosen : null}
          onAnswered={(r) => setAnswers((a) => ({ ...a, [question.id]: { kind: 'mcq', chosen: r.chosen, correct: r.correct } }))}
          next={next}
        />
      ) : (
        <WrittenQuestion
          key={question.id}
          item={question}
          position={`Question ${index + 1} of ${cs.questions.length}`}
          where={`Written: ${cs.id}`}
          saved={answers[question.id]?.kind === 'short' ? (answers[question.id] as { result: WrittenResult }).result : null}
          onScored={(result) => setAnswers((a) => ({ ...a, [question.id]: { kind: 'short', result } }))}
          next={next}
        />
      )}
      <nav aria-label="Previous and next question" className={study.actionsEnd}>
        {index > 0 ? (
          <Link to={writtenPath({ cs: cs.id, q: cs.questions[index - 1].id })} replace>
            Previous question
          </Link>
        ) : null}
        {index < cs.questions.length - 1 ? (
          <Link to={writtenPath({ cs: cs.id, q: cs.questions[index + 1].id })} replace>
            Skip to question {index + 2}
          </Link>
        ) : null}
      </nav>
    </div>
  );

  if (wide) {
    return (
      <div className={[styles.caseLayout, styles.caseLayoutWide].join(' ')}>
        <aside className={styles.insert} aria-label={`Case study insert: ${cs.title}`}>
          <h2>Insert</h2>
          {insert}
        </aside>
        {body}
      </div>
    );
  }
  return (
    <div className={styles.caseLayout}>
      <details className={styles.details}>
        <summary>Case study insert</summary>
        <div className={styles.detailsBody}>{insert}</div>
      </details>
      {body}
    </div>
  );
}
