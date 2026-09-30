/** Wording for the review rating buttons. */
import { RATINGS, RATING_LABELS, type CapReason, type ScheduleResult } from '../../srs/sm2';
import { describeDue } from './format';

const CAP_TEXT: Record<CapReason, string> = {
  exam: 'Reviews stop 2 days before the exam',
  'final-week': 'In the final week before the exam, cards come back within 2 days',
};

/** "Hard, Good and Easy". */
function listNames(names: readonly string[]): string {
  return names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Why some ratings come back sooner than SM-2 alone would schedule, or null when no cap applies:
 * "Reviews stop 2 days before the exam, so Hard, Good and Easy all bring this card back on
 * Wednesday 11 November."
 */
export function capNote(previews: readonly ScheduleResult[], now: number): string | null {
  const capped = RATINGS.map((r, i) => ({ name: RATING_LABELS[r], res: previews[i] })).filter((p) => p.res.capped !== null);
  if (!capped.length) return null;
  const reason = capped.some((p) => p.res.capped === 'exam') ? 'exam' : 'final-week';
  const names = listNames(capped.map((p) => p.name));
  const days = new Set(capped.map((p) => p.res.next.due));
  if (days.size === 1) {
    const when = describeDue(capped[0].res.next.due, now);
    return capped.length === 1
      ? `${CAP_TEXT[reason]}, so ${names} brings this card back ${when}, sooner than it otherwise would.`
      : `${CAP_TEXT[reason]}, so ${names} all bring this card back ${when}.`;
  }
  return `${CAP_TEXT[reason]}, so ${names} bring this card back sooner than they otherwise would.`;
}

