/**
 * A round of multiple-choice questions, used by the Drill screen and step 2 of Today's run.
 * Timed rounds run at Section A pace (1.2 minutes a question, so 20 questions in 24 minutes) with a
 * visible clock, spoken warnings at 5 minutes and 1 minute left, and unanswered questions scored
 * wrong when time runs out.
 */
import { useEffect, useRef, useState } from 'react';
import type { Mcq } from '../../content/schema';
import type { DrillAnswer, DrillResult } from './drill';
import { useNow } from '../../lib/useNow';
import { announce } from '../../ui/announce';
import { Button } from '../../ui/Button';
import { useStickyTop } from '../../ui/useStickyTop';
import { formatClock, formatClockWords, plural } from './format';
import { McqQuestion, type McqResult } from './McqQuestion';
import { timedAllowance } from './select';
import styles from './Drill.module.css';

export interface DrillRunnerProps {
  questions: readonly Mcq[];
  timed?: boolean;
  where: string;
  onFinish(result: DrillResult): void;
  /** Focus the first question when the runner mounts. */
  autoFocus?: boolean;
  /**
   * Answers from an earlier sitting of the same untimed round (Today's run keeps its place): they
   * count in the result, and the round carries on at the first question they don't cover.
   */
  initialAnswers?: readonly DrillAnswer[];
  /** Called after each answer with every answer so far, including `initialAnswers`. */
  onProgress?(answers: DrillAnswer[]): void;
}

export function DrillRunner({ questions, timed = false, where, onFinish, autoFocus = true, initialAnswers, onProgress }: DrillRunnerProps) {
  const [index, setIndex] = useState(() => {
    const done = new Set(initialAnswers?.map((a) => a.itemId));
    const next = questions.findIndex((q) => !done.has(q.id));
    return next === -1 ? questions.length : next;
  });
  const [answers, setAnswers] = useState<DrillAnswer[]>(() => [...(initialAnswers ?? [])]);
  const [deadline] = useState(() => (timed ? Date.now() + timedAllowance(questions.length) : 0));
  const finished = useRef(false);
  const current = questions[index];
  const last = index === questions.length - 1;

  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  });
  const reported = useRef(answers);
  useEffect(() => {
    if (answers === reported.current) return;
    reported.current = answers;
    onProgressRef.current?.(answers);
  }, [answers]);

  const finish = (list: DrillAnswer[], timedOut: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const answeredIds = new Set(list.map((a) => a.itemId));
    const all = timed
      ? [...list, ...questions.filter((q) => !answeredIds.has(q.id)).map((q): DrillAnswer => ({ itemId: q.id, kk: [...q.kk], correct: false, answered: false }))]
      : list;
    onFinish({
      answers: all,
      correct: all.filter((a) => a.correct).length,
      total: all.length,
      timed,
      timedOut,
      msLeft: timed ? Math.max(0, deadline - Date.now()) : 0,
    });
  };

  const onAnswered = (r: McqResult) => setAnswers((list) => [...list, { itemId: r.itemId, kk: r.kk, correct: r.correct, answered: true }]);

  const onNext = () => {
    if (last) finish(answers, false);
    else setIndex((i) => i + 1);
  };

  // A round resumed with every question already answered has nothing left to ask.
  useEffect(() => {
    if (!questions[index]) finish(answers, false);
  });

  if (!current) return null;
  const answeredThis = answers.some((a) => a.itemId === current.id);

  return (
    <div>
      {timed ? <DrillTimer deadline={deadline} onTimeUp={() => finish(answers, true)} /> : null}
      <McqQuestion
        key={current.id}
        mcq={current}
        position={`Question ${index + 1} of ${questions.length}`}
        where={where}
        onAnswered={onAnswered}
        next={{ label: last ? 'Finish drill' : 'Next question', onNext }}
        autoFocus={autoFocus || index > 0}
      />
      {!answeredThis || !last ? (
        <p>
          <Button variant="quiet" size="small" onClick={() => finish(answers, false)}>
            End drill now
          </Button>
        </p>
      ) : null}
    </div>
  );
}

/** The countdown: visible every second, spoken only at 5 minutes and 1 minute left. */
function DrillTimer({ deadline, onTimeUp }: { deadline: number; onTimeUp(): void }) {
  const now = useNow(1000);
  const left = Math.max(0, deadline - now);
  const spoken = useRef(new Set<number>());
  const barRef = useRef<HTMLDivElement>(null);
  useStickyTop(barRef);
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  });

  useEffect(() => {
    // Speak each warning once, inside its minute; a round shorter than 5 minutes skips the first.
    for (const mark of [5, 1]) {
      if (spoken.current.has(mark)) continue;
      if (left > 0 && left <= mark * 60_000 && left > (mark - 1) * 60_000) {
        spoken.current.add(mark);
        announce(`${plural(mark, 'minute')} left.`, 'assertive');
      }
    }
    if (left === 0) onTimeUpRef.current();
  }, [left]);

  // End exactly on time as well, since a background tab may slow the 1 s tick.
  useEffect(() => {
    const t = setTimeout(() => onTimeUpRef.current(), Math.max(0, deadline - Date.now()) + 20);
    return () => clearTimeout(t);
  }, [deadline]);

  const low = left <= 60_000;
  return (
    <div className={styles.timerBar} ref={barRef}>
      <p className={styles.timer} role="timer" aria-label={`Time left: ${formatClockWords(left)}`}>
        Time left <strong className={low ? styles.timerLow : undefined}>{formatClock(left)}</strong>
      </p>
    </div>
  );
}
