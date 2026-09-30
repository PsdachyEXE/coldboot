/**
 * Today's run (Section 6.2): due reviews, a 10-question drill on the weakest KK, then the daily
 * challenge in the terminal, ending at "Run complete". Review and Drill run embedded here so the
 * run isn't lost by navigating away. A step with nothing to do is skipped with a note.
 *
 * The daily challenge starts with `useTerminal.run('daily')`; the step completes when the terminal
 * reports a finished `daily` game, or when today's daily record (Melbourne date) is complete.
 */
import { Fragment, useState } from 'react';
import type { ContentIndex } from '../../content/loader';
import type { Mcq } from '../../content/schema';
import { findGame } from '../../games/registry';
import { freshSeed, mulberry32 } from '../../games/prng';
import { melbourneDate } from '../../lib/time';
import { masteryNow } from '../../srs/hooks';
import type { QueueEntry } from '../../srs/queue';
import { useSession } from '../../state/session';
import { useSettings } from '../../state/settings';
import { useSrs } from '../../state/srs';
import { useTerminal } from '../../terminal/useTerminal';
import { Button, ButtonLink } from '../../ui/Button';
import { paths } from '../paths';
import { ContentGate } from '../study/ContentGate';
import { suggestNextStep, type DrillResult } from '../study/drill';
import { DrillRunner } from '../study/DrillRunner';
import { plural } from '../study/format';
import { PhaseHeading } from '../study/parts';
import { ReviewRunner, type ReviewSummary } from '../study/ReviewRunner';
import { reviewQueue } from '../study/reviewQueue';
import { pickRunDrill } from '../study/select';
import study from '../study/study.module.css';
import styles from '../study/Run.module.css';

type StepId = 'review' | 'drill' | 'daily';
const STEPS: { id: StepId; title: string }[] = [
  { id: 'review', title: 'Review cards' },
  { id: 'drill', title: 'Drill your weakest key knowledge' },
  { id: 'daily', title: 'Daily challenge' },
];

interface Outcome {
  status: 'done' | 'skipped';
  text: string;
}

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
  /** Move focus to the step heading (after a transition, not on page load). */
  focus: boolean;
}

export default function Run() {
  return (
    <div className={study.page}>
      <ContentGate heading="Today's run">{(content) => <RunSteps content={content} />}</ContentGate>
    </div>
  );
}

/** Moves to the first step after `after` that has something to do, noting the ones skipped. */
function advance(content: ContentIndex, state: Omit<RunState, 'step' | 'focus'>, after: StepId | null): Omit<RunState, 'focus'> {
  const now = Date.now();
  const outcomes = { ...state.outcomes };
  const order: StepId[] = ['review', 'drill', 'daily'];
  for (let i = after ? order.indexOf(after) + 1 : 0; i < order.length; i++) {
    const id = order[i];
    if (id === 'review') {
      const queue = reviewQueue(content, useSrs.getState(), useSettings.getState().newCardLimit, masteryNow(now), now);
      if (queue.length) return { ...state, outcomes, step: 'review', queue, stepAt: now };
      outcomes.review = { status: 'skipped', text: 'Nothing was due.' };
    } else if (id === 'drill') {
      const drill = pickRunDrill(content, masteryNow(now), mulberry32(freshSeed(now))).items;
      if (drill.length) return { ...state, outcomes, step: 'drill', drill, stepAt: now };
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

function RunSteps({ content }: { content: ContentIndex }) {
  const [state, setState] = useState<RunState>(() => ({
    ...advance(content, { outcomes: {}, queue: [], drill: [], drillResult: null, stepAt: 0, dailyDate: '' }, null),
    focus: false,
  }));

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

  const finishReview = (s: ReviewSummary) =>
    setState((prev) => ({
      ...advance(content, { ...prev, outcomes: { ...prev.outcomes, review: { status: 'done', text: reviewText(s) } } }, 'review'),
      focus: true,
    }));
  const finishDrill = (r: DrillResult) =>
    setState((prev) => ({
      ...advance(content, { ...prev, drillResult: r, outcomes: { ...prev.outcomes, drill: { status: 'done', text: `${r.correct} of ${r.total} correct.` } } }, 'drill'),
      focus: true,
    }));
  const skipDaily = () =>
    setState((prev) => ({
      ...prev,
      step: 'complete',
      outcomes: { ...prev.outcomes, daily: { status: 'skipped', text: 'Type daily in the terminal to take it later today.' } },
      focus: true,
    }));

  return (
    <>
      <h1>Today's run</h1>
      {step === 'complete' ? null : <StepList step={step} outcomes={outcomes} />}

      {step === 'review' ? (
        <section key="review" aria-labelledby="run-step">
          <StepHeading focus={focus} index={0} />
          <ReviewRunner content={content} queue={state.queue} where="Today's run" onFinish={finishReview} autoFocus={false} />
        </section>
      ) : step === 'drill' ? (
        <section key="drill" aria-labelledby="run-step">
          <StepHeading focus={focus} index={1} />
          <DrillRunner questions={state.drill} where="Today's run" onFinish={finishDrill} autoFocus={false} />
        </section>
      ) : step === 'daily' ? (
        <section key="daily" aria-labelledby="run-step">
          <StepHeading focus={focus} index={2} />
          <DailyStep onSkip={skipDaily} />
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

function DailyStep({ onSkip }: { onSkip(): void }) {
  const open = useTerminal((s) => s.open);
  const [started, setStarted] = useState(false);
  const start = () => {
    setStarted(true);
    useTerminal.getState().run('daily');
  };
  return (
    <>
      <p>Ten questions, the same for everyone today. Only your first attempt counts. It runs in the terminal, which opens over this page.</p>
      {started ? <p>This step finishes when you answer the tenth question. If you close the terminal, open it again to carry on.</p> : null}
      <div className={study.actions}>
        {!started ? (
          <Button variant="primary" onClick={start}>
            Start the daily challenge
          </Button>
        ) : !open ? (
          <Button variant="primary" onClick={() => useTerminal.getState().setOpen(true)}>
            Open the terminal
          </Button>
        ) : null}
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
