/**
 * Time helpers. Two notions of "day" exist in COLDBOOT:
 *
 * - The **study day** is the device's local calendar date, rolled over at 4:00 am, so a late
 *   session after midnight still counts toward the previous day. SRS due dates, streaks and the
 *   daily new-card limit use it.
 * - The **Melbourne date** is the calendar date in Australia/Melbourne. The daily challenge seeds
 *   from it so every student gets the same set on the same day, wherever their device is.
 *
 * Day strings are always `YYYY-MM-DD`.
 */

export const DEFAULT_EXAM_AT = '2026-11-13T15:00:00+11:00';
export const EXAM_READING_MS = 15 * 60_000;
export const EXAM_WRITING_MS = 120 * 60_000;
export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;
export const STUDY_DAY_ROLLOVER_HOUR = 4;
/**
 * The latest instant a stored timestamp may hold: 1 January 3000 UTC. Every date the app shows
 * formats as a four-digit year up to here, and a stored date past it can only come from a damaged
 * or edited file. It sits well past the furthest real value, an SM-2 due date 36,500 days away.
 */
export const MAX_EPOCH_MS = Date.UTC(3000, 0, 1);

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

function isoDay(y: number, m: number, d: number): string {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

function parseDay(day: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) throw new Error(`Invalid day string: ${day}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** The device's local calendar date for an instant, with no rollover (e.g. for file names). */
export function localDate(ts: number): string {
  const d = new Date(ts);
  return isoDay(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Local study day for an instant: the local calendar date, or the previous date before 4:00 am
 * wall-clock time. Uses wall-clock hours, so the rollover stays at 4 am on daylight-saving days.
 */
export function studyDay(ts: number): string {
  const day = localDate(ts);
  return new Date(ts).getHours() < STUDY_DAY_ROLLOVER_HOUR ? addDays(day, -1) : day;
}

/** The instant a study day begins: 4:00 am local time on that date. */
export function studyDayStart(day: string): number {
  const [y, m, d] = parseDay(day);
  return new Date(y, m - 1, d, STUDY_DAY_ROLLOVER_HOUR, 0, 0, 0).getTime();
}

/** Calendar arithmetic on day strings (DST-safe: done in UTC). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = parseDay(day);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return isoDay(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Whole calendar days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = parseDay(a);
  const [yb, mb, db] = parseDay(b);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / DAY_MS);
}

export const MELBOURNE_TZ = 'Australia/Melbourne';

const melbourneFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Melbourne',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar date in Australia/Melbourne for an instant. */
export function melbourneDate(ts: number): string {
  const parts = melbourneFormatter.formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return isoDay(get('year'), get('month'), get('day'));
}

const melbourneWallFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Melbourne',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** Melbourne's UTC offset in minutes at an instant (600 for AEST, 660 for AEDT). */
export function melbourneOffsetMinutes(ts: number): number {
  const parts = melbourneWallFormatter.formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(ts / 1000) * 1000) / 60_000);
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * Converts a Melbourne wall-clock date and time (as picked in first run or Settings) into an ISO
 * instant with the correct AEST/AEDT offset, e.g. ('2026-11-13', '15:00') gives
 * '2026-11-13T15:00:00+11:00'. Returns null for malformed input.
 */
export function melbourneWallTimeToIso(day: string, hhmm: string): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const tm = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!dm || !tm) return null;
  const [y, m, d, h, mi] = [Number(dm[1]), Number(dm[2]), Number(dm[3]), Number(tm[1]), Number(tm[2])];
  if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const wallAsUtc = Date.UTC(y, m - 1, d, h, mi);
  let offset = melbourneOffsetMinutes(wallAsUtc - 600 * 60_000);
  const second = melbourneOffsetMinutes(wallAsUtc - offset * 60_000);
  if (second !== offset) offset = second;
  return `${day}T${pad(h)}:${pad(mi)}:00${formatOffset(offset)}`;
}

/** The Melbourne wall-clock date and time of an ISO instant, for prefilling date and time inputs. */
export function toMelbourneWallTime(iso: string): { day: string; time: string } | null {
  const ts = parseInstant(iso);
  if (!Number.isFinite(ts)) return null;
  const parts = melbourneWallFormatter.formatToParts(new Date(ts));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return { day: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

/** Parses an ISO 8601 instant with an explicit offset. Returns NaN when invalid. */
export function parseInstant(iso: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(iso)) return Number.NaN;
  return Date.parse(iso);
}

export interface Countdown {
  /** True once the exam's start instant has passed. */
  past: boolean;
  /** Milliseconds until the exam starts (0 once past). */
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Time remaining until an absolute instant. Timezone-independent by construction. */
export function countdown(now: number, examAt: number): Countdown {
  const totalMs = Math.max(0, examAt - now);
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    past: now >= examAt,
    totalMs,
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** Status-bar form: `T-52d 04h`. */
export function formatCountdown(c: Countdown): string {
  if (c.past) return 'T+0';
  return `T-${c.days}d ${pad(c.hours)}h`;
}

/** Exam phase relative to the absolute start instant (reading 15 min, writing 2 h). */
export type ExamPhase = 'before' | 'reading' | 'writing' | 'finished';

export function examPhase(now: number, examAt: number): ExamPhase {
  if (now < examAt) return 'before';
  if (now < examAt + EXAM_READING_MS) return 'reading';
  if (now < examAt + EXAM_READING_MS + EXAM_WRITING_MS) return 'writing';
  return 'finished';
}

/** "Friday 13 November 2026, 3:00 pm" in the given IANA zone (defaults to Melbourne). */
export function formatInstant(ts: number, timeZone = 'Australia/Melbourne'): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(ts));
}
