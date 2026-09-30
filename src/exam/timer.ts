/**
 * The exam timer as a pure state machine. Nothing here ticks or stores anything: the phase is
 * derived from two absolute timestamps (when the paper started and when it was submitted) and the
 * current time. That is what lets a paper survive a reload, a closed tab or a sleeping laptop:
 * reopening it simply derives the phase again.
 *
 *   idle --start--> reading --(reading time ends)--> writing --(submit, or writing time ends)--> submitted
 *
 * There is no pause. Submitting is only possible during writing time; when writing time runs out
 * the derived phase is `submitted` with `expired` set, and the host stores the automatic submission
 * (stamped at the end of writing time, not at the moment the tab noticed).
 */
import { EXAM_READING_MS, EXAM_WRITING_MS } from '../lib/time';

export type TimerPhase = 'idle' | 'reading' | 'writing' | 'submitted';

export interface TimerConfig {
  readingMs: number;
  writingMs: number;
}

export interface TimerStamps {
  /** Epoch ms when reading time began, or null before the paper starts. */
  startedAt: number | null;
  /** Epoch ms when the paper was submitted, or null while it is being sat. */
  submittedAt: number | null;
}

export interface TimerState {
  phase: TimerPhase;
  /** Time left in the current phase (reading or writing); 0 when idle or submitted. */
  phaseLeft: number;
  /** Writing time left: the whole of it during reading, 0 when idle or submitted. */
  writingLeft: number;
  readingEndsAt: number | null;
  writingEndsAt: number | null;
  /** Writing time has run out and no submission is stored yet: the host must store one now. */
  expired: boolean;
  /** When the paper was (or, if expired, is taken to have been) submitted. */
  submittedAt: number | null;
  /** Time used from the start of reading to submission (or to now while sitting). */
  usedMs: number;
}

/** Section 5: 15 minutes reading, then 2 hours writing. */
export const FULL_TIMING: TimerConfig = { readingMs: EXAM_READING_MS, writingMs: EXAM_WRITING_MS };

/**
 * Mini paper: 30 minutes in all, with reading time scaled from the full paper (15 of 135 minutes
 * is a ninth, so a ninth of 30 is about 3 minutes). See the track report.
 */
export const MINI_TIMING: TimerConfig = { readingMs: 3 * 60_000, writingMs: 27 * 60_000 };

/** Spoken and visible warnings, in minutes of writing time left. */
export const WARNING_MINUTES = [30, 10, 5, 1] as const;

export function totalMs(config: TimerConfig): number {
  return config.readingMs + config.writingMs;
}

/** Derives the timer's state. Pure: the same stamps, config and time always give the same state. */
export function timerState(stamps: TimerStamps, config: TimerConfig, now: number): TimerState {
  const { startedAt } = stamps;
  if (startedAt === null) {
    return { phase: 'idle', phaseLeft: 0, writingLeft: 0, readingEndsAt: null, writingEndsAt: null, expired: false, submittedAt: null, usedMs: 0 };
  }
  const readingEndsAt = startedAt + config.readingMs;
  const writingEndsAt = readingEndsAt + config.writingMs;
  const base = { readingEndsAt, writingEndsAt };
  if (stamps.submittedAt !== null) {
    const submittedAt = Math.min(Math.max(stamps.submittedAt, startedAt), writingEndsAt);
    return { ...base, phase: 'submitted', phaseLeft: 0, writingLeft: 0, expired: false, submittedAt, usedMs: submittedAt - startedAt };
  }
  // A clock that has gone backwards (the device's time was changed) counts as the start of reading.
  const t = Math.max(now, startedAt);
  if (t < readingEndsAt) {
    return { ...base, phase: 'reading', phaseLeft: readingEndsAt - t, writingLeft: config.writingMs, expired: false, submittedAt: null, usedMs: t - startedAt };
  }
  if (t < writingEndsAt) {
    return { ...base, phase: 'writing', phaseLeft: writingEndsAt - t, writingLeft: writingEndsAt - t, expired: false, submittedAt: null, usedMs: t - startedAt };
  }
  return { ...base, phase: 'submitted', phaseLeft: 0, writingLeft: 0, expired: true, submittedAt: writingEndsAt, usedMs: writingEndsAt - startedAt };
}

/** Starts a paper: reading time begins now. */
export function startTimer(now: number): TimerStamps {
  return { startedAt: now, submittedAt: null };
}

/**
 * Submits a paper. Allowed during writing time, and after it has run out (stamped at the end of
 * writing time). Idle, reading and already-submitted papers are returned unchanged.
 */
export function submitTimer(stamps: TimerStamps, config: TimerConfig, now: number): TimerStamps {
  const state = timerState(stamps, config, now);
  if (state.phase === 'writing') return { ...stamps, submittedAt: Math.max(now, stamps.startedAt ?? now) };
  if (state.expired) return { ...stamps, submittedAt: state.submittedAt };
  return stamps;
}

/** The warnings that apply to this much writing time (a 27-minute paper has no 30-minute warning). */
export function applicableWarnings(config: TimerConfig): number[] {
  return WARNING_MINUTES.filter((m) => m * 60_000 < config.writingMs);
}

/**
 * The warning to show: the smallest mark whose time has been reached during writing, e.g. 10 when
 * 9 minutes 40 seconds are left. Null outside writing time or before the first mark.
 */
export function activeWarning(state: TimerState, config: TimerConfig): number | null {
  if (state.phase !== 'writing') return null;
  const reached = applicableWarnings(config).filter((m) => state.writingLeft <= m * 60_000);
  return reached.length ? Math.min(...reached) : null;
}

export interface WarningDue {
  /** Every mark now reached that hadn't been warned about: store these so no warning repeats. */
  marks: number[];
  /** The one to announce (the most urgent of them), or null. */
  announce: number | null;
  /** True when the announced mark was reached a while ago (the tab was asleep or reloaded). */
  late: boolean;
}

/** Which warnings are due, given the marks already warned about. */
export function warningsDue(state: TimerState, config: TimerConfig, warned: readonly number[]): WarningDue {
  if (state.phase !== 'writing') return { marks: [], announce: null, late: false };
  const marks = applicableWarnings(config).filter((m) => state.writingLeft <= m * 60_000 && !warned.includes(m));
  if (!marks.length) return { marks, announce: null, late: false };
  const announce = Math.min(...marks);
  return { marks, announce, late: state.writingLeft <= (announce - 1) * 60_000 };
}

/** "10 minutes of writing time left." or, when reached a while ago, "Less than 10 minutes of writing time left." */
export function warningText(minutes: number, late = true): string {
  const amount = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  return late ? `Less than ${amount} of writing time left.` : `${amount.charAt(0).toUpperCase()}${amount.slice(1)} of writing time left.`;
}

/** "2:00:00" or "14:59" for a countdown, rounded up to the next second. */
export function formatTimer(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** The same in words for screen readers: "1 hour 59 minutes", "14 minutes 59 seconds", "40 seconds". */
export function formatTimerWords(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const unit = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
  if (h > 0) return m ? `${unit(h, 'hour')} ${unit(m, 'minute')}` : unit(h, 'hour');
  if (m > 0) return s ? `${unit(m, 'minute')} ${unit(s, 'second')}` : unit(m, 'minute');
  return unit(s, 'second');
}

/** A duration in words for reports, to the minute: "1 hour 52 minutes", "27 minutes", "less than a minute". */
export function formatDuration(ms: number): string {
  const minutes = Math.round(Math.max(0, ms) / 60_000);
  if (minutes === 0) return 'less than a minute';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const unit = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
  if (h === 0) return unit(m, 'minute');
  return m ? `${unit(h, 'hour')} ${unit(m, 'minute')}` : unit(h, 'hour');
}
