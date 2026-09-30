import { describe, expect, it } from 'vitest';
import type { KkId } from '../content/schema';
import { createQuizSession, DEFAULT_ROUND, formatDuration, formatScore, unavailableSession } from './engine';
import type { QuizItem } from './types';

function numberItem(n: number, kk: KkId = 'U3O1-KK12'): QuizItem {
  return {
    id: `gen-test-${n}`,
    kk: [kk],
    instance: `test:n=${n}`,
    chips: [String(n)],
    prompt: [{ kind: 'text', text: `Type ${n}` }],
    check(input) {
      const v = Number(input.trim());
      if (!Number.isFinite(v)) return { correct: false, expected: String(n), reason: 'Type a number.', counted: false };
      return { correct: v === n, expected: String(n), reason: `It was ${n}.` };
    },
  };
}

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('quiz engine', () => {
  it('runs a default round of 10 generated items with progress and tallies', () => {
    const c = clock();
    const made: number[] = [];
    const s = createQuizSession({
      gameId: 'test',
      now: c.now,
      generate: (i) => {
        made.push(i);
        return numberItem(i);
      },
    });
    expect(s.progress).toEqual({ current: 1, total: DEFAULT_ROUND });
    expect(s.prompt()[0]).toEqual({ kind: 'progress', current: 1, total: 10, label: undefined });
    for (let i = 0; i < DEFAULT_ROUND; i++) {
      c.advance(1000);
      const r = s.answer(i % 2 ? '99' : String(i));
      expect(r.itemId).toBe(`gen-test-${i}`);
      expect(r.instance).toBe(`test:n=${i}`);
      expect(r.correct).toBe(i % 2 === 0);
      expect(r.score).toBe(i % 2 === 0 ? 1 : 0);
    }
    expect(s.done).toBe(true);
    expect(made).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const sum = s.summary();
    expect(sum).toMatchObject({ gameId: 'test', score: 5, total: 10, ms: 10_000 });
    expect(sum.perKk['U3O1-KK12']).toEqual({ correct: 5, total: 10 });
    expect(sum.blocks.some((b) => b.kind === 'text' && b.text.includes('5 of 10 correct'))).toBe(true);
    expect(s.prompt()).toEqual([]);
    expect(s.current?.()).toBeNull();
  });

  it('re-prompts without counting when an answer is not an attempt', () => {
    const s = createQuizSession({ gameId: 'test', now: clock().now, items: [numberItem(3), numberItem(4)] });
    const r = s.answer('three');
    expect(r.counted).toBe(false);
    expect(r.reason).toBe('Type a number.');
    expect(s.progress).toEqual({ current: 1, total: 2 });
    expect(s.results).toHaveLength(0);
    expect(s.answer('3').correct).toBe(true);
    expect(s.progress).toEqual({ current: 2, total: 2 });
  });

  it('exposes item ids, chips and the current item for fixed lists', () => {
    const items = [numberItem(1), numberItem(2, 'U3O1-KK04'), numberItem(3)];
    const s = createQuizSession({ gameId: 'daily', now: clock().now, items, exposeItemIds: true, count: 2 });
    expect(s.itemIds).toEqual(['gen-test-1', 'gen-test-2']);
    expect(s.chips?.()).toEqual(['1']);
    expect(s.current?.()).toEqual({ itemId: 'gen-test-1', kk: ['U3O1-KK12'], instance: 'test:n=1' });
    s.answer('1');
    s.answer('0');
    expect(s.done).toBe(true);
    const sum = s.summary();
    expect(sum.total).toBe(2);
    expect(sum.blocks.some((b) => b.kind === 'table')).toBe(true);
  });

  it('hides item ids unless asked', () => {
    const s = createQuizSession({ gameId: 'drill', now: clock().now, items: [numberItem(1)] });
    expect(s.itemIds).toBeUndefined();
  });

  it('ends a timed round at its deadline even without answers', () => {
    const c = clock();
    const s = createQuizSession({ gameId: 'blitz', now: c.now, generate: numberItem, count: Infinity, deadline: c.now() + 60_000 });
    expect(s.progress).toBeUndefined();
    expect(s.deadline).toBe(c.now() + 60_000);
    s.answer('0');
    s.answer('1');
    expect(s.done).toBe(false);
    c.advance(60_000);
    expect(s.done).toBe(true);
    const late = s.answer('2');
    expect(late.counted).toBe(false);
    const sum = s.summary();
    expect(sum.score).toBe(2);
    expect(sum.blocks.some((b) => b.kind === 'text' && b.text.startsWith("Time's up"))).toBe(true);
  });

  it('clamps partial scores and adds share text and extra blocks', () => {
    const partial: QuizItem = {
      id: 'gen-partial',
      kk: ['PSM'],
      prompt: [],
      check: () => ({ correct: false, expected: '', reason: '', score: 1.7 }),
    };
    const s = createQuizSession({
      gameId: 'x',
      now: clock().now,
      items: [partial],
      shareText: (sum) => `score ${sum.score}`,
      summaryExtra: () => [{ kind: 'text', text: 'extra' }],
    });
    expect(s.answer('anything').score).toBe(1);
    const sum = s.summary();
    expect(sum.shareText).toBe('score 1');
    expect(sum.blocks.at(-1)).toEqual({ kind: 'text', text: 'extra' });
  });

  it('resumes after items answered in an earlier sitting', () => {
    const c = clock();
    const items = [numberItem(1), numberItem(2, 'U3O1-KK04'), numberItem(3), numberItem(4)];
    const s = createQuizSession({
      gameId: 'daily',
      now: c.now,
      items,
      exposeItemIds: true,
      resumeScores: [1, 0],
      intro: [{ kind: 'text', text: 'Resuming at question 3.' }],
    });
    expect(s.itemIds).toEqual(['gen-test-1', 'gen-test-2', 'gen-test-3', 'gen-test-4']);
    expect(s.progress).toEqual({ current: 3, total: 4 });
    expect(s.current?.()?.itemId).toBe('gen-test-3');
    const first = s.prompt();
    expect(first[0]).toEqual({ kind: 'text', text: 'Resuming at question 3.' });
    expect(first[1]).toMatchObject({ kind: 'progress', current: 3, total: 4 });
    expect(s.prompt()[0]).toMatchObject({ kind: 'progress' });
    c.advance(5000);
    s.answer('3');
    c.advance(5000);
    s.answer('9');
    expect(s.done).toBe(true);
    expect(s.results.map((r) => r.score)).toEqual([1, 0, 1, 0]);
    const sum = s.summary();
    expect(sum).toMatchObject({ score: 2, total: 4, ms: 10_000 });
    expect(sum.perKk['U3O1-KK04']).toEqual({ correct: 0, total: 1 });
    expect(sum.perKk['U3O1-KK12']).toEqual({ correct: 2, total: 3 });
  });

  it('is done at once when every item was answered before, and then shows no time', () => {
    const s = createQuizSession({ gameId: 'daily', now: clock().now, items: [numberItem(1), numberItem(2)], resumeScores: [1, 1], summaryTitle: 'Already done' });
    expect(s.done).toBe(true);
    expect(s.prompt()).toEqual([]);
    const sum = s.summary();
    expect(sum).toMatchObject({ score: 2, total: 2 });
    expect(sum.blocks.some((b) => b.kind === 'text' && b.text === 'Already done: 2 of 2 correct.')).toBe(true);
    expect(sum.blocks.some((b) => b.kind === 'text' && b.text.startsWith('Time:'))).toBe(false);
  });

  it('builds a session for a game that cannot run', () => {
    const s = unavailableSession('blitz', [{ kind: 'text', text: 'No glossary yet.' }]);
    expect(s.done).toBe(true);
    expect(s.unavailable).toEqual([{ kind: 'text', text: 'No glossary yet.' }]);
    expect(s.answer('x').counted).toBe(false);
  });

  it('formats durations and scores', () => {
    expect(formatDuration(45_000)).toBe('45 s');
    expect(formatDuration(192_000)).toBe('3 min 12 s');
    expect(formatDuration(3_720_000)).toBe('1 h 2 min');
    expect(formatScore(7)).toBe('7');
    expect(formatScore(6.5)).toBe('6.5');
  });
});
