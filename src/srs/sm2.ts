/**
 * SM-2 scheduler contract (Section 6.3). Implemented and unit-tested by track E.
 *
 * - Ratings: 1 Again, 2 Hard, 3 Good, 4 Easy map to quality 1, 3, 4, 5.
 * - Quality below 3 resets reps, sets the interval to 1 day, and re-queues the card 10 minutes later
 *   in the same session.
 * - Intervals: 1 day, 6 days, then previous interval x ease. Ease starts at 2.5, updates with the
 *   standard SM-2 formula and never drops below 1.3.
 * - Exam cap: due dates land no later than two days before the exam, but never earlier than tomorrow.
 *   In the final 7 days, intervals cap at 2 days. Both caps lift once the exam has passed.
 * - Due dates fall at the start of a study day (4:00 am local).
 *
 * Implementation notes (track E):
 * - The ease update runs on every rating, Again included, and the new ease is the one that
 *   multiplies the interval. Hard, Good and Easy therefore give different intervals from the third
 *   review on, which is what the rating buttons show.
 * - The stored interval is the effective one: the whole study days actually scheduled after the exam
 *   caps. The next review multiplies what really happened, not an interval the cap cut short.
 * - A lapsed card is due at the start of the next study day; the 10-minute requeue lives only in the
 *   session that asked for it (`requeueAfterMs`).
 */
import type { SrsCardState } from '../state/srs';
import { addDays, daysBetween, studyDay, studyDayStart } from '../lib/time';

export type Rating = 1 | 2 | 3 | 4;
export const RATINGS: readonly Rating[] = [1, 2, 3, 4];
export const RATING_LABELS: Record<Rating, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
export const RATING_QUALITY: Record<Rating, number> = { 1: 1, 2: 3, 3: 4, 4: 5 };
/** Mastery score per rating (Section 6.13). */
export const RATING_SCORE: Record<Rating, number> = { 1: 0, 2: 0.5, 3: 0.8, 4: 1 };
export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const REQUEUE_MS = 10 * 60_000;
/** In the final days before the exam's study day, intervals cap at FINAL_WEEK_MAX_INTERVAL days. */
export const FINAL_WEEK_DAYS = 7;
export const FINAL_WEEK_MAX_INTERVAL = 2;
/** Due dates land no later than this many days before the exam's study day. */
export const EXAM_CAP_DAYS_BEFORE = 2;
/** Upper bounds the SRS store accepts (SrsCardStateSchema); no real schedule reaches them. */
export const MAX_EASE = 10;
export const MAX_INTERVAL_DAYS = 36_500;

export interface ScheduleResult {
  next: SrsCardState;
  /** Set when the card should come back later in the same session (quality below 3). */
  requeueAfterMs: number | null;
}

export interface ScheduleOptions {
  /** Exam start instant, epoch ms. */
  examAt: number;
}

/** The standard SM-2 ease update for quality q (0 to 5), floored at MIN_EASE. */
export function nextEase(ease: number, quality: number): number {
  const d = 5 - quality;
  const updated = ease + (0.1 - d * (0.08 + d * 0.02));
  // Round away float noise (2.5 - 0.14 must be 2.36, not 2.3599999999999999) so stored values stay tidy.
  return Math.min(MAX_EASE, Math.max(MIN_EASE, Math.round(updated * 1e6) / 1e6));
}

/** The state of a card that has never been reviewed. */
export function newCardState(now: number): SrsCardState {
  return { reps: 0, interval: 0, ease: INITIAL_EASE, due: now, lapses: 0, last: 0 };
}

/**
 * Applies the exam caps to an uncapped interval and returns the study day the card falls due.
 * Before the exam: at most FINAL_WEEK_MAX_INTERVAL days in the final week, then no later than
 * EXAM_CAP_DAYS_BEFORE days before the exam's study day, but never earlier than tomorrow.
 */
export function capDueDay(today: string, interval: number, now: number, examAt: number): string {
  const tomorrow = addDays(today, 1);
  if (!Number.isFinite(examAt) || now >= examAt) return addDays(today, Math.max(1, interval));
  const examDay = studyDay(examAt);
  let days = Math.max(1, interval);
  if (daysBetween(today, examDay) <= FINAL_WEEK_DAYS) days = Math.min(days, FINAL_WEEK_MAX_INTERVAL);
  let due = addDays(today, days);
  const latest = addDays(examDay, -EXAM_CAP_DAYS_BEFORE);
  if (due > latest) due = latest;
  if (due < tomorrow) due = tomorrow;
  return due;
}

export function schedule(prev: SrsCardState | undefined, rating: Rating, now: number, opts: ScheduleOptions): ScheduleResult {
  const state = prev ?? newCardState(now);
  const quality = RATING_QUALITY[rating];
  const ease = nextEase(state.ease, quality);
  let reps: number;
  let interval: number;
  let lapses = state.lapses;
  let requeueAfterMs: number | null = null;

  if (quality >= 3) {
    if (state.reps === 0) interval = 1;
    else if (state.reps === 1) interval = 6;
    else interval = Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(state.interval * ease)));
    reps = state.reps + 1;
  } else {
    reps = 0;
    interval = 1;
    lapses += 1;
    requeueAfterMs = REQUEUE_MS;
  }

  const today = studyDay(now);
  const dueDay = capDueDay(today, interval, now, opts.examAt);
  return {
    next: {
      reps,
      interval: daysBetween(today, dueDay),
      ease,
      due: studyDayStart(dueDay),
      lapses,
      last: now,
    },
    requeueAfterMs,
  };
}
