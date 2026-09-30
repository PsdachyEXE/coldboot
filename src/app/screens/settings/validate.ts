/**
 * Validation for the first-run and Settings forms. Messages say what happened and how to fix it.
 */
import { MELBOURNE_TZ, formatInstant, melbourneWallTimeToIso, parseInstant } from '../../../lib/time';
import { NEW_CARD_LIMIT_MAX, cleanName } from '../../../state/settings';

export interface StudyForm {
  name: string;
  examDay: string;
  examTime: string;
  newCardLimit: string;
}

export interface StudyValues {
  name: string;
  examAt: string;
  newCardLimit: number;
}

export type StudyErrors = Partial<Record<keyof StudyForm | 'exam', string>>;

export const MESSAGES = {
  nameEmpty: 'Enter a display name. It appears in the terminal prompt.',
  dayEmpty: 'Enter the date of your exam.',
  timeEmpty: 'Enter the time your exam starts, including reading time.',
  examInvalid: 'Enter a real date and time, for example 13/11/2026 and 3:00 pm.',
  examPast: 'That time has already passed. Enter when your exam starts.',
  limit: `Enter a whole number from 1 to ${NEW_CARD_LIMIT_MAX}.`,
} as const;

/**
 * Checks the form. `now` rejects exam times in the past; pass `allowPastExamAt` (the stored value)
 * so an unchanged exam time that has since passed doesn't block saving other changes.
 */
export function validateStudyForm(
  form: StudyForm,
  now: number,
  allowPastExamAt?: string,
): { ok: true; values: StudyValues } | { ok: false; errors: StudyErrors } {
  const errors: StudyErrors = {};
  const name = cleanName(form.name);
  if (!name) errors.name = MESSAGES.nameEmpty;

  let examAt: string | null = null;
  if (!form.examDay) errors.examDay = MESSAGES.dayEmpty;
  if (!form.examTime) errors.examTime = MESSAGES.timeEmpty;
  if (form.examDay && form.examTime) {
    examAt = melbourneWallTimeToIso(form.examDay, form.examTime);
    const ts = examAt ? parseInstant(examAt) : Number.NaN;
    if (!examAt || !Number.isFinite(ts)) errors.exam = MESSAGES.examInvalid;
    else if (ts <= now && examAt !== allowPastExamAt) errors.exam = MESSAGES.examPast;
  }

  const limitText = form.newCardLimit.trim();
  const limit = Number(limitText);
  if (!/^\d+$/.test(limitText) || !Number.isInteger(limit) || limit < 1 || limit > NEW_CARD_LIMIT_MAX) errors.newCardLimit = MESSAGES.limit;

  if (Object.keys(errors).length || !examAt) return { ok: false, errors };
  return { ok: true, values: { name, examAt, newCardLimit: limit } };
}

function wallClock(ts: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(ts));
}

/** The device's own time zone, or Melbourne when it can't be read. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || MELBOURNE_TZ;
  } catch {
    return MELBOURNE_TZ;
  }
}

/**
 * The exam time on this device's clock, e.g. "Friday 13 November 2026 at 4:00 am GMT", or null when
 * the device shows the same wall-clock time as Melbourne (no need to repeat it).
 */
export function deviceEquivalent(iso: string, timeZone = deviceTimeZone()): string | null {
  const ts = parseInstant(iso);
  if (!Number.isFinite(ts)) return null;
  try {
    if (wallClock(ts, timeZone) === wallClock(ts, MELBOURNE_TZ)) return null;
    return formatInstant(ts, timeZone);
  } catch {
    return null;
  }
}

/** Terminal prompt preview for a display name (the terminal uses the same form). */
export function promptPreview(name: string): string {
  return `${cleanName(name) || 'you'}@coldboot:~$`;
}
