/**
 * Stats (Section 6.9, P1): plain SVG charts of accuracy by area of study over time, reviews per
 * day, a 14-day due forecast, the 10 weakest KKs and time studied. Everything comes from stored
 * progress (session activity, the SRS schedule and the attempt log) through the pure aggregations
 * in src/app/stats/aggregate.ts. With no progress at all, the screen says how to start instead.
 */
import { useMemo } from 'react';
import { useContent, useContentIndex } from '../../content/store';
import { studyDay } from '../../lib/time';
import { useNow } from '../../lib/useNow';
import { useMastery } from '../../srs/hooks';
import { useSession } from '../../state/session';
import { useSettings } from '../../state/settings';
import { useSrs } from '../../state/srs';
import { ButtonLink } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { paths } from '../paths';
import {
  accuracyByArea,
  daysStudied,
  dueForecast,
  hasActivity,
  lastDays,
  reviewsPerDay,
  timePerDay,
  totalTime,
  weakestKks,
} from '../stats/aggregate';
import { AccuracySection, ForecastSection, ReviewsSection, TimeSection, WeakestSection } from '../stats/sections';
import styles from '../stats/Stats.module.css';

export default function Stats() {
  // Loads the content once (shared), so the forecast can leave out cards that have left the content.
  useContentIndex();
  const now = useNow(60_000);
  const today = studyDay(now);
  const activity = useSession((s) => s.activity);
  const cards = useSrs((s) => s.cards);
  const known = useContent((s) => s.index?.cardIds);
  const newCardLimit = useSettings((s) => s.newCardLimit);
  const mastery = useMastery();

  const days = useMemo(() => lastDays(today), [today]);
  const accuracy = useMemo(() => accuracyByArea(activity, days), [activity, days]);
  const reviews = useMemo(() => reviewsPerDay(activity, days), [activity, days]);
  const time = useMemo(() => timePerDay(activity, days), [activity, days]);
  const forecast = useMemo(() => dueForecast(cards, now, known), [cards, now, known]);
  const weakest = useMemo(() => weakestKks(mastery), [mastery]);

  const nothingYet = !hasActivity(activity) && forecast.total === 0 && weakest.seen === 0;

  return (
    <div className={styles.page}>
      <h1>Stats</h1>
      {nothingYet ? (
        <EmptyState
          title="Nothing to chart yet"
          action={
            <ButtonLink variant="primary" to={paths.run}>
              Start today's run
            </ButtonLink>
          }
        >
          <p>
            Your charts fill in as you study: accuracy by area, reviews, cards coming due, your weakest key knowledge and time studied.
            Start today's run to review some cards and answer some questions, then come back here.
          </p>
        </EmptyState>
      ) : (
        <>
          <p className={styles.lead}>
            How your revision is going, from the progress saved in this browser. Each study day runs from 4 am to 4 am, so a late night
            counts toward the day before.
          </p>
          <AccuracySection areas={accuracy} days={days} />
          <ReviewsSection reviews={reviews} />
          <ForecastSection forecast={forecast} newCardLimit={newCardLimit} />
          <WeakestSection weakest={weakest} now={now} />
          <TimeSection time={time} total={totalTime(activity)} studiedDays={daysStudied(activity)} />
        </>
      )}
    </div>
  );
}
