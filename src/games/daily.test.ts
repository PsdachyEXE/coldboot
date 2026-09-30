import { describe, expect, it } from 'vitest';
import { DAILY_MCQS, DAILY_SIZE, buildDailySet, dailyShareText } from './daily';

const pool = Array.from({ length: 60 }, (_, i) => ({ id: `m-u3o1-kk${String((i % 14) + 1).padStart(2, '0')}-${String(i).padStart(3, '0')}` }));

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

  it('formats the share line', () => {
    expect(dailyShareText('2026-10-02', [1, 1, 0, 1, 1, 1, 1, 0, 1, 1])).toBe('COLDBOOT daily 2026-10-02  8/10\n🟦🟦⬛🟦🟦🟦🟦⬛🟦🟦');
  });
});
