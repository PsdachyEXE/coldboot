/** The status bar's segments as plain data, so their wording is testable without rendering. */
import { countdown, examPhase, formatCountdown } from '../lib/time';

export type SegmentId = 'countdown' | 'due' | 'streak' | 'offline' | 'storage';

export interface StatusSegment {
  id: SegmentId;
  /** What the bar prints inside the brackets, e.g. "T-44d 04h". */
  text: string;
  /** What screen readers hear instead, e.g. "44 days and 4 hours until the exam". */
  label: string;
}

export interface StatusInput {
  now: number;
  /** Exam start, epoch ms. */
  examAt: number;
  due: number;
  streak: number;
  offlineReady: boolean;
  storageOk: boolean;
  /** Below 720 px only the countdown and the due count show. */
  narrow: boolean;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The countdown segment: `T-44d 04h`, then `exam underway` for 2 h 15 min, then `exam finished`. */
export function countdownSegment(now: number, examAt: number): StatusSegment {
  const phase = examPhase(now, examAt);
  if (phase === 'reading' || phase === 'writing') {
    return { id: 'countdown', text: 'exam underway', label: 'The exam is underway' };
  }
  if (phase === 'finished') {
    return { id: 'countdown', text: 'exam finished', label: 'The exam has finished' };
  }
  const c = countdown(now, examAt);
  let label: string;
  if (c.days > 0) label = `${plural(c.days, 'day', 'days')} and ${plural(c.hours, 'hour', 'hours')} until the exam`;
  else if (c.hours > 0) label = `${plural(c.hours, 'hour', 'hours')} until the exam`;
  else label = 'Less than an hour until the exam';
  return { id: 'countdown', text: formatCountdown(c), label };
}

export function statusSegments(input: StatusInput): StatusSegment[] {
  const due = Math.max(0, Math.floor(input.due));
  const segments: StatusSegment[] = [
    countdownSegment(input.now, input.examAt),
    { id: 'due', text: `${due} due`, label: due === 0 ? 'No reviews due' : `${plural(due, 'review', 'reviews')} due` },
  ];
  if (input.narrow) return segments;
  const streak = Math.max(0, Math.floor(input.streak));
  segments.push({ id: 'streak', text: `streak ${streak}`, label: `Study streak: ${plural(streak, 'day', 'days')}` });
  if (input.offlineReady) segments.push({ id: 'offline', text: 'offline ready', label: 'Ready to work offline' });
  if (!input.storageOk) segments.push({ id: 'storage', text: 'not saving', label: 'Progress is not being saved' });
  return segments;
}
