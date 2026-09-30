import { describe, expect, it } from 'vitest';
import { parseInstant } from '../../../lib/time';
import { MESSAGES, deviceEquivalent, promptPreview, validateStudyForm } from './validate';

const NOW = parseInstant('2026-09-30T10:00:00+10:00');
const good = { name: 'Lachie', examDay: '2026-11-13', examTime: '15:00', newCardLimit: '25' };

describe('validateStudyForm', () => {
  it('turns a Melbourne wall-clock time into an ISO instant with the right offset', () => {
    const r = validateStudyForm(good, NOW);
    expect(r).toEqual({ ok: true, values: { name: 'Lachie', examAt: '2026-11-13T15:00:00+11:00', newCardLimit: 25 } });
  });

  it('uses AEST before daylight saving starts', () => {
    const r = validateStudyForm({ ...good, examDay: '2026-10-02', examTime: '09:30' }, NOW);
    expect(r.ok && r.values.examAt).toBe('2026-10-02T09:30:00+10:00');
  });

  it('asks for a name, a date, a time and a whole number in range', () => {
    const r = validateStudyForm({ name: '  ​ ', examDay: '', examTime: '', newCardLimit: '0' }, NOW);
    expect(r).toEqual({
      ok: false,
      errors: { name: MESSAGES.nameEmpty, examDay: MESSAGES.dayEmpty, examTime: MESSAGES.timeEmpty, newCardLimit: MESSAGES.limit },
    });
    for (const bad of ['201', '2.5', '', 'ten', '-3']) {
      const res = validateStudyForm({ ...good, newCardLimit: bad }, NOW);
      expect(res.ok ? null : res.errors.newCardLimit).toBe(MESSAGES.limit);
    }
    for (const ok of ['1', '200', ' 25 ']) expect(validateStudyForm({ ...good, newCardLimit: ok }, NOW).ok).toBe(true);
  });

  it('rejects an exam time that has passed, unless it is the one already saved', () => {
    const past = { ...good, examDay: '2026-09-01' };
    const r = validateStudyForm(past, NOW);
    expect(r.ok ? null : r.errors.exam).toBe(MESSAGES.examPast);
    expect(validateStudyForm(past, NOW, '2026-09-01T15:00:00+10:00').ok).toBe(true);
  });

  it('rejects malformed dates', () => {
    const r = validateStudyForm({ ...good, examDay: '2026-13-40' }, NOW);
    expect(r.ok ? null : r.errors.exam).toBe(MESSAGES.examInvalid);
  });

  it('keeps names terminal-safe', () => {
    const r = validateStudyForm({ ...good, name: ' Lach‮ie ' }, NOW);
    expect(r.ok && r.values.name).toBe('Lachie');
  });
});

describe('deviceEquivalent', () => {
  it('shows the exam on the device clock when its time zone differs', () => {
    expect(deviceEquivalent('2026-11-13T15:00:00+11:00', 'Europe/London')).toBe('Friday 13 November 2026 at 4:00 am GMT');
  });

  it('says nothing when the device keeps Melbourne time', () => {
    expect(deviceEquivalent('2026-11-13T15:00:00+11:00', 'Australia/Melbourne')).toBeNull();
    expect(deviceEquivalent('2026-11-13T15:00:00+11:00', 'Australia/Sydney')).toBeNull();
  });

  it('shows Brisbane its own hour, since Queensland has no daylight saving', () => {
    expect(deviceEquivalent('2026-11-13T15:00:00+11:00', 'Australia/Brisbane')).toBe('Friday 13 November 2026 at 2:00 pm AEST');
  });
});

describe('promptPreview', () => {
  it('previews the terminal prompt', () => {
    expect(promptPreview('Lachie')).toBe('Lachie@coldboot:~$');
    expect(promptPreview('')).toBe('you@coldboot:~$');
  });
});
