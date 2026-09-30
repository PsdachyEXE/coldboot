import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_EXAM_AT } from '../lib/time';
import { mergeSession, salvageSession, streak, useSession, type DayActivity } from './session';
import { clampNewCardLimit, cleanName, examAtMs, salvageSettings, useSettings } from './settings';
import { countDue, newCardsRemaining } from './srs';
import { removeAllKeys, useStorageHealth, warnStorage } from './storage';

const act = (n: number): DayActivity => ({ n, s: n, reviews: 0, ms: 0, areas: {} });

describe('settings store', () => {
  afterEach(() => useSettings.getState().reset());

  it('cleans names for the terminal prompt and caps them at 24 characters', () => {
    expect(cleanName('  Lachie\u0007 ')).toBe('Lachie');
    expect(cleanName('a'.repeat(40))).toHaveLength(24);
    expect(cleanName('‮​')).toBe('');
  });

  it('clamps the new-card limit to 1 to 200', () => {
    expect(clampNewCardLimit(0)).toBe(1);
    expect(clampNewCardLimit(500)).toBe(200);
    expect(clampNewCardLimit(24.6)).toBe(25);
    expect(clampNewCardLimit(Number.NaN)).toBe(25);
  });

  it('completes onboarding with clean values and falls back to the default exam instant', () => {
    useSettings.getState().completeOnboarding({ name: ' Sam ', examAt: 'not a date', newCardLimit: 999 });
    const s = useSettings.getState();
    expect(s).toMatchObject({ name: 'Sam', examAt: DEFAULT_EXAM_AT, newCardLimit: 200, onboarded: true });
  });

  it('refuses an invalid exam instant', () => {
    expect(useSettings.getState().setExamAt('2026-11-13 15:00')).toBe(false);
    expect(useSettings.getState().setExamAt('2026-11-20T09:30:00+11:00')).toBe(true);
    expect(examAtMs(useSettings.getState())).toBe(Date.parse('2026-11-20T09:30:00+11:00'));
  });

  it('salvages each valid field of damaged settings', () => {
    const r = salvageSettings({ name: 'Lachie', examAt: 42, newCardLimit: 30, sound: 'yes', motion: 'reduce', onboarded: true, createdAt: 5 });
    expect(r?.data).toMatchObject({ name: 'Lachie', examAt: DEFAULT_EXAM_AT, newCardLimit: 30, sound: false, motion: 'reduce', onboarded: true });
    expect(r?.dropped).toBe(2);
    expect(salvageSettings('nope')).toBeUndefined();
  });
});

describe('session store', () => {
  afterEach(() => useSession.getState().reset());

  it('counts a streak ending today, or yesterday while today is empty', () => {
    const activity = { '2026-09-28': act(2), '2026-09-29': act(1), '2026-09-30': act(4) };
    expect(streak(activity, '2026-09-30')).toBe(3);
    expect(streak(activity, '2026-10-01')).toBe(3);
    expect(streak(activity, '2026-10-02')).toBe(0);
    expect(streak({}, '2026-09-30')).toBe(0);
  });

  it('records the boot day only for valid day strings', () => {
    useSession.getState().setLastBootDay('2026-09-30');
    useSession.getState().setLastBootDay('yesterday');
    expect(useSession.getState().lastBootDay).toBe('2026-09-30');
  });

  it('merges another window by keeping the day with more progress and the later boot day', () => {
    const local = { terminalHistory: ['help'], daily: {}, activity: { '2026-09-30': act(5) }, lastBootDay: '2026-09-29' };
    const incoming = { terminalHistory: [], daily: {}, activity: { '2026-09-30': act(2), '2026-09-29': act(1) }, lastBootDay: '2026-09-30' };
    const merged = mergeSession(local, incoming);
    expect(merged.activity['2026-09-30'].n).toBe(5);
    expect(merged.activity['2026-09-29'].n).toBe(1);
    expect(merged.lastBootDay).toBe('2026-09-30');
  });

  it('salvages valid history and days from damaged session data', () => {
    const r = salvageSession({ terminalHistory: ['help', 42, ''], activity: { '2026-09-30': act(1), bad: act(1) }, lastBootDay: 7 });
    expect(r?.data.terminalHistory).toEqual(['help']);
    expect(Object.keys(r?.data.activity ?? {})).toEqual(['2026-09-30']);
    expect(r?.data.lastBootDay).toBeNull();
  });
});

describe('srs helpers', () => {
  const card = (due: number) => ({ reps: 1, interval: 1, ease: 2.5, due, lapses: 0, last: 0 });

  it('counts due cards, ignoring cards no longer in the content', () => {
    const cards = { 'c-a': card(10), 'c-b': card(20), 'c-gone': card(5) };
    expect(countDue(cards, 15)).toBe(2);
    expect(countDue(cards, 25, new Set(['c-a', 'c-b']))).toBe(2);
  });

  it('counts new cards remaining under the daily limit', () => {
    expect(newCardsRemaining({ cards: {}, introduced: { day: '2026-09-30', count: 10 } }, '2026-09-30', 25)).toBe(15);
    expect(newCardsRemaining({ cards: {}, introduced: { day: '2026-09-29', count: 30 } }, '2026-09-30', 25)).toBe(25);
  });
});

describe('storage', () => {
  afterEach(() => useStorageHealth.setState({ ok: true, reason: null, messages: [] }));

  it('deduplicates warnings and keeps every distinct one', () => {
    warnStorage('Storage is full.');
    warnStorage('Storage is full.');
    warnStorage('Records were set aside.');
    expect(useStorageHealth.getState()).toMatchObject({ ok: false, reason: 'Records were set aside.', messages: ['Storage is full.', 'Records were set aside.'] });
  });

  it('removes only COLDBOOT keys on reset', () => {
    localStorage.setItem('coldboot:v1:settings', '{}');
    localStorage.setItem('other-site:key', 'keep');
    removeAllKeys();
    expect(localStorage.getItem('coldboot:v1:settings')).toBeNull();
    expect(localStorage.getItem('other-site:key')).toBe('keep');
  });
});
