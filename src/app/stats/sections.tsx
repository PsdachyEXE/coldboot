/**
 * The five Stats sections (Section 6.9): accuracy by area of study, reviews per day, the 14-day due
 * forecast, the 10 weakest KKs and time studied. Each has a title, axis names in plain words, a
 * "Show data" table with the same numbers, and an empty state that says what to do next.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { KkId } from '../../content/schema';
import { areaById, kkById, studyDesign } from '../../content/studyDesign';
import { masteryBand } from '../../srs/mastery';
import { ButtonLink } from '../../ui/Button';
import { drillPath, paths, reviewPath } from '../paths';
import { lastPractised, plural } from '../study/format';
import { FORECAST_DAYS, STATS_DAYS, sumValues, type AreaAccuracy, type AreaKey, type DayValue, type Forecast, type Weakest } from './aggregate';
import { ChartSection, ColumnChart, DataTable, PercentBar, PercentLine, PercentScale, Swatch, type Column } from './charts';
import { formatPercent, formatStudyTime, longDay, shortDay, toMinutes } from './format';
import styles from './Stats.module.css';
import { useWidth } from './useWidth';

/** Axis ticks for a history window ending today: every 7th day back from today, today as "Today". */
function historyTicks(days: readonly string[]): Map<number, string> {
  const ticks = new Map<number, string>();
  const last = days.length - 1;
  for (let i = last; i >= 0; i -= 7) ticks.set(i, i === last ? 'Today' : shortDay(days[i]));
  return ticks;
}

/** Axis ticks for the forecast: today, then every 7th day, and the last day. */
function forecastTicks(days: readonly string[]): Map<number, string> {
  const ticks = new Map<number, string>();
  for (let i = 0; i < days.length; i += 7) ticks.set(i, i === 0 ? 'Today' : shortDay(days[i]));
  ticks.set(days.length - 1, shortDay(days[days.length - 1]));
  return ticks;
}

function areaTitle(area: AreaKey): string {
  if (area === 'TERMS' || area === 'PSM') return studyDesign.groups.find((g) => g.id === area)?.title ?? area;
  return areaById.get(area)?.title ?? area;
}

/** "U3O1 Software development: programming", or "Terms used in this study". */
function areaName(area: AreaKey): string {
  return area === 'TERMS' || area === 'PSM' ? areaTitle(area) : `${area} ${areaTitle(area)}`;
}

/** Where to practise an area with no recent answers. */
function practiseLink(area: AreaKey): { to: string; label: string } {
  if (area === 'TERMS') return { to: reviewPath({ kk: 'TERMS' }), label: 'Review the glossary' };
  if (area === 'PSM') return { to: drillPath({ kk: 'PSM' }), label: 'Drill the problem-solving methodology' };
  return { to: drillPath({ area }), label: `Drill ${area}` };
}

function EmptyChart({ children, action }: { children: string; action: ReactNode }) {
  return (
    <div className={styles.panelEmpty}>
      <p>{children}</p>
      <p>{action}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// (a) Accuracy by area of study
// ---------------------------------------------------------------------------

function accuracyCell(pct: number | null, n: number): string {
  return pct === null ? 'No answers' : `${formatPercent(pct)} of ${plural(n, 'answer')}`;
}

export function AccuracySection({ areas, days }: { areas: readonly AreaAccuracy[]; days: readonly string[] }) {
  const ticks = historyTicks(days);
  const any = areas.some((a) => a.n > 0);
  return (
    <ChartSection
      id="stats-accuracy"
      title="Accuracy by area of study"
      lead={
        <p className={styles.lead}>
          Your average score each study day over the last {STATS_DAYS} days, one chart per area. Questions score 0 or 100%; card ratings
          count as Again 0%, Hard 50%, Good 80% and Easy 100%. A gap in a line is a day with no answers in that area.
        </p>
      }
    >
      {any ? (
        <>
          <ul className={styles.multiples} aria-label="Accuracy charts, one per area">
            {areas.map((a) => (
              <li key={a.area}>
                <AreaPanel area={a} days={days} ticks={ticks} />
              </li>
            ))}
          </ul>
          <DataTable
            about="accuracy by area of study"
            caption={`Average score by area of study, last ${STATS_DAYS} study days`}
            columns={['Study day', ...areas.map((a) => (a.area === 'TERMS' ? 'Terms' : a.area))]}
            rows={[
              ...days.map((day, i) => [longDay(day), ...areas.map((a) => accuracyCell(a.points[i].pct, a.points[i].n))]),
              ['All days', ...areas.map((a) => accuracyCell(a.pct, a.n))],
            ]}
          />
        </>
      ) : (
        <EmptyChart
          action={
            <ButtonLink variant="primary" to={drillPath({ mode: 'weak' })}>
              Drill your weakest key knowledge
            </ButtonLink>
          }
        >
          {`No answers in the last ${STATS_DAYS} days, so there's no accuracy to chart yet.`}
        </EmptyChart>
      )}
    </ChartSection>
  );
}

function AreaPanel({ area, days, ticks }: { area: AreaAccuracy; days: readonly string[]; ticks: ReadonlyMap<number, string> }) {
  const name = areaName(area.area);
  const recent = [...area.points].reverse().find((p) => p.pct !== null);
  const link = practiseLink(area.area);
  return (
    <>
      <h3 className={styles.panelTitle}>{name}</h3>
      {area.pct === null ? (
        <EmptyChart action={<Link to={link.to}>{link.label}</Link>}>{`No answers in this area in the last ${STATS_DAYS} days.`}</EmptyChart>
      ) : (
        <>
          <p className={styles.panelFigure}>
            {formatPercent(area.pct)} average over {plural(area.n, 'answer')}
          </p>
          <PercentLine
            points={area.points.map((p, i) => ({
              key: days[i],
              value: p.pct,
              title: `${shortDay(p.day)}: ${p.pct === null ? 'no answers' : accuracyCell(p.pct, p.n)}`,
            }))}
            ticks={ticks}
            yLabel="Average score"
            summary={`Line chart of your average score in ${name} by study day: ${formatPercent(area.pct)} over the last ${STATS_DAYS} days${
              recent?.pct != null ? `, and ${formatPercent(recent.pct)} on ${longDay(recent.day)}, the latest day with answers` : ''
            }.`}
          />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// (b) Reviews per day
// ---------------------------------------------------------------------------

export function ReviewsSection({ reviews }: { reviews: readonly DayValue[] }) {
  const total = sumValues(reviews);
  const today = reviews[reviews.length - 1]?.value ?? 0;
  const busiest = reviews.reduce((best, r) => (r.value > best.value ? r : best), reviews[0]);
  const activeDays = reviews.filter((r) => r.value > 0).length;
  const columns: Column[] = reviews.map((r) => ({ key: r.day, value: r.value, title: `${shortDay(r.day)}: ${plural(r.value, 'review')}` }));
  return (
    <ChartSection id="stats-reviews" title="Reviews per day">
      {total === 0 ? (
        <EmptyChart action={<ButtonLink to={paths.review}>Go to Review</ButtonLink>}>
          {`No cards reviewed in the last ${STATS_DAYS} days.`}
        </EmptyChart>
      ) : (
        <>
          <dl className={styles.facts}>
            <div>
              <dt>Today</dt>
              <dd>{today}</dd>
            </div>
            <div>
              <dt>Last {STATS_DAYS} days</dt>
              <dd>{total}</dd>
            </div>
            <div>
              <dt>Days with reviews</dt>
              <dd>{activeDays}</dd>
            </div>
          </dl>
          <ColumnChart
            columns={columns}
            ticks={historyTicks(reviews.map((r) => r.day))}
            yLabel="Cards reviewed"
            xLabel="Study day"
            summary={`Column chart of cards reviewed per study day over the last ${STATS_DAYS} days: ${total} in all, the most ${busiest.value} on ${longDay(busiest.day)}.`}
          />
          <DataTable
            about="reviews per day"
            caption={`Cards reviewed per study day, last ${STATS_DAYS} days`}
            columns={['Study day', 'Cards reviewed']}
            rows={[...reviews.map((r) => [longDay(r.day), String(r.value)]), ['All days', String(total)]]}
          />
        </>
      )}
    </ChartSection>
  );
}

// ---------------------------------------------------------------------------
// (c) Due forecast
// ---------------------------------------------------------------------------

export function ForecastSection({ forecast, newCardLimit }: { forecast: Forecast; newCardLimit: number }) {
  const inWindow = forecast.days.reduce((s, d) => s + d.due, 0);
  const dueNow = forecast.days[0]?.dueNow ?? 0;
  const lastDay = forecast.days[forecast.days.length - 1]?.day ?? '';
  const columns: Column[] = forecast.days.map((d, i) => ({
    key: d.day,
    value: d.due,
    hatched: d.dueNow,
    title: i === 0 ? `Today: ${plural(d.due, 'card')}, ${d.dueNow} of them due now` : `${shortDay(d.day)}: ${plural(d.due, 'card')}`,
  }));
  const tallest = columns.reduce((best, c, i) => (c.value > columns[best].value ? i : best), 0);
  return (
    <ChartSection
      id="stats-forecast"
      title={`Cards due in the next ${FORECAST_DAYS} days`}
      lead={
        <p className={styles.lead}>
          Cards you've already reviewed, by the study day they come back. New cards aren't included: Review adds up to{' '}
          {plural(newCardLimit, 'new card')} a day on top of these.
        </p>
      }
    >
      {forecast.total === 0 ? (
        <EmptyChart action={<ButtonLink to={paths.review}>Go to Review</ButtonLink>}>
          No cards are scheduled yet. A card joins the forecast once you've reviewed it.
        </EmptyChart>
      ) : (
        <>
          <dl className={styles.facts}>
            <div>
              <dt>Due now</dt>
              <dd>{dueNow}</dd>
            </div>
            <div>
              <dt>Next {FORECAST_DAYS} days</dt>
              <dd>{inWindow}</dd>
            </div>
            <div>
              <dt>After {shortDay(lastDay)}</dt>
              <dd>{forecast.later}</dd>
            </div>
          </dl>
          <ul className={styles.legend} aria-label="Key">
            <li>
              <Swatch kind="hatched" />
              Due now, including overdue cards
            </li>
            <li>
              <Swatch kind="solid" />
              Due later that day
            </li>
          </ul>
          <ColumnChart
            columns={columns}
            ticks={forecastTicks(forecast.days.map((d) => d.day))}
            yLabel="Cards due"
            xLabel="Study day"
            labelled={tallest === 0 ? [0] : [0, tallest]}
            summary={`Column chart of cards due per study day for the next ${FORECAST_DAYS} days: ${dueNow} due now, ${inWindow} in all, and ${forecast.later} more after ${longDay(lastDay)}.`}
          />
          <DataTable
            about="the due forecast"
            caption={`Cards due per study day, next ${FORECAST_DAYS} days`}
            columns={['Study day', 'Cards due', 'Of them, due now']}
            rows={[
              ...forecast.days.map((d, i) => [i === 0 ? `Today, ${longDay(d.day)}` : longDay(d.day), String(d.due), i === 0 ? String(d.dueNow) : '']),
              [`After ${longDay(lastDay)}`, String(forecast.later), ''],
            ]}
          />
        </>
      )}
    </ChartSection>
  );
}

// ---------------------------------------------------------------------------
// (d) Weakest KKs
// ---------------------------------------------------------------------------

function kkParts(kk: KkId): { id: string; title: string } {
  if (kk === 'TERMS' || kk === 'PSM') return { id: kk, title: areaTitle(kk) };
  return { id: kk, title: kkById.get(kk)?.title ?? '' };
}

export function WeakestSection({ weakest, now }: { weakest: Weakest; now: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const barWidth = Math.max(120, Math.min(width, 760));
  const total = weakest.seen + weakest.unseen;
  const shown = weakest.weakest.length;
  return (
    <div ref={ref}>
      <ChartSection
        id="stats-weakest"
        title="Weakest key knowledge"
        lead={
          <p className={styles.lead}>
            The {shown > 1 ? `${shown} ` : ''}key knowledge {shown === 1 ? 'point' : 'points'} you've practised with the lowest mastery, weakest
            first. Mastery weights recent answers most. Select one to drill it.
          </p>
        }
      >
        {weakest.seen === 0 ? (
          <EmptyChart
            action={
              <ButtonLink variant="primary" to={paths.map}>
                Open the syllabus map
              </ButtonLink>
            }
          >
            {`You haven't practised any key knowledge yet, so all ${total} points are unseen. Pick one from the syllabus map to start.`}
          </EmptyChart>
        ) : (
          <>
            <p className={styles.muted} id="stats-weakest-scale">
              Mastery, from 0 to 100%
            </p>
            <PercentScale width={barWidth} />
            <ol className={styles.weakList} aria-describedby="stats-weakest-scale">
              {weakest.weakest.map((w) => {
                const { id, title } = kkParts(w.kk);
                return (
                  <li key={w.kk}>
                    <div className={styles.weakHead}>
                      <Link to={drillPath({ kk: w.kk })} className={styles.weakName}>
                        <span className={styles.weakId}>{id}</span>
                        {title}
                      </Link>
                      <span className={styles.weakValue}>
                        {formatPercent(w.value)}, {masteryBand(w.value)}
                      </span>
                    </div>
                    <PercentBar width={barWidth} value={w.value} />
                    <p className={styles.weakMeta}>
                      {plural(w.n, 'answer')}. Last practised: {lastPractised(w.last, now, true).toLowerCase()}.
                    </p>
                  </li>
                );
              })}
            </ol>
            <p className={styles.note}>
              {weakest.unseen === 0 ? (
                `You've practised all ${total} key knowledge points at least once.`
              ) : (
                <>
                  {plural(weakest.unseen, 'key knowledge point')} {weakest.unseen === 1 ? "is unseen, so it isn't" : "are unseen, so they aren't"}{' '}
                  ranked here. <Link to={paths.map}>Find unseen key knowledge on the syllabus map</Link>
                </>
              )}
            </p>
            <DataTable
              about="the weakest key knowledge"
              caption="Weakest key knowledge by mastery"
              columns={['Key knowledge', 'Mastery', 'Answers', 'Last practised']}
              rows={weakest.weakest.map((w) => {
                const { id, title } = kkParts(w.kk);
                return [`${id} ${title}`, formatPercent(w.value), String(w.n), lastPractised(w.last, now, true)];
              })}
            />
          </>
        )}
      </ChartSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// (e) Time studied
// ---------------------------------------------------------------------------

export function TimeSection({ time, total, studiedDays }: { time: readonly DayValue[]; total: number; studiedDays: number }) {
  const windowTotal = sumValues(time);
  const today = time[time.length - 1]?.value ?? 0;
  const busiest = time.reduce((best, t) => (t.value > best.value ? t : best), time[0]);
  const columns: Column[] = time.map((t) => ({ key: t.day, value: toMinutes(t.value), title: `${shortDay(t.day)}: ${formatStudyTime(t.value)}` }));
  return (
    <ChartSection
      id="stats-time"
      title="Time studied"
      lead={
        <p className={styles.lead}>
          Time counts from when a card or question appears until you answer it, up to 10 minutes each, so breaks don't count.
        </p>
      }
    >
      <dl className={styles.facts}>
        <div>
          <dt>Today</dt>
          <dd>{formatStudyTime(today)}</dd>
        </div>
        <div>
          <dt>Last {STATS_DAYS} days</dt>
          <dd>{formatStudyTime(windowTotal)}</dd>
        </div>
        <div>
          <dt>In total</dt>
          <dd>{formatStudyTime(total)}</dd>
        </div>
        <div>
          <dt>Days studied</dt>
          <dd>{studiedDays}</dd>
        </div>
      </dl>
      {windowTotal === 0 ? (
        <EmptyChart action={<ButtonLink to={paths.run}>Start today's run</ButtonLink>}>{`No study time in the last ${STATS_DAYS} days.`}</EmptyChart>
      ) : (
        <>
          <ColumnChart
            columns={columns}
            ticks={historyTicks(time.map((t) => t.day))}
            yLabel="Minutes studied"
            xLabel="Study day"
            format={(v) => String(Math.round(v))}
            summary={`Column chart of minutes studied per study day over the last ${STATS_DAYS} days: ${formatStudyTime(windowTotal)} in all, the most ${formatStudyTime(busiest.value)} on ${longDay(busiest.day)}.`}
          />
          <DataTable
            about="time studied"
            caption={`Time studied per study day, last ${STATS_DAYS} days`}
            columns={['Study day', 'Time studied']}
            rows={[
              ...time.map((t) => [longDay(t.day), formatStudyTime(t.value)]),
              [`Last ${STATS_DAYS} days`, formatStudyTime(windowTotal)],
              ['In total', formatStudyTime(total)],
            ]}
          />
        </>
      )}
    </ChartSection>
  );
}
