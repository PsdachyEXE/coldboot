/**
 * The daily challenge as a screen (Section 6.12, P1). It plays exactly the terminal's set and keeps
 * exactly the terminal's record, so either one can start the day and the other carries on:
 *
 * - The set is `dailyRefs(date, content, record)` from src/games/daily-game: a new day comes from
 *   `buildDailySet(date, content MCQs)`; a day already started is rebuilt from the stored item ids,
 *   with a removed MCQ replaced in place by a generated item.
 * - Starting calls `useSession.beginDaily(date, ids)` (a no-op when a record exists), and every
 *   counted answer calls `recordDaily(date, index, correct, now)` after `recordAttempt`. The store
 *   ignores anything but the first attempt at the next position, so only first attempts count.
 * - The question shown is the first unanswered one in the stored record, so an answer given in the
 *   terminal drawer moves this screen on too.
 *
 * `date` is the Melbourne date, pinned once a set is under way, so an answer given just after
 * midnight still belongs to the set it answers.
 */
import { useMemo, useState } from 'react';
import type { ContentIndex } from '../../content/loader';
import type { Mcq } from '../../content/schema';
import type { DailyItemRef } from '../../games/daily';
import { dailyItem, dailyRefs, type Generators } from '../../games/daily-game';
import type { QuizItem } from '../../games/types';
import { melbourneDate } from '../../lib/time';
import { useNow } from '../../lib/useNow';
import { useSession } from '../../state/session';
import { announce } from '../../ui/announce';
import { Button } from '../../ui/Button';
import { playCue } from '../../ui/sound';
import { McqQuestion } from '../study/McqQuestion';
import { longDay } from '../stats/format';
import study from '../study/study.module.css';
import { DailyResult } from './DailyResult';
import { GeneratedQuestion } from './GeneratedQuestion';
import styles from './Daily.module.css';

const WHERE = 'Daily challenge';

type Question = { kind: 'mcq'; ref: DailyItemRef; mcq: Mcq } | { kind: 'generated'; ref: DailyItemRef; item: QuizItem };

function toQuestion(ref: DailyItemRef, content: ContentIndex, generators: Generators): Question {
  if (ref.kind === 'mcq') {
    const entry = content.byId.get(ref.id);
    if (entry?.kind === 'mcq' && !entry.caseStudyId) return { kind: 'mcq', ref, mcq: entry.item };
  }
  return { kind: 'generated', ref, item: dailyItem(ref, content, generators) };
}

export function DailyChallenge({ content, generators }: { content: ContentIndex; generators: Generators }) {
  const now = useNow(15_000);
  const today = melbourneDate(now);
  const [pinned, setPinned] = useState<string | null>(null);
  const date = pinned ?? today;
  const record = useSession((s) => s.daily[date]) ?? null;
  // The record's item ids keep their identity while results are added, so answering never rebuilds the items.
  const itemIds = record?.itemIds;

  // The set: the stored ids once the day has begun, otherwise today's fresh set.
  const { questions, replaced } = useMemo(() => {
    const built = dailyRefs(date, content, itemIds ? { itemIds, results: [], completedAt: null } : null);
    return { questions: built.refs.map((ref) => toQuestion(ref, content, generators)), replaced: built.replaced };
  }, [date, content, generators, itemIds]);

  const total = questions.length;
  const results = record?.results ?? [];
  const answered = Math.min(results.length, total);
  const [started, setStarted] = useState(false);
  /** The question answered on this screen whose feedback is showing, until Next. */
  const [feedbackFor, setFeedbackFor] = useState<number | null>(null);
  const [finishedHere, setFinishedHere] = useState(false);

  const complete = answered >= total && total > 0;

  const start = () => {
    useSession.getState().beginDaily(date, questions.map((q) => q.ref.id));
    setPinned(date);
    setStarted(true);
  };

  const onAnswered = (index: number, correct: boolean) => {
    useSession.getState().recordDaily(date, index, correct, Date.now());
    setFeedbackFor(index);
  };

  const onNext = () => {
    const done = (useSession.getState().daily[date]?.results.length ?? 0) >= total;
    setFeedbackFor(null);
    if (done) {
      setFinishedHere(true);
      const final = useSession.getState().daily[date]?.results ?? [];
      announce(`Daily challenge complete: ${final.reduce<number>((s, r) => s + r, 0)} of ${total} correct.`);
      playCue('complete');
    }
  };

  const newSet = () => {
    setPinned(null);
    setStarted(false);
    setFinishedHere(false);
    setFeedbackFor(null);
  };

  const dateLine = <p className={styles.date}>{longDay(date)}: the same set for everyone.</p>;

  if (complete && feedbackFor === null) {
    return (
      <>
        {dateLine}
        <DailyResult date={date} results={results} total={total} justFinished={finishedHere} today={today} onNewSet={newSet} />
      </>
    );
  }

  if (!started && feedbackFor === null) {
    return (
      <>
        {dateLine}
        <p className={study.lead}>
          Ten questions: eight multiple-choice questions from the study content and two from the terminal games. Only your first attempt at
          each question counts.
        </p>
        {replaced ? (
          <p className={study.notice}>
            {replaced === 1 ? 'One question' : `${replaced} questions`} from today's set {replaced === 1 ? 'is' : 'are'} no longer installed, so a
            generated question takes {replaced === 1 ? 'its' : 'their'} place.
          </p>
        ) : null}
        {answered > 0 ? (
          <p>
            You've answered {answered} of {total}, and those answers still count. Carry on here or in the terminal.
          </p>
        ) : (
          <p>You can also play it in the terminal: type daily.</p>
        )}
        <div className={study.actions}>
          <Button variant="primary" onClick={start}>
            {answered > 0 ? `Carry on from question ${answered + 1}` : 'Start the daily challenge'}
          </Button>
        </div>
      </>
    );
  }

  const index = feedbackFor ?? answered;
  const question = questions[index];
  if (!question) return null;
  const last = index === total - 1;
  const position = `Question ${index + 1} of ${total}`;
  const next = { label: last ? 'See your result' : 'Next question', onNext };

  return (
    <>
      {dateLine}
      {/* Progress at a glance; the question's own "Question 3 of 10" line says it in words. */}
      <p className={styles.soFar} aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={styles.pip} data-state={i < answered ? (results[i] ? 'correct' : 'incorrect') : i === index ? 'current' : 'todo'}>
            {i < answered ? (results[i] ? '✓' : '✗') : i + 1}
          </span>
        ))}
      </p>
      {question.kind === 'mcq' ? (
        <McqQuestion
          key={`${date}:${index}`}
          mcq={question.mcq}
          position={position}
          where={WHERE}
          onAnswered={(r) => onAnswered(index, r.correct)}
          next={next}
          autoFocus
        />
      ) : (
        <GeneratedQuestion
          key={`${date}:${index}`}
          item={question.item}
          position={position}
          where={WHERE}
          onAnswered={(r) => onAnswered(index, r.correct)}
          next={next}
          autoFocus
        />
      )}
    </>
  );
}
