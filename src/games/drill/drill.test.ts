import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../prng';
import { fixtureContent } from './fixture';
import game from './index';
import { isAreaId, kksInArea, mcqsForKk, selectDrillMcqs, weakestDrillKks, weakestKks } from './select';

describe('drill selection', () => {
  const content = fixtureContent();

  it('finds MCQs by KK, including multi-KK items', () => {
    expect(mcqsForKk(content, 'U3O1-KK12')).toHaveLength(6);
    expect(mcqsForKk(content, 'U3O1-KK04')).toHaveLength(5);
    expect(mcqsForKk(content, 'U3O2-KK01')).toHaveLength(0);
  });

  it('recognises areas and lists their KKs in order', () => {
    expect(isAreaId('U3O1')).toBe(true);
    expect(isAreaId('U3O5')).toBe(false);
    expect(kksInArea('U3O1')[0]).toBe('U3O1-KK01');
  });

  it('orders weak KKs first, then unseen, then strong', () => {
    const mastery: Record<string, number> = { 'U3O1-KK12': 90, 'U4O2-KK04': 30 };
    const order = weakestKks(content, (kk) => mastery[kk] ?? null);
    expect(order).toEqual(['U4O2-KK04', 'U3O1-KK04', 'U3O1-KK10', 'U3O1-KK12']);
  });

  it('takes at least three KKs and enough to fill the round', () => {
    expect(weakestDrillKks(content, () => null)).toEqual(['U3O1-KK04', 'U3O1-KK10', 'U3O1-KK12']);
  });

  it('picks distinct MCQs round-robin across KKs, deterministically', () => {
    const picked = selectDrillMcqs(content, ['U3O1-KK04', 'U3O1-KK12'], mulberry32(1), 10);
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((m) => m.id)).size).toBe(10);
    expect(picked.slice(0, 2).map((m) => m.kk.includes('U3O1-KK04') !== m.kk.includes('U3O1-KK12'))).toEqual([true, true]);
    expect(selectDrillMcqs(content, ['U3O1-KK04', 'U3O1-KK12'], mulberry32(1), 10)).toEqual(picked);
    expect(selectDrillMcqs(content, ['U3O2-KK01'], mulberry32(1), 10)).toEqual([]);
  });

  it('runs a drill round on the engine with MCQ feedback', () => {
    const ctx = { playerName: '', now: () => 0, content, mastery: () => null, today: '2026-10-01', daily: null };
    const session = game.start(ctx, { difficulty: 'normal', seed: 5, kk: ['U4O2-KK04'] });
    expect(session.progress).toEqual({ current: 1, total: 5 });
    expect(session.chips?.()).toEqual(['A', 'B', 'C', 'D']);
    const wrong = session.answer('a');
    expect(wrong.correct).toBe(false);
    expect(wrong.markdown).toBe(true);
    expect(wrong.reason).toContain('**Why not A:** Not one.');
    expect(session.answer('C').correct).toBe(true);
  });
});
