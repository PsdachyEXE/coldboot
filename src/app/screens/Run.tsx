/**
 * Today's run (Section 6.2): due reviews, a 10-question drill on the weakest KK, then the daily
 * challenge in the terminal, ending at "Run complete". Review and Drill run embedded here, and the
 * run keeps its place in this tab (src/app/study/runState.ts): leaving the page, for the Daily
 * screen or anywhere else, and coming back carries on from the same step, with the ratings and
 * answers so far. A step with nothing to do is skipped with a note. A finished run isn't kept, so
 * the next visit starts a new one.
 *
 * The daily challenge starts with `useTerminal.run('daily')`, with a secondary link to the Daily
 * screen for students who would rather answer on screen; the step completes when the terminal
 * reports a finished `daily` game, or when today's daily record (Melbourne date) is complete.
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import type { ContentIndex } from '../../content/loader';
import type { Mcq } from '../../content/schema';
import { findGame } from '../../games/registry';
import { freshSeed, mulberry32 } from '../../games/prng';
import { melbourneDate, studyDay } from '../../lib/time';
import { masteryNow } from '../../srs/hooks';
import type { QueueEntry } from '../../srs/queue';
import { onClearTabState } from '../../state/persist';
import { useSession } from '../../state/session';
import { useSettings } from '../../state/settings';
import { useSrs } from '../../state/srs';
import { useTerminal } from '../../terminal/useTerminal';
import { Button, ButtonLink } from '../../ui/Button';
import { useNarrow } from '../../ui/useMediaQuery';
import { paths } from '../paths';
import { ContentGate } from '../study/ContentGate';
import { suggestNextStep, type DrillAnswer, type DrillResult } from '../study/drill';
import { DrillRunner } from '../study/DrillRunner';
import { plural } from '../study/format';
import { PhaseHeading } from '../study/parts';
import { ReviewRunner, type ReviewSummary, type ReviewTally } from '../study/ReviewRunner';
import { reviewQueue } from '../study/reviewQueue';
import { clearRun, EMPTY_TALLY, readRun, RUN_VERSION, saveRun, type Outcome, type StepId } from '../study/runState';
import { pickRunDrill } from '../study/select';
import study from '../study/study.module.css';
import styles from '../study/Run.module.css';

const STEPS: { id: StepId; title: string; short: string }[] = [
  { id: 'review', title: 'Review cards', short: 'review cards' },
  { id: 'drill', title: 'Drill your weakest key knowledge', short: 'drill' },
  { id: 'daily', title: 'Daily challenge', short: 'the daily challenge' },
];

interface RunState {
  step: StepId | 'complete';
  outcomes: Partial<Record<StepId, Outcome>>;
  queue: QueueEntry[];
  drill: Mcq[];
  drillResult: DrillResult | null;
  /** When the current step began (a daily game must finish after this). */
  stepAt: number;
  /** The Melbourne date the daily step is for. */
  dailyDate: string;
  /** Ratings so far in the review step, and answers so far in the drill, kept with the run. */
  reviewTally: ReviewTally;
  drillAnswers: DrillAnswer[];
  /** The study day the run began. */
  day: string;
  /** Move focus to the step heading (after a transition, not on page load). */
  focus: boolean;
}

type Progress = Omit<RunState, 'step' | 'focus'>;

export default function Run() {
  return (
    <div className={study.page}>
      <ContentGate heading="Today's run">{(content) => <RunSteps content={content} />}</ContentGate>
    </div>
  );
}

function currentReviewQueue(content: ContentIndex, now: number): QueueEntry[] {
  return reviewQueue(content, useSrs.getState(), useSettings.getState().newCardLimit, masteryNow(now), now);
}

/** Moves to the first step after `after` that has something to do, noting the ones skipped. */
function advance(content: ContentIndex, state: Progress, after: StepId | null): Omit<RunState, 'focus'> {
  const now = Date.now();
  const outcomes = { ...state.outcomes };
  const order: StepId[] = ['review', 'drill', 'daily'];
  for (let i = after ? order.indexOf(after) + 1 : 0; i < order.length; i++) {
    const id = order[i];
    if (id === 'review') {
      const queue = currentReviewQueue(content, now);
      if (queue.length) return { ...state, outcomes, step: 'review', queue, stepAt: now, reviewTally: EMPTY_TALLY };
      outcomes.review = { status: 'skipped', text: 'Nothing was due.' };
    } else if (id === 'drill') {
      const drill = pickRunDrill(content, masteryNow(now), mulberry32(freshSeed(now))).items;
      if (drill.length) return { ...state, outcomes, step: 'drill', drill, stepAt: now, drillAnswers: [] };
      outcomes.drill = { status: 'skipped', text: 'There are no questions to drill yet.' };
    } else {
      const dailyDate = melbourneDate(now);
      const record = useSession.getState().daily[dailyDate];
      if (!findGame('daily')) {
        outcomes.daily = { status: 'skipped', text: "The daily challenge isn't in this version of COLDBOOT yet." };
      } else if (record?.completedAt) {
        outcomes.daily = { status: 'done', text: `Already done today: ${record.results.reduce<number>((s, r) => s + r, 0)} of ${record.itemIds.length} correct.` };
      } else {
        return { ...state, outcomes, step: 'daily', stepAt: now, dailyDate };
      }
    }
  }
  return { ...state, outcomes, step: 'complete', stepAt: now };
}

function reviewOutcome(tally: ReviewTally, finishedEarly: boolean): Outcome {
  const s: ReviewSummary = { ratings: tally.ratings, cards: tally.cardIds.length, newCards: tally.newCards, again: tally.again, finishedEarly };
  return { status: 'done', text: reviewText(s) };
}

function drillOutcome(r: DrillResult): Outcome {
  // Ending the drill before answering anything is a skip, not "0 of 0 correct".
  return r.total === 0 ? { status: 'skipped', text: 'You ended the drill before answering.' } : { status: 'done', text: `${r.correct} of ${r.total} correct.` };
}

function untimedResult(answers: DrillAnswer[]): DrillResult {
  return { answers, correct: answers.filter((a) => a.correct).length, total: answers.length, timed: false, timedOut: false, msLeft: 0 };
}

/**
 * The run saved in this tab for today, carried on: the same step, its outcomes so far, and the
 * progress inside the step. A review carries on with the cards still due (a card rated since, here
 * or on the Review screen, isn't due any more); a drill with its first unanswered question. A
 * step with nothing left moves on. Null when there's no saved run for today.
 */
function restoreRun(content: ContentIndex): Omit<RunState, 'focus'> | null {
  const now = Date.now();
  const day = studyDay(now);
  const saved = readRun(day);
  if (!saved) return null;
  const base: Progress = {
    outcomes: saved.outcomes,
    queue: [],
    drill: [],
    drillResult: saved.drillResult,
    stepAt: saved.stepAt,
    dailyDate: saved.dailyDate,
    reviewTally: saved.review,
    drillAnswers: saved.drillAnswers,
    day,
  };
  if (saved.step === 'review') {
    const queue = currentReviewQueue(content, now);
    if (queue.length) return { ...base, step: 'review', queue };
    const review = saved.review.ratings ? reviewOutcome(saved.review, false) : { status: 'skipped' as const, text: 'Nothing was left to review.' };
    return advance(content, { ...base, outcomes: { ...base.outcomes, review } }, 'review');
  }
  if (saved.step === 'drill') {
    const drill = saved.drillIds.flatMap((id) => {
      const entry = content.byId.get(id);
      return entry?.kind === 'mcq' && !entry.caseStudyId ? [entry.item] : [];
    });
    const answered = new Set(saved.drillAnswers.map((a) => a.itemId));
    if (drill.some((q) => !answered.has(q.id))) return { ...base, step: 'drill', drill };
    const result = untimedResult(saved.drillAnswers);
    return advance(content, { ...base, drillResult: result.total ? result : null, outcomes: { ...base.outcomes, drill: drillOutcome(result) } }, 'drill');
  }
  return { ...base, step: 'daily' };
}

function RunSteps({ content }: { content: ContentIndex }) {
  const [state, setState] = useState<RunState>(() => ({
    ...(restoreRun(content) ??
      advance(
        content,
        { outcomes: {}, queue: [], drill: [], drillResult: null, stepAt: 0, dailyDate: '', reviewTally: EMPTY_TALLY, drillAnswers: [], day: studyDay(Date.now()) },
        null,
      )),
    focus: false,
  }));

  const narrow = useNarrow();
  const lastGameEnd = useTerminal((s) => s.lastGameEnd);
  const dailyRecord = useSession((s) => (state.dailyDate ? s.daily[state.dailyDate] : undefined));

  // The daily step finishes when the terminal reports it, or when today's record is complete.
  let dailyOutcome: Outcome | null = null;
  if (state.step === 'daily') {
    if (lastGameEnd?.gameId === 'daily' && lastGameEnd.at >= state.stepAt) {
      dailyOutcome = { status: 'done', text: `${lastGameEnd.score} of ${lastGameEnd.total} correct.` };
    } else if (dailyRecord?.completedAt) {
      dailyOutcome = { status: 'done', text: `${dailyRecord.results.reduce<number>((s, r) => s + r, 0)} of ${dailyRecord.itemIds.length} correct.` };
    }
  }
  const step = dailyOutcome ? 'complete' : state.step;
  const outcomes = dailyOutcome ? { ...state.outcomes, daily: dailyOutcome } : state.outcomes;
  const focus = state.focus || dailyOutcome !== null;

  // Keep the run's place in this tab while it's under way; a finished run isn't kept. After a
  // reset or an import (here or in another window) the old run is never written back.
  const cleared = useRef(false);
  useEffect(() => onClearTabState(() => (cleared.current = true)), []);
  useEffect(() => {
    if (cleared.current) return;
    if (step === 'complete') {
      clearRun();
      return;
    }
    saveRun({
      v: RUN_VERSION,
      day: state.day,
      step,
      outcomes: state.outcomes,
      review: state.reviewTally,
      drillIds: state.drill.map((q) => q.id),
      drillAnswers: state.drillAnswers,
      drillResult: state.drillResult,
      stepAt: state.stepAt,
      dailyDate: state.dailyDate,
    });
  }, [state, step]);

  const finishReview = (s: ReviewSummary) =>
    setState((prev) => ({
      ...advance(content, { ...prev, outcomes: { ...prev.outcomes, review: { status: 'done', text: reviewText(s) } } }, 'review'),
      focus: true,
    }));
  const finishDrill = (r: DrillResult) =>
    setState((prev) => ({
      ...advance(content, { ...prev, drillResult: r.total === 0 ? null : r, outcomes: { ...prev.outcomes, drill: drillOutcome(r) } }, 'drill'),
      focus: true,
    }));
  const noteReview = (reviewTally: ReviewTally) => setState((prev) => (prev.step === 'review' ? { ...prev, reviewTally } : prev));
  const noteDrill = (drillAnswers: DrillAnswer[]) => setState((prev) => (prev.step === 'drill' ? { ...prev, drillAnswers } : prev));
  const skipDaily = () =>
    setState((prev) => ({
      ...prev,
      step: 'complete',
      outcomes: { ...prev.outcomes, daily: { status: 'skipped', text: 'Type daily in the terminal to take it later today.' } },
      focus: true,
    }));

  // Phones show the task first: the step list folds into one line under the step heading.
  const summary = step !== 'complete' && narrow ? <StepSummary step={step} outcomes={outcomes} /> : null;

  return (
    <>
      <h1>Today's run</h1>
      {step === 'complete' || narrow ? null : <StepList step={step} outcomes={outcomes} />}

      {step === 'review' ? (
        <section key="review" aria-labelledby="run-step">
          <StepHeading focus={focus} index={0} />
          {summary}
          <ReviewRunner
            content={content}
            queue={state.queue}
            where="Today's run"
            onFinish={finishReview}
            autoFocus={false}
            initial={state.reviewTally}
            onProgress={noteReview}
          />
        </section>
      ) : step === 'drill' ? (
        <section key="drill" aria-labelledby="run-step">
          <StepHeading focus={focus} index={1} />
          {summary}
          <DrillRunner
            questions={state.drill}
            where="Today's run"
            onFinish={finishDrill}
            autoFocus={false}
            initialAnswers={state.drillAnswers}
            onProgress={noteDrill}
          />
        </section>
      ) : step === 'daily' ? (
        <section key="daily" aria-labelledby="run-step">
          <StepHeading focus={focus} index={2} />
          {summary}
          <DailyStep date={state.dailyDate} onSkip={skipDaily} />
        </section>
      ) : (
        <RunComplete content={content} outcomes={outcomes} drillResult={state.drillResult} focus={focus} />
      )}
    </>
  );
}

function StepList({ step, outcomes }: { step: StepId; outcomes: Partial<Record<StepId, Outcome>> }) {
  const upNextIndex = STEPS.findIndex((t) => !outcomes[t.id] && t.id !== step);
  return (
    <ol className={styles.steps} aria-label="Steps">
      {STEPS.map((s, i) => {
        const outcome = outcomes[s.id];
        const current = s.id === step;
        const status = outcome ? (outcome.status === 'done' ? 'Done' : 'Skipped') : current ? 'Now' : i === upNextIndex ? 'Up next' : 'Later';
        return (
          <li key={s.id} className={styles.step} aria-current={current ? 'step' : undefined} data-status={outcome?.status ?? (current ? 'current' : 'todo')}>
            <span className={styles.stepNumber} aria-hidden="true">
              {i + 1}
            </span>
            <span className={styles.stepBody}>
              <span className={styles.stepTitle}>{s.title}</span>
              <span className={styles.stepStatus}>
                {status}
                {outcome ? `: ${outcome.text}` : '.'}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Phones: "Next: drill, then the daily challenge", opening to the full step list. */
function StepSummary({ step, outcomes }: { step: StepId; outcomes: Partial<Record<StepId, Outcome>> }) {
  const at = STEPS.findIndex((t) => t.id === step);
  const ahead = STEPS.filter((s, i) => i > at && !outcomes[s.id]);
  const next = ahead.length === 0 ? 'This is the last step' : `Next: ${ahead.map((s) => s.short).join(', then ')}`;
  return (
    <details className={styles.stepSummary}>
      <summary>{next}</summary>
      <StepList step={step} outcomes={outcomes} />
    </details>
  );
}

function reviewText(s: ReviewSummary): string {
  if (s.cards === 0) return 'You finished before rating any cards.';
  const base = `${plural(s.cards, 'card')} reviewed${s.newCards ? `, ${s.newCards} of them new` : ''}.`;
  return s.finishedEarly ? `${base} You finished early.` : base;
}

function StepHeading({ index, focus }: { index: number; focus: boolean }) {
  return (
    <PhaseHeading level={2} focus={focus} id="run-step">
      Step {index + 1} of 3: {STEPS[index].title}
    </PhaseHeading>
  );
}

function DailyStep({ date, onSkip }: { date: string; onSkip(): void }) {
  const record = useSession((s) => (date ? s.daily[date] : undefined));
  const [started, setStarted] = useState(false);
  // A day already begun carries on from the next unanswered question.
  const answered = record && !record.completedAt ? record.results.length : 0;
  const start = () => {
    setStarted(true);
    useTerminal.getState().run('daily');
  };
  return (
    <>
      {answered > 0 ? (
        <p>
          You've answered {answered} of {record?.itemIds.length}. Carry on from question {answered + 1}. Only your first attempt at each question counts.
          It runs in the terminal, which opens over this page.
        </p>
      ) : (
        <p>Ten questions, the same for everyone today. Only your first attempt counts. It runs in the terminal, which opens over this page.</p>
      )}
      {started ? <p>This step finishes when you answer the tenth question. If you close the terminal, open it again to carry on.</p> : null}
      <div className={study.actions}>
        {/*
          One button that stays put while the terminal is open, relabelled once started, so the
          drawer has somewhere to return focus when it closes.
        */}
        <Button variant="primary" onClick={started ? () => useTerminal.getState().setOpen(true) : start}>
          {started ? 'Open the terminal' : answered > 0 ? 'Continue the daily challenge' : 'Start the daily challenge'}
        </Button>
        <ButtonLink to={paths.daily}>Do it on screen instead</ButtonLink>
        <Button variant="quiet" onClick={onSkip}>
          Skip the daily challenge
        </Button>
      </div>
    </>
  );
}

function RunComplete({
  content,
  outcomes,
  drillResult,
  focus,
}: {
  content: ContentIndex;
  outcomes: Partial<Record<StepId, Outcome>>;
  drillResult: DrillResult | null;
  focus: boolean;
}) {
  const next = drillResult ? suggestNextStep(drillResult, content) : null;
  return (
    <section>
      <PhaseHeading level={2} focus={focus}>
        Run complete
      </PhaseHeading>
      <dl className={study.facts}>
        {STEPS.map((s) => {
          const outcome = outcomes[s.id];
          return (
            <Fragment key={s.id}>
              <dt>{s.title}</dt>
              <dd>{outcome ? `${outcome.status === 'done' ? 'Done' : 'Skipped'}: ${outcome.text}` : 'Not started.'}</dd>
            </Fragment>
          );
        })}
      </dl>
      {next ? (
        <>
          <h3>Next step</h3>
          <p>{next.text}</p>
        </>
      ) : null}
      <div className={study.actions}>
        {next ? (
          <ButtonLink variant="primary" to={next.to}>
            {next.label}
          </ButtonLink>
        ) : null}
        <ButtonLink to={paths.home}>Go to Home</ButtonLink>
        <ButtonLink to={paths.map}>Open the syllabus map</ButtonLink>
      </div>
    </section>
  );
}
