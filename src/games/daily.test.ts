import { describe, expect, it } from 'vitest';
import { DAILY_GENERATOR_GAMES, DAILY_MCQS, DAILY_SIZE, buildDailySet, dailyShareText } from './daily';

const pool = Array.from({ length: 60 }, (_, i) => ({ id: `m-u3o1-kk${String((i % 14) + 1).padStart(2, '0')}-${String(i).padStart(3, '0')}` }));

/** A pool shaped like the real content: every KK's MCQs numbered 001, 002, ... under one prefix. */
const AREAS: [string, number][] = [
  ['u3o1', 14],
  ['u3o2', 16],
  ['u4o1', 12],
  ['u4o2', 10],
];
const realistic = AREAS.flatMap(([area, count], a) =>
  Array.from({ length: count }, (_, k) => {
    const kk = `${area.toUpperCase()}-KK${String(k + 1).padStart(2, '0')}`;
    return Array.from({ length: 3 + ((a + k) % 4) }, (_, n) => ({ id: `m-${area}-kk${String(k + 1).padStart(2, '0')}-${String(n + 1).padStart(3, '0')}`, kk: [kk] }));
  }).flat(),
);
const kkOf = new Map(realistic.map((m) => [m.id, m.kk[0]]));

function dates(n: number): string[] {
  const start = Date.UTC(2026, 8, 1);
  return Array.from({ length: n }, (_, d) => new Date(start + d * 86_400_000).toISOString().slice(0, 10));
}

describe('daily challenge set', () => {
  it('is identical for the same Melbourne date', () => {
    expect(buildDailySet('2026-10-02', pool)).toEqual(buildDailySet('2026-10-02', [...pool].reverse()));
  });

  it('differs between dates', () => {
    expect(buildDailySet('2026-10-02', pool)).not.toEqual(buildDailySet('2026-10-03', pool));
  });

  it('has 8 MCQs and 2 generated items with unique ids', () => {
    const set = buildDailySet('2026-10-02', pool);
    expect(set).toHaveLength(DAILY_SIZE);
    expect(set.filter((i) => i.kind === 'mcq')).toHaveLength(DAILY_MCQS);
    expect(new Set(set.map((i) => i.id)).size).toBe(DAILY_SIZE);
    const games = set.filter((i) => i.kind === 'generated').map((i) => (i.kind === 'generated' ? i.gameId : ''));
    expect(new Set(games).size).toBe(2);
  });

  it('changes at most one MCQ pick when one MCQ is added', () => {
    const before = buildDailySet('2026-10-02', pool).filter((i) => i.kind === 'mcq').map((i) => i.id);
    const after = buildDailySet('2026-10-02', [...pool, { id: 'm-new-item-001' }]).filter((i) => i.kind === 'mcq').map((i) => i.id);
    expect(before.filter((id) => !after.includes(id)).length).toBeLessThanOrEqual(1);
  });

  it('fills with generated items when the MCQ pool is small', () => {
    const set = buildDailySet('2026-10-02', pool.slice(0, 3));
    expect(set).toHaveLength(DAILY_SIZE);
    expect(set.filter((i) => i.kind === 'generated')).toHaveLength(7);
    expect(new Set(set.map((i) => i.id)).size).toBe(DAILY_SIZE);
  });

  it('spreads the MCQs across key knowledge and never runs sibling questions together', () => {
    for (const date of dates(60)) {
      const set = buildDailySet(date, realistic);
      const mcqKks = set.filter((i) => i.kind === 'mcq').map((i) => kkOf.get(i.id));
      expect(new Set(mcqKks).size, date).toBeGreaterThanOrEqual(6);
      const kks = set.map((i) => (i.kind === 'mcq' ? kkOf.get(i.id) : i.id));
      for (let i = 2; i < kks.length; i++) {
        expect(kks[i] === kks[i - 1] && kks[i] === kks[i - 2], `${date}: three in a row from ${kks[i]}`).toBe(false);
      }
    }
  });

  it('ranks sibling ids independently, not next to each other', () => {
    // Plain FNV-1a ranked ids that differ in their last character side by side.
    for (const date of dates(30)) {
      const ids = buildDailySet(date, realistic.map(({ id }) => ({ id })))
        .filter((i) => i.kind === 'mcq')
        .map((i) => kkOf.get(i.id));
      expect(new Set(ids).size, date).toBeGreaterThanOrEqual(5);
    }
  });

  it('gives a key knowledge point a second question only when the pool has too few', () => {
    const small = realistic.filter((m) => m.kk[0].startsWith('U4O2')).slice(0, 12);
    const set = buildDailySet('2026-10-02', small);
    expect(set.filter((i) => i.kind === 'mcq')).toHaveLength(8);
  });

  it('draws two different generator games a day, spread evenly over every generator game', () => {
    const counts = new Map<string, number>();
    const days = dates(730);
    for (const date of days) {
      const set = buildDailySet(date, realistic);
      expect(buildDailySet(date, [...realistic].reverse()), date).toEqual(set);
      const games = set.flatMap((i) => (i.kind === 'generated' ? [i.gameId] : []));
      expect(new Set(games).size, date).toBe(2);
      for (const g of games) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    const share = (days.length * 2) / DAILY_GENERATOR_GAMES.length;
    for (const g of DAILY_GENERATOR_GAMES) {
      expect(counts.get(g) ?? 0, g).toBeGreaterThan(share * 0.6);
      expect(counts.get(g) ?? 0, g).toBeLessThan(share * 1.4);
    }
  });

  it('formats the share line', () => {
    expect(dailyShareText('2026-10-02', [1, 1, 0, 1, 1, 1, 1, 0, 1, 1])).toBe('COLDBOOT daily 2026-10-02  8/10\n🟦🟦⬛🟦🟦🟦🟦⬛🟦🟦');
  });
});
