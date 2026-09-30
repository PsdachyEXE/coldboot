import { beforeAll, describe, expect, it } from 'vitest';
import type { ContentIndex } from '../../content/loader';
import type { DailyRecord } from '../../state/session';
import { buildDailySet, dailyShareText, DAILY_GENERATOR_GAMES, DAILY_SIZE, type DailyItemRef } from '../daily';
import { fixtureContent } from '../drill/fixture';
import type { GameContext, QuizItem } from '../types';
import { dailyItem, dailyRefs, loadDailyGame, loadGenerators, msUntilNextSet, startDaily, type Generators } from './index';
import { typedAnswer, wrongAnswer } from './testing';

let generators: Generators;
beforeAll(async () => {
  generators = await loadGenerators();
});

const NOW = new Date('2026-10-01T10:00:00+10:00').getTime();
const TODAY = '2026-10-01';

function ctx(daily: DailyRecord | null = null, content: ContentIndex | null = fixtureContent(), today = TODAY, now = NOW): GameContext {
  return { playerName: '', now: () => now, content, mastery: () => null, today, daily };
}

function textOf(blocks: readonly { kind: string; text?: string }[]): string {
  return blocks.map((b) => b.text ?? '').join('\n');
}

describe('daily set in the game', () => {
  it('asks the same ten questions for the same Melbourne date, across two runs', () => {
    const a = startDaily(ctx(), generators);
    const b = startDaily(ctx(), generators);
    expect(a.itemIds).toHaveLength(DAILY_SIZE);
    expect(a.itemIds).toEqual(b.itemIds);
    expect(a.itemIds).toEqual(buildDailySet(TODAY, fixtureContent().mcq).map((r) => r.id));
    for (let i = 0; i < DAILY_SIZE; i++) {
      expect(a.prompt()).toEqual(b.prompt());
      const typed = typedAnswer(itemAt(a.itemIds![i]));
      expect(a.answer(typed).correct).toBe(true);
      expect(b.answer(typed).correct).toBe(true);
    }
    expect(startDaily(ctx(null, fixtureContent(), '2026-10-02'), generators).itemIds).not.toEqual(a.itemIds);
  });

  function itemAt(id: string): QuizItem {
    const ref = dailyRefs(TODAY, fixtureContent(), null).refs.find((r) => r.id === id)!;
    return dailyItem(ref, fixtureContent(), generators);
  }

  it('has eight MCQs and two generated items, with generated ids matching the daily record', () => {
    const { refs } = dailyRefs(TODAY, fixtureContent(), null);
    expect(refs.filter((r) => r.kind === 'mcq')).toHaveLength(8);
    const generated = refs.filter((r) => r.kind === 'generated');
    expect(generated).toHaveLength(2);
    for (const ref of generated) {
      const item = dailyItem(ref, fixtureContent(), generators);
      expect(item.id).toBe(ref.id);
      expect(item.id).toMatch(new RegExp(`^gen-daily-(${DAILY_GENERATOR_GAMES.join('|')}):\\d+$`));
      expect(item.instance).toBeTruthy();
    }
  });

  it('loads a generator for every listed game, P1 included, and rebuilds its items from a stored record', () => {
    expect(Object.keys(generators).sort()).toEqual([...DAILY_GENERATOR_GAMES].sort());
    for (const gameId of DAILY_GENERATOR_GAMES) {
      const refs: DailyItemRef[] = [11, 222, 3333].map((seed) => ({ kind: 'generated', id: `gen-daily-${gameId}:${seed}`, gameId, seed }));
      // A stored record keeps generated ids; they read back as the same generated items.
      const record: DailyRecord = { itemIds: refs.map((r) => r.id), results: [], completedAt: null };
      expect(dailyRefs(TODAY, fixtureContent(), record)).toEqual({ refs, replaced: 0 });
      for (const ref of refs) {
        const item = dailyItem(ref, fixtureContent(), generators);
        expect(item.id, gameId).toBe(ref.id);
        expect(item.instance, gameId).toBeTruthy();
        expect(item.kk.length, gameId).toBeGreaterThan(0);
        expect(item.prompt.length, gameId).toBeGreaterThan(0);
        expect(dailyItem(ref, fixtureContent(), generators).prompt, gameId).toEqual(item.prompt);
        expect(item.check(typedAnswer(item)).correct, `${gameId} ${ref.seed}`).toBe(true);
        expect(item.check(wrongAnswer(item)).correct, `${gameId} ${ref.seed}`).toBe(false);
      }
    }
  });

  it('fills with generated items when too few MCQs are installed, or none', () => {
    for (const content of [null, fixtureContent()]) {
      const few = content ? { ...content, mcq: content.mcq.slice(0, 3) } : null;
      const session = startDaily(ctx(null, few), generators);
      expect(session.itemIds).toHaveLength(DAILY_SIZE);
      expect(session.itemIds!.filter((id) => id.startsWith('gen-daily-')).length).toBe(content ? 7 : 10);
      expect(session.done).toBe(false);
    }
  });

  it('scores a full day, records first attempts and builds the share line', () => {
    const session = startDaily(ctx(), generators);
    const ids = [...session.itemIds!];
    ids.forEach((id, i) => {
      const r = session.answer(i === 2 ? 'nonsense that is still an answer' : typedAnswer(itemAt(id)));
      if (r.counted === false) session.answer(i === 2 ? wrongAnswer(itemAt(id)) : typedAnswer(itemAt(id)));
    });
    expect(session.done).toBe(true);
    const summary = session.summary();
    expect(summary.score).toBe(9);
    expect(summary.shareText).toBe(dailyShareText(TODAY, [1, 1, 0, 1, 1, 1, 1, 1, 1, 1]));
    expect(textOf(summary.blocks)).toContain('Daily challenge complete: 9 of 10 correct.');
    expect(textOf(summary.blocks)).toContain('The next set is ready in 14 h 0 min, at midnight in Melbourne.');
  });

  it('resumes from the stored record, skipping answered items', () => {
    const itemIds = startDaily(ctx(), generators).itemIds!;
    const record: DailyRecord = { itemIds: [...itemIds], results: [1, 0, 1], completedAt: null };
    const session = startDaily(ctx(record), generators);
    expect(session.itemIds).toEqual(itemIds);
    expect(session.progress).toEqual({ current: 4, total: 10 });
    expect(session.current!()!.itemId).toBe(itemIds[3]);
    expect(textOf(session.prompt())).toContain('Carrying on from question 4 of 10. Your earlier answers still count.');
    for (let i = 3; i < DAILY_SIZE; i++) session.answer(typedAnswer(itemAt(itemIds[i])));
    const summary = session.summary();
    expect(summary).toMatchObject({ score: 9, total: 10 });
    expect(summary.shareText).toBe(dailyShareText(TODAY, [1, 0, 1, 1, 1, 1, 1, 1, 1, 1]));
  });

  it("keeps a started day's set even if new content would pick differently", () => {
    const itemIds = startDaily(ctx(), generators).itemIds!;
    const record: DailyRecord = { itemIds: [...itemIds], results: [1], completedAt: null };
    // Two of the day's MCQs leave the content (a new build mid-day); new MCQs arrive too.
    const removed = itemIds.filter((id) => id.startsWith('m-')).slice(0, 2);
    const changed = fixtureContent();
    for (const id of removed) changed.byId.delete(id);
    changed.mcq = changed.mcq.filter((m) => !removed.includes(m.id));
    const session = startDaily(ctx(record, changed), generators);
    const ids = session.itemIds!;
    expect(ids).toHaveLength(DAILY_SIZE);
    ids.forEach((id, i) => {
      if (removed.includes(itemIds[i])) expect(id).toMatch(/^gen-daily-/);
      else expect(id).toBe(itemIds[i]);
    });
    expect(session.progress).toEqual({ current: 2, total: 10 });
    expect(textOf(session.prompt())).toContain('2 questions from today\'s set are no longer installed, so a generated question takes their place.');
  });

  it("doesn't replay a finished day for credit", () => {
    const itemIds = startDaily(ctx(), generators).itemIds!;
    const results: (0 | 1)[] = [1, 1, 0, 1, 1, 1, 1, 0, 1, 1];
    const record: DailyRecord = { itemIds: [...itemIds], results, completedAt: NOW - 3_600_000 };
    const session = startDaily(ctx(record), generators);
    expect(session.done).toBe(true);
    expect(session.itemIds).toEqual(itemIds);
    expect(session.prompt()).toEqual([]);
    expect(session.answer('A').counted).toBe(false);
    const summary = session.summary();
    expect(summary).toMatchObject({ score: 8, total: 10 });
    expect(summary.shareText).toBe('COLDBOOT daily 2026-10-01  8/10\n🟦🟦⬛🟦🟦🟦🟦⬛🟦🟦');
    const text = textOf(summary.blocks);
    expect(text).toContain("You've already finished today's daily challenge: 8 of 10 correct.");
    expect(text).toContain('Only the first attempt counts, so this set is done for today.');
    expect(text).toContain('The next set is ready in 14 h 0 min');
    expect(text).not.toContain('Time:');
  });

  it('counts down to the next Melbourne midnight, across daylight saving changes', () => {
    expect(msUntilNextSet('2026-10-01', NOW)).toBe(14 * 3_600_000);
    // Daylight saving starts on 4 October 2026: that day has 23 hours.
    const start = new Date('2026-10-04T00:00:00+10:00').getTime();
    expect(msUntilNextSet('2026-10-04', start)).toBe(23 * 3_600_000);
    expect(msUntilNextSet('2026-10-01', new Date('2026-10-02T00:30:00+10:00').getTime())).toBe(0);
  });

  it('loads through the registry with the generator games', async () => {
    const game = await loadDailyGame();
    expect(game.id).toBe('daily');
    expect(game.start(ctx(), { difficulty: 'normal', seed: 1 }).itemIds).toHaveLength(DAILY_SIZE);
  });
});
