/** Plain-English formatting for the study screens: intervals, waits, due times and recency. */
import { addDays, daysBetween, studyDay } from '../../lib/time';

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A review interval in whole days: "1 day", "6 days", "2 months", "1.5 years". */
export function formatInterval(days: number): string {
  const d = Math.max(1, Math.round(days));
  if (d < 45) return plural(d, 'day');
  if (d < 365) return plural(Math.round(d / 30), 'month');
  const years = Math.round((d / 365) * 10) / 10;
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

/** A short wait: "less than a minute", "1 minute", "10 minutes". */
export function formatWait(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  if (ms <= 0) return 'no time';
  if (ms < 60_000) return 'less than a minute';
  return plural(minutes, 'minute');
}

/** A countdown clock, "23:41" (minutes and seconds, rounded up to the next second). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** The same countdown in words, for screen readers: "23 minutes 41 seconds". */
export function formatClockWords(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return plural(s, 'second');
  return s === 0 ? plural(m, 'minute') : `${plural(m, 'minute')} ${plural(s, 'second')}`;
}

/** When a KK was last practised, by study day: "Never", "Today", "Yesterday", "3 days ago". */
export function lastPractised(last: number | null | undefined, now: number, seen = false): string {
  if (!last) return seen ? 'Some time ago' : 'Never';
  const days = daysBetween(studyDay(last), studyDay(now));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

const weekday = new Intl.DateTimeFormat('en-AU', { weekday: 'long' });
const longDate = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
const clock = new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit' });

/** "6:30 pm" (ICU versions differ on spacing and case, so normalise both). */
export function timeOfDay(ts: number): string {
  return clock
    .format(new Date(ts))
    .replace(/[\u202f\u00a0]/g, ' ')
    .replace(/\s?([ap])\.?m\.?$/i, ' $1m')
    .toLowerCase();
}

/**
 * When something falls due, relative to now: "now", "in 10 minutes", "later today at 6:30 pm",
 * "tomorrow", "on Saturday" (within a week) or "on Friday 9 October".
 */
export function describeDue(ts: number, now: number): string {
  if (ts <= now) return 'now';
  if (ts - now < 60 * 60_000) return `in ${formatWait(ts - now)}`;
  const today = studyDay(now);
  const day = studyDay(ts);
  if (day === today) return `later today at ${timeOfDay(ts)}`;
  if (day === addDays(today, 1)) return 'tomorrow';
  const ahead = daysBetween(today, day);
  const date = new Date(ts);
  if (ahead < 7) return `on ${weekday.format(date)}`;
  return `on ${longDate.format(date).replace(',', '')}`;
}
