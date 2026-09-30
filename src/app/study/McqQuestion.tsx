/**
 * One multiple-choice question (Drill, Today's run, case study practice). Figures sit above the
 * stem; options are lettered A to D. A to D or 1 to 4 choose an option and Enter checks it. After
 * the check: the verdict, the correct option marked with a glyph and words (never colour alone),
 * the explanation, and a one-line reason under each distractor. Every checked answer is recorded.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { LETTERS } from '../../games/answers';
import type { KkId, Mcq } from '../../content/schema';
import { recordAttempt } from '../../state/record';
import { Button } from '../../ui/Button';
import { Feedback } from '../../ui/Feedback';
import { Kbd } from '../../ui/Kbd';
import { Markdown } from '../../ui/Markdown';
import { openReport } from '../../ui/report';
import { VisuallyHidden } from '../../ui/VisuallyHidden';
import { ItemFigures } from './ItemFigures';
import { isActivatingTarget, useShortcuts } from './keys';
import styles from './Drill.module.css';
import study from './study.module.css';

export interface McqResult {
  itemId: string;
  kk: KkId[];
  chosen: number;
  correct: boolean;
  ms: number;
}

export interface McqQuestionProps {
  mcq: Mcq;
  /** "Question 3 of 10". */
  position?: string;
  /** Context for content reports, e.g. "Drill". */
  where: string;
  onAnswered?(result: McqResult): void;
  /** The action after answering ("Next question", "Finish drill"); Enter triggers it too. */
  next?: { label: string; onNext(): void };
  /** Stops answering, e.g. when time is up. */
  locked?: boolean;
  /** Focus the question when it mounts (after a button press, not on page load). */
  autoFocus?: boolean;
  /** Answer checked earlier (case study navigation), shown as already answered. */
  initialChosen?: number | null;
}

const KEY_TO_INDEX: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };

export function McqQuestion({ mcq, position, where, onAnswered, next, locked = false, autoFocus = false, initialChosen = null }: McqQuestionProps) {
  const [selected, setSelected] = useState<number | null>(initialChosen);
  const [answered, setAnswered] = useState(initialChosen !== null);
  const [shownAt] = useState(() => Date.now());
  const stemId = useId();
  const name = useId();
  const regionRef = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const checkedOnce = useRef(initialChosen !== null);
  // Shown already answered (going back to a case study question). Read once: the case study echoes
  // a new answer straight back as `initialChosen`, and that answer still moves focus on.
  const [revisited] = useState(initialChosen !== null);

  useEffect(() => {
    if (autoFocus) regionRef.current?.focus();
  }, [autoFocus]);

  const check = () => {
    if (answered || locked || selected === null || checkedOnce.current) return;
    checkedOnce.current = true;
    const now = Date.now();
    const correct = selected === mcq.answer;
    recordAttempt({ itemId: mcq.id, kk: mcq.kk, score: correct ? 1 : 0, timestamp: now, ms: now - shownAt });
    setAnswered(true);
    onAnswered?.({ itemId: mcq.id, kk: [...mcq.kk], chosen: selected, correct, ms: now - shownAt });
  };

  // After the check, put focus on the next action so Enter or Space moves on. With none (the last
  // case study question), focus goes to the verdict, since Check answer is gone.
  useEffect(() => {
    if (answered && !revisited) (nextRef.current ?? verdictRef.current)?.focus();
  }, [answered, revisited]);

  useShortcuts((e) => {
    const key = e.key.toLowerCase();
    if (!answered && !locked && key in KEY_TO_INDEX) {
      e.preventDefault();
      setSelected(KEY_TO_INDEX[key]);
      return;
    }
    if (e.key === 'Enter' && !isActivatingTarget(e.target)) {
      if (!answered) {
        if (selected !== null) {
          e.preventDefault();
          check();
        }
      } else if (next) {
        e.preventDefault();
        next.onNext();
      }
      return;
    }
    if (key === 'r') {
      e.preventDefault();
      openReport({ itemId: mcq.id, where });
    }
  }, !locked || answered);

  const correct = answered && selected === mcq.answer;
  const answerLetter = LETTERS[mcq.answer];

  return (
    <section ref={regionRef} tabIndex={-1} aria-labelledby={stemId} className={styles.question}>
      {position ? <p className={study.progress}>{position}</p> : null}
      <ItemFigures figures={mcq.figures} />
      <div id={stemId} className={styles.stem}>
        <Markdown text={mcq.stem} />
      </div>
      <fieldset className={styles.options} disabled={answered || locked}>
        <legend className={styles.legend}>
          <VisuallyHidden>Choose an answer</VisuallyHidden>
        </legend>
        {mcq.options.map((option, i) => {
          const isAnswer = i === mcq.answer;
          const isChosen = i === selected;
          const state = answered ? (isAnswer ? 'answer' : isChosen ? 'wrong' : 'other') : isChosen ? 'selected' : 'idle';
          return (
            <label key={i} className={styles.option} data-state={state}>
              <input
                type="radio"
                name={name}
                value={i}
                checked={isChosen}
                onChange={() => setSelected(i)}
                className={styles.radio}
                aria-describedby={answered ? `${name}-why-${i}` : undefined}
              />
              <span className={styles.letter} aria-hidden="true">
                {LETTERS[i]}
              </span>
              <span className={styles.optionBody}>
                <VisuallyHidden>{`${LETTERS[i]}. `}</VisuallyHidden>
                <Markdown inline text={option} />
                {answered && (isAnswer || isChosen) ? (
                  <span className={styles.mark} data-mark={isAnswer ? 'answer' : 'wrong'}>
                    <span aria-hidden="true">{isAnswer ? '✓' : '✗'}</span> {isAnswer ? (isChosen ? 'Your answer is correct' : 'Correct answer') : 'Your answer'}
                  </span>
                ) : null}
                {answered && !isAnswer ? (
                  <span className={styles.why} id={`${name}-why-${i}`}>
                    <Markdown inline text={mcq.whyWrong[i]} />
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </fieldset>

      {answered ? (
        <div ref={verdictRef} tabIndex={-1}>
          {/* A verdict shown again on a revisit was already spoken and heard. */}
          <Feedback
            key={`${mcq.id}-verdict`}
            correct={correct}
            summary={`The answer is ${answerLetter}.`}
            announce={!revisited}
            cue={!revisited}
            className={styles.feedback}
          >
            <p>
              The answer is <strong>{answerLetter}</strong>: <Markdown inline text={mcq.options[mcq.answer]} />
            </p>
            <Markdown text={mcq.explanation} />
          </Feedback>
        </div>
      ) : null}

      <div className={study.actions}>
        {answered ? (
          next ? (
            <Button ref={nextRef} variant="primary" onClick={next.onNext}>
              {next.label}
            </Button>
          ) : null
        ) : (
          <>
            <Button variant="primary" onClick={check} disabled={selected === null || locked}>
              Check answer
            </Button>
            <span className={study.keys}>
              Press <Kbd>A</Kbd> to <Kbd>D</Kbd> to choose, then <Kbd>Enter</Kbd>
            </span>
          </>
        )}
        <Button variant="quiet" size="small" onClick={() => openReport({ itemId: mcq.id, where })} aria-keyshortcuts="R">
          Report a problem
        </Button>
      </div>
    </section>
  );
}
