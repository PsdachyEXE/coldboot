/**
 * Home (Section 6.2): one primary action, "Start today's run", with what the run holds; today's due
 * count, streak and daily challenge status; and the coverage grid of every KK shaded by mastery.
 * Selecting a cell starts a focused drill.
 */
import { Link, useNavigate } from 'react-router';
import type { ContentIndex } from '../../content/loader';
import { useContentIndex } from '../../content/store';
import { ALL_KK_IDS, kkLabel } from '../../content/studyDesign';
import { melbourneDate, studyDay } from '../../lib/time';
import { useNow } from '../../lib/useNow';
import { useDueSummary, useMastery } from '../../srs/hooks';
import type { MasteryMap } from '../../srs/mastery';
import { streak, useSession, type DailyRecord } from '../../state/session';
import { useSrs } from '../../state/srs';
import { ButtonLink } from '../../ui/Button';
import { drillPath, paths } from '../paths';
import { ContentErrorNotice } from '../study/ContentGate';
import { CoverageGrid, CoverageLegend } from '../study/CoverageGrid';
import { plural } from '../study/format';
import { kksWithItems, rankWeakest } from '../study/select';
import styles from '../study/Coverage.module.css';

export default function Home() {
  const navigate = useNavigate();
  const content = useContentIndex();
  const now = useNow(60_000);
  const mastery = useMastery();
  const { due, newRemaining } = useDueSummary(now);
  const activity = useSession((s) => s.activity);
  const daily = useSession((s) => s.daily[melbourneDate(now)]);
  const days = streak(activity, studyDay(now));
  const dailyStatus = daily?.completedAt
    ? `Done, ${daily.results.reduce<number>((s, r) => s + r, 0)} of ${daily.itemIds.length}`
    : daily && daily.results.length > 0
      ? `${daily.results.length} of ${daily.itemIds.length} answered`
      : 'Not done yet';

  return (
    <div>
      <h1>Today</h1>
      <ContentErrorNotice />
      <RunPreview content={content} mastery={mastery} due={due} newRemaining={newRemaining} daily={daily} />
      <p>
        <ButtonLink variant="primary" to={paths.run}>
          Start today's run
        </ButtonLink>
      </p>

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

      <section aria-labelledby="coverage">
        <h2 id="coverage">Coverage</h2>
        <p>
          Every key knowledge point, one row per area of study, shaded by your mastery. Select one to drill it, or open the{' '}
          <Link to={paths.map}>syllabus map</Link> for the detail.
        </p>
        <CoverageLegend />
        <CoverageGrid mastery={mastery} onSelect={(kk) => navigate(drillPath({ kk }))} />
      </section>
    </div>
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
