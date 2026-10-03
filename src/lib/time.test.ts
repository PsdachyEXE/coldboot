import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_EXAM_AT,
  addDays,
  countdown,
  daysBetween,
  examDayState,
  examPhase,
  formatCountdown,
  formatMelbourneClock,
  formatTimeLeft,
  formatTimeLeftShort,
  isExamDay,
  localDate,
  melbourneDate,
  parseInstant,
  studyDay,
  studyDayStart,
  melbourneWallTimeToIso,
  toMelbourneWallTime,
  melbourneOffsetMinutes,
} from './time';

const EXAM = parseInstant(DEFAULT_EXAM_AT);

describe('time', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('targets the absolute exam instant 2026-11-13T15:00:00+11:00', () => {
    expect(new Date(EXAM).toISOString()).toBe('2026-11-13T04:00:00.000Z');
  });

  it('counts down independently of the device timezone', () => {
    const now = Date.parse('2026-09-22T00:00:00Z');
    const c = countdown(now, EXAM);
    expect(c.past).toBe(false);
    expect(c.days).toBe(52);
    expect(c.hours).toBe(4);
    expect(formatCountdown(c)).toBe('T-52d 04h');
    expect(countdown(EXAM + 1, EXAM).past).toBe(true);
  });

  it('reports exam phases around the start instant', () => {
    expect(examPhase(EXAM - 1, EXAM)).toBe('before');
    expect(examPhase(EXAM, EXAM)).toBe('reading');
    expect(examPhase(EXAM + 15 * 60_000, EXAM)).toBe('writing');
    expect(examPhase(EXAM + 135 * 60_000, EXAM)).toBe('finished');
  });

  it('rolls the study day over at 4 am local time', () => {
    const lateNight = new Date(2026, 9, 2, 1, 30).getTime(); // 1:30 am on 2 Oct, local
    const morning = new Date(2026, 9, 2, 4, 0).getTime();
    expect(studyDay(lateNight)).toBe('2026-10-01');
    expect(studyDay(morning)).toBe('2026-10-02');
    expect(studyDayStart('2026-10-02')).toBe(morning);
  });

  it('gives the local calendar date with no rollover', () => {
    expect(localDate(new Date(2026, 9, 2, 1, 30).getTime())).toBe('2026-10-02');
    expect(localDate(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });

  it('does day arithmetic across month ends and DST changes', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-10-04', -1)).toBe('2026-10-03');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-10-01', '2026-11-13')).toBe(43);
    expect(daysBetween('2026-11-13', '2026-10-01')).toBe(-43);
  });

  it('computes the Melbourne calendar date for any instant', () => {
    // 2026-10-01T14:30Z is 00:30 on 2 October in Melbourne (AEST, UTC+10, before DST starts on 4 Oct).
    expect(melbourneDate(Date.parse('2026-10-01T14:30:00Z'))).toBe('2026-10-02');
    expect(melbourneDate(Date.parse('2026-10-01T13:30:00Z'))).toBe('2026-10-01');
    // After DST starts (AEDT, UTC+11): 2026-11-12T13:30Z is 00:30 on 13 November.
    expect(melbourneDate(Date.parse('2026-11-12T13:30:00Z'))).toBe('2026-11-13');
  });

  it('rejects instants without an explicit offset', () => {
    expect(Number.isNaN(parseInstant('2026-11-13T15:00:00'))).toBe(true);
    expect(Number.isNaN(parseInstant('not a date'))).toBe(true);
    expect(parseInstant('2026-11-13T15:00+11:00')).toBe(EXAM);
  });
});

describe('time in Melbourne across daylight saving', () => {
  it('runs these tests in Australia/Melbourne', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Australia/Melbourne');
  });

  it('keeps the rollover at 4 am wall-clock on the day DST starts and ends', () => {
    for (const day of ['2026-10-03', '2026-10-04', '2026-10-05', '2027-04-03', '2027-04-04', '2027-04-05']) {
      expect(studyDay(studyDayStart(day))).toBe(day);
      expect(studyDay(studyDayStart(day) - 1)).toBe(addDays(day, -1));
    }
    // 4:30 am on 4 Oct 2026 (AEDT, just after the clocks went forward at 2 am) is already 4 Oct.
    expect(studyDay(new Date(2026, 9, 4, 4, 30).getTime())).toBe('2026-10-04');
  });

  it('converts Melbourne wall-clock times to ISO instants with the right offset', () => {
    expect(melbourneWallTimeToIso('2026-11-13', '15:00')).toBe('2026-11-13T15:00:00+11:00');
    expect(melbourneWallTimeToIso('2026-07-01', '09:30')).toBe('2026-07-01T09:30:00+10:00');
    expect(melbourneWallTimeToIso('2026-10-03', '23:00')).toBe('2026-10-03T23:00:00+10:00');
    expect(melbourneWallTimeToIso('2026-10-04', '12:00')).toBe('2026-10-04T12:00:00+11:00');
    expect(melbourneWallTimeToIso('2026-13-01', '12:00')).toBeNull();
    expect(melbourneWallTimeToIso('2026-11-13', '3pm')).toBeNull();
    expect(toMelbourneWallTime(DEFAULT_EXAM_AT)).toEqual({ day: '2026-11-13', time: '15:00' });
    expect(toMelbourneWallTime('2026-11-13T04:00:00Z')).toEqual({ day: '2026-11-13', time: '15:00' });
    expect(melbourneOffsetMinutes(EXAM)).toBe(660);
  });
});

describe('exam day', () => {
  const t = (iso: string) => parseInstant(iso);

  it('is the exam date in Melbourne, from midnight until the start', () => {
    expect(isExamDay(t('2026-11-12T23:59:59+11:00'), EXAM)).toBe(false);
    expect(isExamDay(t('2026-11-13T00:00:00+11:00'), EXAM)).toBe(true);
    expect(isExamDay(t('2026-11-13T14:59:59+11:00'), EXAM)).toBe(true);
    expect(isExamDay(t('2026-11-13T15:00:00+11:00'), EXAM)).toBe(false);
    // Midnight in Melbourne is still the 12th in UTC; the device's zone doesn't matter.
    expect(isExamDay(t('2026-11-12T13:00:00Z'), EXAM)).toBe(true);
  });

  it('moves from study to exam day, underway and over at each boundary', () => {
    const cases: [string, string][] = [
      ['2026-11-12T23:59:59+11:00', 'study'],
      ['2026-11-13T00:00:00+11:00', 'exam-day'],
      ['2026-11-13T14:59:59.999+11:00', 'exam-day'],
      ['2026-11-13T15:00:00+11:00', 'underway'],
      ['2026-11-13T15:15:00+11:00', 'underway'],
      ['2026-11-13T17:14:59.999+11:00', 'underway'],
      ['2026-11-13T17:15:00+11:00', 'over'],
      ['2027-01-01T00:00:00+11:00', 'over'],
    ];
    for (const [iso, state] of cases) expect(examDayState(t(iso), EXAM), iso).toBe(state);
  });

  it('formats Melbourne clock times and the time left', () => {
    expect(formatMelbourneClock(EXAM)).toBe('3:00 pm');
    expect(formatMelbourneClock(t('2026-11-13T17:15:00+11:00'))).toBe('5:15 pm');
    expect(formatMelbourneClock(t('2026-11-13T09:05:00+11:00'))).toBe('9:05 am');
    expect(formatTimeLeft(t('2026-11-13T00:00:00+11:00'), EXAM)).toBe('15 hours');
    expect(formatTimeLeft(t('2026-11-13T10:48:00+11:00'), EXAM)).toBe('4 hours and 12 minutes');
    expect(formatTimeLeft(t('2026-11-13T13:59:00+11:00'), EXAM)).toBe('1 hour and 1 minute');
    expect(formatTimeLeft(t('2026-11-13T14:15:00+11:00'), EXAM)).toBe('45 minutes');
    expect(formatTimeLeft(t('2026-11-13T14:59:30+11:00'), EXAM)).toBe('less than a minute');
    expect(formatTimeLeft(EXAM + 1, EXAM)).toBe('less than a minute');
  });

  it('gives the short form of the time left for the boot sequence, rounded down the same way', () => {
    expect(formatTimeLeftShort(t('2026-11-13T00:00:00+11:00'), EXAM)).toBe('15h 00m');
    expect(formatTimeLeftShort(t('2026-11-13T10:48:30+11:00'), EXAM)).toBe('4h 11m');
    expect(formatTimeLeftShort(t('2026-11-13T14:15:00+11:00'), EXAM)).toBe('45m');
    expect(formatTimeLeftShort(t('2026-11-13T14:59:00+11:00'), EXAM)).toBe('1m');
    expect(formatTimeLeftShort(t('2026-11-13T14:59:30+11:00'), EXAM)).toBe('under 1m');
    expect(formatTimeLeftShort(EXAM, EXAM)).toBe('under 1m');
  });
});
