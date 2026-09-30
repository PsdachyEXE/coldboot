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
 */
import type { SrsCardState } from '../state/srs';

export type Rating = 1 | 2 | 3 | 4;
export const RATING_LABELS: Record<Rating, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
export const RATING_QUALITY: Record<Rating, number> = { 1: 1, 2: 3, 3: 4, 4: 5 };
/** Mastery score per rating (Section 6.13). */
export const RATING_SCORE: Record<Rating, number> = { 1: 0, 2: 0.5, 3: 0.8, 4: 1 };
export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const REQUEUE_MS = 10 * 60_000;

export interface ScheduleResult {
  next: SrsCardState;
  /** Set when the card should come back later in the same session (quality below 3). */
  requeueAfterMs: number | null;
}

export interface ScheduleOptions {
  /** Exam start instant, epoch ms. */
  examAt: number;
}

export function schedule(_prev: SrsCardState | undefined, _rating: Rating, _now: number, _opts: ScheduleOptions): ScheduleResult {
  throw new Error('schedule: implemented in Phase 1 track E');
}
