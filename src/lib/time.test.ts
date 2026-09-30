import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_EXAM_AT,
  addDays,
  countdown,
  daysBetween,
  examPhase,
  formatCountdown,
  melbourneDate,
  parseInstant,
  studyDay,
  studyDayStart,
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
