/**
 * Home (Section 6.2): one primary action, "Start today's run", with what the run holds; today's due
 * count, streak and daily challenge status; and the coverage grid of every KK shaded by mastery.
 * Selecting a cell starts a focused drill. While a run is under way in this tab (left for the Daily
 * screen or anywhere else), the action is "Continue today's run", with where the run is up to.
 *
 * Exam day (the status bar has the same states):
 * - on the exam's date before it starts, the run gives way to the exam time in Melbourne, the time
 *   left and a calm suggestion: a light review or the mini paper;
 * - during reading and writing time, only "The exam is underway. Good luck.", with no study nags;
 * - afterwards, "The exam is over. Well done.", with export, stats, the syllabus map and a note that
 *   the scheduler's exam caps have lifted.
 */
import { Link, useNavigate } from 'react-router';
import type { ContentIndex } from '../../content/loader';
import { useContentIndex } from '../../content/store';
import { ALL_KK_IDS, kkLabel } from '../../content/studyDesign';
import {
  EXAM_READING_MS,
  EXAM_WRITING_MS,
  examDayState,
  formatMelbourneClock,
  formatTimeLeft,
  melbourneDate,
  studyDay,
  type ExamDayState,
} from '../../lib/time';
import { useNow } from '../../lib/useNow';
import { useDueSummary, useExamAt, useMastery } from '../../srs/hooks';
import type { MasteryMap } from '../../srs/mastery';
import { streak, useSession, type DailyRecord } from '../../state/session';
import { useSrs } from '../../state/srs';
import { Button, ButtonLink } from '../../ui/Button';
import { Panel } from '../../ui/Panel';
import { examPath, paths, practisePath, reviewPath } from '../paths';
import { ContentErrorNotice } from '../study/ContentGate';
import { CoverageGrid, CoverageLegend } from '../study/CoverageGrid';
import { plural } from '../study/format';
import { readRun, RUN_STEPS, type SavedRun } from '../study/runState';
import { kksWithItems, rankWeakest } from '../study/select';
import study from '../study/study.module.css';
import styles from '../study/Coverage.module.css';
import { useExportProgress } from './settings/useExportProgress';

export default function Home() {
  const now = useNow(60_000);
  const examAt = useExamAt();
  const mode = examDayState(now, examAt);
  // During the exam nothing asks for study: no run, no due count, no coverage.
  if (mode === 'underway') return <ExamUnderway now={now} examAt={examAt} />;
  return <Today now={now} examAt={examAt} mode={mode} />;
}

function Today({ now, examAt, mode }: { now: number; examAt: number; mode: Exclude<ExamDayState, 'underway'> }) {
  const navigate = useNavigate();
  const content = useContentIndex();
  const mastery = useMastery();
  const { due, newRemaining } = useDueSummary(now);
  const activity = useSession((s) => s.activity);
  const daily = useSession((s) => s.daily[melbourneDate(now)]);
  const days = streak(activity, studyDay(now));
  // A run under way in this tab carries on where it was left (src/app/study/runState.ts).
  const saved = mode === 'study' ? readRun(studyDay(now)) : null;
  const dailyStatus = daily?.completedAt
    ? `Done, ${daily.results.reduce<number>((s, r) => s + r, 0)} of ${daily.itemIds.length}`
    : daily && daily.results.length > 0
      ? `${daily.results.length} of ${daily.itemIds.length} answered`
      : 'Not done yet';

  return (
    <div>
      <h1>Today</h1>
      <ContentErrorNotice />
      {mode === 'exam-day' ? <ExamDay now={now} examAt={examAt} /> : mode === 'over' ? <ExamOver /> : null}
      {mode === 'study' ? (
        <>
          {saved ? <RunPlace saved={saved} /> : <RunPreview content={content} mastery={mastery} due={due} newRemaining={newRemaining} daily={daily} />}
          <p>
            <ButtonLink variant="primary" to={paths.run}>
              {saved ? "Continue today's run" : "Start today's run"}
            </ButtonLink>
          </p>
          <TodayFacts due={due} days={days} dailyStatus={dailyStatus} />
        </>
      ) : null}

      <section aria-labelledby="coverage">
        <h2 id="coverage">Coverage</h2>
        <p>
          Every key knowledge point, one row per area of study, shaded by your mastery. Select one to drill it, or open the{' '}
          <Link to={paths.map}>syllabus map</Link> for the detail.
        </p>
        <CoverageLegend />
        <CoverageGrid mastery={mastery} onSelect={(kk) => navigate(practisePath(kk))} />
      </section>
    </div>
  );
}

function TodayFacts({ due, days, dailyStatus }: { due: number; days: number; dailyStatus: string }) {
  return (
    <dl className={styles.facts}>
      <div>
        <dt>Reviews due</dt>
        <dd>{due === 0 ? 'None' : due}</dd>
      </div>
      <div>
        <dt>Streak</dt>
        <dd>{plural(days, 'day')}</dd>
      </div>
      <div>
        <dt>Daily challenge</dt>
        <dd>
          <Link to={paths.daily} aria-label={`Daily challenge: ${dailyStatus}`}>
            {dailyStatus}
          </Link>
        </dd>
      </div>
    </dl>
  );
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The morning of the exam: when it starts, the time left, and a calm last-minute suggestion. */
function ExamDay({ now, examAt }: { now: number; examAt: number }) {
  return (
    <Panel as="section" aria-labelledby="exam-day" className={styles.exam}>
      <h2 id="exam-day">Exam today at {formatMelbourneClock(examAt)} (Melbourne time)</h2>
      <p className={styles.examLead}>{capitalise(formatTimeLeft(now, examAt))} to go.</p>
      <p>
        Today is for a light warm-up, not new work: review a few cards or sit the 30-minute mini paper, then put your notes away. Eat
        something, drink some water and get to the exam room early.
      </p>
      <div className={study.actions}>
        <ButtonLink variant="primary" to={reviewPath({ due: true })}>
          Review a few cards
        </ButtonLink>
        <ButtonLink to={examPath({ mini: true })}>Sit the mini paper</ButtonLink>
      </div>
    </Panel>
  );
}

/** Reading and writing time: good luck, when it ends, and nothing else. */
function ExamUnderway({ now, examAt }: { now: number; examAt: number }) {
  const readingEnds = examAt + EXAM_READING_MS;
  const writingEnds = formatMelbourneClock(readingEnds + EXAM_WRITING_MS);
  return (
    <div>
      <h1>Today</h1>
      <Panel as="section" aria-labelledby="exam-underway" className={styles.exam}>
        <h2 id="exam-underway">The exam is underway. Good luck.</h2>
        <p>
          {now < readingEnds
            ? `Reading time ends at ${formatMelbourneClock(readingEnds)}, then writing time runs until ${writingEnds} (Melbourne time).`
            : `Writing time ends at ${writingEnds} (Melbourne time).`}
        </p>
      </Panel>
    </div>
  );
}

/** After the exam: well done, the progress file and records, and the caps lifted. */
function ExamOver() {
  const { exportProgress, status } = useExportProgress();
  return (
    <Panel as="section" aria-labelledby="exam-over" className={styles.exam}>
      <h2 id="exam-over">The exam is over. Well done.</h2>
      <p>Your progress is still here. Export it to keep a copy, or look back over your stats and the syllabus map.</p>
      <p>
        Reviews are back to their normal spacing: the exam caps, which brought every card back at least two days before the exam, have
        lifted.
      </p>
      <div className={study.actions}>
        <Button variant="primary" onClick={exportProgress}>
          Export progress
        </Button>
        <ButtonLink to={paths.stats}>See your stats</ButtonLink>
        <ButtonLink to={paths.map}>Open the syllabus map</ButtonLink>
      </div>
      {status}
      <p className={study.hint}>
        Exam date wrong? <Link to={paths.settings}>Change it in Settings</Link>.
      </p>
    </Panel>
  );
}

/** Where a run under way is up to: the finished steps' outcomes, the step to carry on with, then the rest. */
function RunPlace({ saved }: { saved: SavedRun }) {
  const at = RUN_STEPS.findIndex((s) => s.id === saved.step);
  const current = RUN_STEPS[at];
  const ahead = RUN_STEPS.slice(at + 1);
  const reviewed = saved.review.cardIds.length;
  const detail =
    saved.step === 'review' && reviewed > 0
      ? `, ${plural(reviewed, 'card')} reviewed so far`
      : saved.step === 'drill' && saved.drillIds.length > 0
        ? `, ${saved.drillAnswers.length} of ${saved.drillIds.length} answered`
        : '';
  return (
    <ol className={styles.steps} aria-label="Today's run">
      {RUN_STEPS.slice(0, at).map((s) => {
        const outcome = saved.outcomes[s.id];
        return outcome ? (
          <li key={s.id}>
            {s.title}. {outcome.status === 'done' ? 'Done' : 'Skipped'}: {outcome.text}
          </li>
        ) : null;
      })}
      <li>
        Next: {current.phrase}
        {detail}.
      </li>
      {ahead.length ? <li>Then: {ahead.map((s) => s.short).join(', then ')}.</li> : null}
    </ol>
  );
}

function RunPreview({
  content,
  mastery,
  due,
  newRemaining,
  daily,
}: {
  content: ContentIndex | null;
  mastery: MasteryMap;
  due: number;
  newRemaining: number;
  /** Today's daily challenge record, if the student has started it. */
  daily: DailyRecord | undefined;
}) {
  const cards = useSrs((s) => s.cards);
  const unseen = content ? content.cards.filter((c) => !cards[c.id]).length : 0;
  const fresh = Math.min(unseen, newRemaining);
  // Until the content has loaded, every KK but Terms (which has no questions) is a candidate, so
  // the line reads the same before and after and the page below doesn't shift.
  const weakest = rankWeakest(content ? kksWithItems(content, 'mcq') : ALL_KK_IDS.filter((kk) => kk !== 'TERMS'), mastery)[0];

  const review = !content
    ? due
      ? `Review ${plural(due, 'due card')} and today's new cards.`
      : "Learn today's new cards."
    : due && fresh
      ? `Review ${plural(due, 'due card')} and ${plural(fresh, 'new card')}.`
      : due
        ? `Review ${plural(due, 'due card')}.`
        : fresh
          ? `Learn ${plural(fresh, 'new card')}.`
          : 'No cards to review: this step is skipped.';
  // With no attempts at the chosen KK, it is simply the first one not tried yet, not the weakest.
  const drill = weakest
    ? mastery.has(weakest)
      ? `Drill 10 questions, starting with your weakest key knowledge, ${kkLabel(weakest)}.`
      : `Drill 10 questions, starting with key knowledge you haven't tried yet, ${kkLabel(weakest)}.`
    : 'No questions to drill yet: this step is skipped.';
  const dailyText = daily?.completedAt
    ? "Daily challenge: you've done today's."
    : daily && daily.results.length > 0
      ? `Finish the daily challenge: ${daily.results.length} of ${daily.itemIds.length} answered.`
      : 'Take the daily challenge in the terminal.';

  return (
    <ol className={styles.steps} aria-label="Today's run">
      <li>{review}</li>
      <li>{drill}</li>
      <li>{dailyText}</li>
    </ol>
  );
}
