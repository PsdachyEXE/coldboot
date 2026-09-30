/**
 * Stats aggregations (Section 6.9). Pure functions over the session's per-study-day activity, the
 * SRS schedule and KK mastery, so every chart on the Stats screen is a plain transform of stored
 * data and can be unit-tested without rendering.
 *
 * Days here are study days (4 am rollover, src/lib/time.ts). A chart's window is the last N study
 * days on the calendar, ending today, so a day without study shows as a gap rather than vanishing.
 */
import { AREA_IDS, GROUP_IDS, type AreaId, type GroupId, type KkId } from '../../content/schema';
import { ALL_KK_IDS } from '../../content/studyDesign';
import { addDays, daysBetween, studyDay } from '../../lib/time';
import type { MasteryMap } from '../../srs/mastery';
import type { DayActivity } from '../../state/session';
import type { SrsCardState } from '../../state/srs';

/** History charts cover the last 21 study days. */
export const STATS_DAYS = 21;
/** The due forecast covers 14 study days, starting today. */
export const FORECAST_DAYS = 14;
/** How many of the weakest KKs the list shows. */
export const WEAKEST_COUNT = 10;

export type AreaKey = AreaId | GroupId;
/** The four areas of study, then Terms and PSM: the keys of `DayActivity.areas`. */
export const AREA_KEYS: readonly AreaKey[] = [...AREA_IDS, ...GROUP_IDS];

export type Activity = Readonly<Record<string, DayActivity>>;

/** The `n` study days ending at `today`, oldest first. */
export function lastDays(today: string, n = STATS_DAYS): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

/** True when any day holds an attempt. */
export function hasActivity(activity: Activity): boolean {
  return Object.values(activity).some((d) => d.n > 0);
}

export interface AccuracyPoint {
  day: string;
  /** Answers in this area that day. */
  n: number;
  /** Mean score as a percentage (0 to 100), or null when there were no answers: a gap, not zero. */
  pct: number | null;
}

export interface AreaAccuracy {
  area: AreaKey;
  points: AccuracyPoint[];
  /** Answers over the whole window. */
  n: number;
  /** Mean score over the window (0 to 100), or null with no answers. */
  pct: number | null;
}

function percent(sum: number, n: number): number | null {
  return n > 0 ? Math.min(100, Math.max(0, (sum / n) * 100)) : null;
}

/**
 * Accuracy per area per day from `activity[day].areas` ([answers, summed score] pairs). Card
 * ratings contribute their scores (Again 0, Hard 0.5, Good 0.8, Easy 1), so this is the mean score.
 */
export function accuracyByArea(activity: Activity, days: readonly string[]): AreaAccuracy[] {
  return AREA_KEYS.map((area) => {
    let n = 0;
    let sum = 0;
    const points = days.map((day): AccuracyPoint => {
      const pair = activity[day]?.areas[area];
      const dn = pair?.[0] ?? 0;
      const ds = pair?.[1] ?? 0;
      n += dn;
      sum += ds;
      return { day, n: dn, pct: percent(ds, dn) };
    });
    return { area, points, n, pct: percent(sum, n) };
  });
}

export interface DayValue {
  day: string;
  value: number;
}

/** Cards reviewed per day. */
export function reviewsPerDay(activity: Activity, days: readonly string[]): DayValue[] {
  return days.map((day) => ({ day, value: activity[day]?.reviews ?? 0 }));
}

/** Time spent answering per day, in milliseconds. */
export function timePerDay(activity: Activity, days: readonly string[]): DayValue[] {
  return days.map((day) => ({ day, value: activity[day]?.ms ?? 0 }));
}

/** Time spent answering over every recorded day, in milliseconds. */
export function totalTime(activity: Activity): number {
  return Object.values(activity).reduce((sum, d) => sum + d.ms, 0);
}

/** Days in the record with at least one answer. */
export function daysStudied(activity: Activity): number {
  return Object.values(activity).filter((d) => d.n > 0).length;
}

export function sumValues(values: readonly DayValue[]): number {
  return values.reduce((sum, v) => sum + v.value, 0);
}

export interface ForecastDay {
  day: string;
  /** Cards due on this study day. Today's count includes every card already due. */
  due: number;
  /** Of `due`, the cards due now (overdue or due earlier today). Only ever non-zero today. */
  dueNow: number;
}

export interface Forecast {
  days: ForecastDay[];
  /** Cards due after the window. */
  later: number;
  /** Every scheduled card counted. */
  total: number;
}

/**
 * Cards falling due per study day over the next `n` days, starting today. Cards already due count
 * toward today. Pass `known` (the content's card ids) to leave out records for removed cards, so
 * the forecast agrees with the due count everywhere else.
 */
export function dueForecast(
  cards: Readonly<Record<string, SrsCardState>>,
  now: number,
  known?: ReadonlySet<string>,
  n = FORECAST_DAYS,
): Forecast {
  const today = studyDay(now);
  const days = Array.from({ length: n }, (_, i): ForecastDay => ({ day: addDays(today, i), due: 0, dueNow: 0 }));
  let later = 0;
  let total = 0;
  for (const id in cards) {
    if (known && !known.has(id)) continue;
    total++;
    const due = cards[id].due;
    if (due <= now) {
      days[0].due++;
      days[0].dueNow++;
      continue;
    }
    const index = daysBetween(today, studyDay(due));
    if (index < n) days[Math.max(0, index)].due++;
    else later++;
  }
  return { days, later, total };
}

export interface WeakKk {
  kk: KkId;
  /** Mastery, 0 to 100. */
  value: number;
  /** Attempts counted. */
  n: number;
  /** Epoch ms of the latest attempt (0 when only rolled-up attempts remain). */
  last: number;
}

export interface Weakest {
  weakest: WeakKk[];
  /** KKs with at least one attempt. */
  seen: number;
  /** KKs with no attempts: left out of the ranking, never counted as zero. */
  unseen: number;
}

/**
 * The `count` lowest-mastery KKs among those seen, weakest first; ties keep study-design order.
 * Unseen KKs are excluded and counted separately. KKs outside the current map are ignored.
 */
export function weakestKks(mastery: MasteryMap, count = WEAKEST_COUNT, kks: readonly KkId[] = ALL_KK_IDS): Weakest {
  const seen: WeakKk[] = [];
  for (const kk of kks) {
    const m = mastery.get(kk);
    if (m) seen.push({ kk, value: m.value, n: m.n, last: m.last });
  }
  const order = new Map(kks.map((kk, i) => [kk, i]));
  seen.sort((a, b) => a.value - b.value || order.get(a.kk)! - order.get(b.kk)!);
  return { weakest: seen.slice(0, count), seen: seen.length, unseen: kks.length - seen.length };
}

/** Clean axis ticks from 0 to at least `max`: 0, step, 2 step... with 2 to 4 intervals. */
export function niceTicks(max: number): number[] {
  if (!(max > 0)) return [0, 1];
  const rough = max / 3;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  const whole = step < 1 ? 1 : step;
  const top = Math.ceil(max / whole) * whole;
  const ticks: number[] = [];
  for (let v = 0; v <= top + whole / 2; v += whole) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}
