import { describe, expect, it } from 'vitest';
import type { KkId } from '../../content/schema';
import { mulberry32 } from '../../games/prng';
import type { KkMastery, MasteryMap } from '../../srs/mastery';
import { describeDue, formatClock, formatClockWords, formatInterval, formatWait, lastPractised, timeOfDay } from './format';
import {
  kksWithItems,
  pickMcqs,
  pickRunDrill,
  pickShorts,
  rankWeakest,
  roundRobin,
  scopeFromParams,
  scopeTitle,
  weakestKks,
} from './select';
import { fixtureIndex, fxMcq, fxShort } from './testing';

function mastery(entries: Record<string, number>): MasteryMap {
  return new Map(Object.entries(entries).map(([kk, value]): [KkId, KkMastery] => [kk as KkId, { value, n: 2, last: 1 }]));
}

function mcqs(kk: KkId, n: number) {
  const slug = kk.toLowerCase();
  return Array.from({ length: n }, (_, i) => fxMcq(`m-${slug}-00${i}`, [kk]));
}

const content = fixtureIndex({
  mcq: [...mcqs('U3O1-KK01', 3), ...mcqs('U3O1-KK02', 3), ...mcqs('U3O1-KK04', 4), ...mcqs('U3O2-KK01', 3), ...mcqs('U4O2-KK03', 5)],
  short: [fxShort('s-u3o1-kk04-001', ['U3O1-KK04']), fxShort('s-u4o1-kk02-001', ['U4O1-KK02'])],
});

describe('scopeFromParams', () => {
  it('reads kk, area and mode, and flags ids it does not know', () => {
    expect(scopeFromParams(new URLSearchParams('kk=U3O1-KK04'))).toEqual({ scope: { mode: 'kk', kk: 'U3O1-KK04' }, invalid: false });
    expect(scopeFromParams(new URLSearchParams('kk=TERMS')).scope).toEqual({ mode: 'kk', kk: 'TERMS' });
    expect(scopeFromParams(new URLSearchParams('area=U4O2')).scope).toEqual({ mode: 'area', area: 'U4O2' });
    expect(scopeFromParams(new URLSearchParams('mode=weak&timed=1')).scope).toEqual({ mode: 'weak' });
    expect(scopeFromParams(new URLSearchParams('mode=random')).scope).toEqual({ mode: 'random' });
    expect(scopeFromParams(new URLSearchParams('')).invalid).toBe(false);
    expect(scopeFromParams(new URLSearchParams('kk=U3O1-KK99'))).toEqual({ scope: null, invalid: true });
    expect(scopeFromParams(new URLSearchParams('area=U5O1'))).toEqual({ scope: null, invalid: true });
    expect(scopeFromParams(new URLSearchParams('mode=hard'))).toEqual({ scope: null, invalid: true });
  });

  it('titles each scope in words', () => {
    expect(scopeTitle({ mode: 'kk', kk: 'U3O1-KK04' })).toMatch(/^U3O1-KK04 /);
    expect(scopeTitle({ mode: 'area', area: 'U3O1' })).toMatch(/^U3O1 Software development/);
    expect(scopeTitle({ mode: 'weak' })).toBe('Your weakest key knowledge');
  });
});

describe('weakest KKs', () => {
  it('ranks seen KKs by mastery, then unseen KKs in study-design order', () => {
    const kks = kksWithItems(content, 'mcq');
    expect(kks).toEqual(['U3O1-KK01', 'U3O1-KK02', 'U3O1-KK04', 'U3O2-KK01', 'U4O2-KK03']);
    expect(rankWeakest(kks, mastery({ 'U4O2-KK03': 20, 'U3O1-KK04': 90 }))).toEqual([
      'U4O2-KK03',
      'U3O1-KK04',
      'U3O1-KK01',
      'U3O1-KK02',
      'U3O2-KK01',
    ]);
  });

  it('takes the lowest seen KKs and tops up with unseen ones when fewer than three are seen', () => {
    expect(weakestKks(content, 'mcq', mastery({ 'U4O2-KK03': 20, 'U3O1-KK04': 90 }), 10)).toEqual([
      'U4O2-KK03',
      'U3O1-KK04',
      'U3O1-KK01',
    ]);
    // Three seen: only seen KKs, lowest first; KK02 (3 questions) is added to reach 10.
    const m = mastery({ 'U3O1-KK01': 50, 'U3O1-KK02': 70, 'U3O2-KK01': 10, 'U3O1-KK04': 30 });
    expect(weakestKks(content, 'mcq', m, 10)).toEqual(['U3O2-KK01', 'U3O1-KK04', 'U3O1-KK01']);
    expect(weakestKks(content, 'mcq', m, 12)).toEqual(['U3O2-KK01', 'U3O1-KK04', 'U3O1-KK01', 'U3O1-KK02']);
  });

  it('draws a weakest round round-robin from those KKs, weakest first', () => {
    const picked = pickMcqs(content, { mode: 'weak' }, mastery({ 'U3O2-KK01': 10, 'U3O1-KK04': 30, 'U3O1-KK01': 50 }), mulberry32(1));
    expect(picked.items).toHaveLength(10);
    expect(picked.items.slice(0, 3).map((m) => m.kk[0])).toEqual(['U3O2-KK01', 'U3O1-KK04', 'U3O1-KK01']);
  });
});

describe('picking rounds', () => {
  it('picks one KK, one area (every KK represented) or a random set', () => {
    const rng = mulberry32(7);
    const kk = pickMcqs(content, { mode: 'kk', kk: 'U3O1-KK04' }, new Map(), rng);
    expect(kk.items.map((m) => m.kk[0])).toEqual(Array(4).fill('U3O1-KK04'));
    const area = pickMcqs(content, { mode: 'area', area: 'U3O1' }, new Map(), rng, 3);
    expect(new Set(area.items.map((m) => m.kk[0]))).toEqual(new Set(['U3O1-KK01', 'U3O1-KK02', 'U3O1-KK04']));
    const random = pickMcqs(content, { mode: 'random' }, new Map(), rng);
    expect(random.items).toHaveLength(10);
    expect(new Set(random.items.map((m) => m.id)).size).toBe(10);
  });

  it('is deterministic for a seed', () => {
    const a = pickMcqs(content, { mode: 'random' }, new Map(), mulberry32(42)).items.map((m) => m.id);
    const b = pickMcqs(content, { mode: 'random' }, new Map(), mulberry32(42)).items.map((m) => m.id);
    expect(a).toEqual(b);
  });

  it('builds the run drill from the weakest KK first, topped up to 10', () => {
    const picked = pickRunDrill(content, mastery({ 'U4O2-KK03': 12, 'U3O1-KK01': 40 }), mulberry32(3));
    expect(picked.items).toHaveLength(10);
    expect(picked.items.slice(0, 5).every((m) => m.kk[0] === 'U4O2-KK03')).toBe(true);
    expect(picked.items.slice(5, 8).every((m) => m.kk[0] === 'U3O1-KK01')).toBe(true);
    expect(picked.kks.slice(0, 2)).toEqual(['U4O2-KK03', 'U3O1-KK01']);
  });

  it('picks short answers the same way', () => {
    expect(pickShorts(content, { mode: 'kk', kk: 'U4O1-KK02' }, new Map(), mulberry32(1)).items.map((s) => s.id)).toEqual([
      's-u4o1-kk02-001',
    ]);
    expect(pickShorts(content, { mode: 'random' }, new Map(), mulberry32(1)).items).toHaveLength(2);
  });

  it('takes one item from each pool in turn without repeats', () => {
    const a = [{ id: 'a1' }, { id: 'a2' }, { id: 'shared' }];
    const b = [{ id: 'shared' }, { id: 'b2' }];
    expect(roundRobin([a, b], 10).map((x) => x.id)).toEqual(['a1', 'shared', 'a2', 'b2']);
  });

  it('returns nothing when there is no content', () => {
    const empty = fixtureIndex();
    expect(pickMcqs(empty, { mode: 'weak' }, new Map(), mulberry32(1)).items).toEqual([]);
    expect(pickRunDrill(empty, new Map(), mulberry32(1)).items).toEqual([]);
  });
});

describe('format', () => {
  const now = new Date(2026, 9, 1, 10, 0).getTime();

  it('formats intervals, waits and clocks', () => {
    expect([1, 6, 15, 44, 60, 200, 400].map(formatInterval)).toEqual(['1 day', '6 days', '15 days', '44 days', '2 months', '7 months', '1.1 years']);
    expect(formatWait(600_000)).toBe('10 minutes');
    expect(formatWait(61_000)).toBe('2 minutes');
    expect(formatWait(30_000)).toBe('less than a minute');
    expect(formatClock(24 * 60_000)).toBe('24:00');
    expect(formatClock(61_500)).toBe('1:02');
    expect(formatClockWords(5 * 60_000)).toBe('5 minutes');
    expect(formatClockWords(61_000)).toBe('1 minute 1 second');
  });

  it('says when a KK was last practised', () => {
    expect(lastPractised(0, now)).toBe('Never');
    expect(lastPractised(now - 3_600_000, now)).toBe('Today');
    expect(lastPractised(now - 86_400_000, now)).toBe('Yesterday');
    expect(lastPractised(now - 3 * 86_400_000, now)).toBe('3 days ago');
    // 2 am belongs to the previous study day.
    expect(lastPractised(new Date(2026, 9, 1, 2, 0).getTime(), now)).toBe('Yesterday');
  });

  it('describes due times relative to now', () => {
    expect(describeDue(now - 1, now)).toBe('now');
    expect(describeDue(now + 10 * 60_000, now)).toBe('in 10 minutes');
    expect(describeDue(new Date(2026, 9, 1, 18, 30).getTime(), now)).toBe('later today at 6:30 pm');
    expect(describeDue(new Date(2026, 9, 2, 4).getTime(), now)).toBe('tomorrow');
    expect(describeDue(new Date(2026, 9, 4, 4).getTime(), now)).toBe('on Sunday');
    expect(describeDue(new Date(2026, 9, 9, 4).getTime(), now)).toBe('on Friday 9 October');
    expect(timeOfDay(new Date(2026, 9, 1, 9, 5).getTime())).toBe('9:05 am');
  });
});
