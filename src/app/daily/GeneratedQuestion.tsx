/**
 * One generated daily question (deskcheck, sort, search, triage or validate) on the Daily screen.
 * The prompt is the item's TerminalBlocks drawn by the terminal's own block renderer, on a
 * terminal-style panel; below it sit an answer field, the item's suggested answers as buttons, and
 * Check answer. Input that isn't an attempt (an array with the wrong length, say) gets the item's
 * hint and isn't counted. A counted answer is recorded once, then the verdict, the expected answer,
 * the reason and any follow-up blocks (a pass-by-pass trace) are shown.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { CheckResult, QuizItem } from '../../games/types';
import { recordAttempt } from '../../state/record';
import { BlockView } from '../../terminal/BlockView';
import { Button } from '../../ui/Button';
import { Feedback } from '../../ui/Feedback';
import { TextField } from '../../ui/Field';
import { Markdown } from '../../ui/Markdown';
import { openReport } from '../../ui/report';
import study from '../study/study.module.css';
import styles from './Daily.module.css';

export interface GeneratedQuestionProps {
  item: QuizItem;
  /** "Question 3 of 10". */
  position: string;
  where: string;
  onAnswered(result: { correct: boolean; score: number }): void;
  next: { label: string; onNext(): void };
  autoFocus?: boolean;
}

interface Answered {
  input: string;
  check: CheckResult;
}

/** Records a counted answer to a generated item, timed from when it was shown. Returns the score. */
function recordGenerated(item: QuizItem, check: CheckResult, shownAt: number): number {
  const now = Date.now();
  const score = Math.min(1, Math.max(0, check.score ?? (check.correct ? 1 : 0)));
  recordAttempt({ itemId: item.id, kk: item.kk, score, timestamp: now, ms: now - shownAt });
  return score;
}

export function GeneratedQuestion({ item, position, where, onAnswered, next, autoFocus = false }: GeneratedQuestionProps) {
  const [input, setInput] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [shownAt] = useState(() => Date.now());
  const regionRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const checkedOnce = useRef(false);
  const positionId = useId();

  useEffect(() => {
    if (autoFocus) regionRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  const submit = (value: string) => {
    if (checkedOnce.current) return;
    const typed = value.trim();
    if (!typed) {
      setHint('Type an answer first, or choose one of the suggested answers.');
      inputRef.current?.focus();
      return;
    }
    let check: CheckResult;
    try {
      check = item.check(typed);
    } catch {
      setHint('Something went wrong checking that answer. Report this question so it can be fixed.');
      return;
    }
    if (check.counted === false) {
      setHint(check.reason || 'That answer is not in a form this question accepts. Check the instructions above it.');
      inputRef.current?.focus();
      return;
    }
    checkedOnce.current = true;
    const score = recordGenerated(item, check, shownAt);
    setInput(typed);
    setHint(null);
    setAnswered({ input: typed, check });
    onAnswered({ correct: check.correct, score });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  const report = () => openReport({ itemId: item.id, where, instance: item.instance });
  const chips = item.chips ?? [];

  return (
    <section ref={regionRef} tabIndex={-1} aria-labelledby={positionId} className={styles.question}>
      <p className={study.progress} id={positionId}>
        {position}
      </p>
      <div className={styles.terminal}>
        {item.prompt.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </div>

      {answered ? (
        <>
          <p className={styles.yourAnswer}>
            Your answer: <code>{answered.input}</code>
          </p>
          <Feedback
            key={`${item.id}-verdict`}
            correct={answered.check.correct}
            summary={answered.check.correct ? undefined : `The answer is ${answered.check.expected}.`}
          >
            {!answered.check.correct && answered.check.expected ? (
              <p>
                The answer is{' '}
                {answered.check.markdown ? <Markdown inline text={answered.check.expected} /> : <code className={styles.expected}>{answered.check.expected}</code>}
              </p>
            ) : null}
            {answered.check.reason ? answered.check.markdown ? <Markdown text={answered.check.reason} /> : <p>{answered.check.reason}</p> : null}
          </Feedback>
          {answered.check.followUp?.length ? (
            <div className={styles.terminal}>
              {answered.check.followUp.map((block, i) => (
                <BlockView key={i} block={block} />
              ))}
            </div>
          ) : null}
          <div className={study.actions}>
            <Button ref={nextRef} variant="primary" onClick={next.onNext}>
              {next.label}
            </Button>
            <Button variant="quiet" size="small" onClick={report}>
              Report a problem
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={onSubmit} className={styles.answerForm} noValidate>
          <TextField
            ref={inputRef}
            label="Your answer"
            value={input}
            error={hint}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            maxLength={500}
            className={styles.answerInput}
            onChange={(e) => {
              setInput(e.target.value);
              if (hint) setHint(null);
            }}
          />
          {chips.length ? (
            <div className={styles.chips} role="group" aria-label="Suggested answers">
              {chips.map((chip) => (
                <Button key={chip} size="small" onClick={() => submit(chip)}>
                  {chip}
                </Button>
              ))}
            </div>
          ) : null}
          <div className={study.actions}>
            <Button type="submit" variant="primary">
              Check answer
            </Button>
            <Button variant="quiet" size="small" onClick={report}>
              Report a problem
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
