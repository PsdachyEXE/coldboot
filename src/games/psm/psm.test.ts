/**
 * The psm game over 500 seeds at every difficulty, on the real content/psm.json. Every expected
 * answer is checked a second way: the test finds the activity or note shown in the prompt in the
 * raw JSON and reads its stage from there.
 */
import { describe, expect, it } from 'vitest';
import psmJson from '../../../content/psm.json';
import { buildIndex } from '../../content/loader';
import { PSM_STAGE_IDS, PsmFileSchema, type PsmFile } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import type { Difficulty, GameContext, QuizItem } from '../types';
import game from './index';
import { parseLetters, parseStage, planPsmRound, psmBank, psmItem, PSM_KINDS, STAGE_CHIPS } from './items';

const PSM: PsmFile = PsmFileSchema.parse(psmJson);
const BANK = psmBank(PSM)!;
const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 5);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

/** Stage number (1 to 4) of an activity found by its name or summary in the raw JSON. */
function stageOfActivity(text: string): number {
  const hits = PSM.stages.flatMap((s) => s.activities.filter((a) => a.name === text || a.summary === text).map(() => PSM_STAGE_IDS.indexOf(s.id) + 1));
  expect(hits, text).toHaveLength(1);
  return hits[0];
}

function stageOfNote(text: string): number {
  const hits = PSM.specifications.filter((s) => s.toLowerCase().endsWith(text.toLowerCase()));
  expect(hits, text).toHaveLength(1);
  const name = hits[0].split(':')[0].toLowerCase();
  return PSM_STAGE_IDS.indexOf(name as (typeof PSM_STAGE_IDS)[number]) + 1;
}

function shownText(item: QuizItem): string {
  const b = item.prompt[1];
  return b.kind === 'text' || b.kind === 'markdown' ? b.text : '';
}

function options(item: QuizItem): string[] {
  const block = item.prompt.find((b): b is Extract<TerminalBlock, { kind: 'choices' }> => b.kind === 'choices');
  return block?.options ?? [];
}

/** The reference answer, typed, and a wrong one. */
function answers(item: QuizItem): { right: string; wrong: string } {
  const kind = item.id.replace('gen-psm-', '');
  if (kind === 'stage' || kind === 'spec') {
    const n = kind === 'stage' ? stageOfActivity(shownText(item)) : stageOfNote(shownText(item));
    return { right: PSM_STAGE_IDS[n - 1], wrong: String((n % 4) + 1) };
  }
  const stages = options(item).map(stageOfActivity);
  expect(new Set(stages).size).toBe(stages.length);
  const order = stages.map((_, i) => i).sort((a, b) => stages[a] - stages[b]);
  const letters = order.map((i) => 'ABC'[i]);
  if (kind === 'first') return { right: letters[0], wrong: letters[1] };
  return { right: letters.join(' '), wrong: [...letters].reverse().join(' ') };
}

describe('psm bank', () => {
  it('reads every stage, activity and specification note from the content', () => {
    expect(Object.keys(BANK.stageNames)).toEqual([...PSM_STAGE_IDS]);
    expect(BANK.activities).toHaveLength(PSM.stages.reduce((n, s) => n + s.activities.length, 0));
    expect(BANK.specs).toHaveLength(PSM.specifications.length);
    for (const note of BANK.specs) expect(note.text).not.toMatch(/^(Analysis|Design|Development|Evaluation):/);
  });

  it('is unavailable without the content', () => {
    expect(psmBank(null)).toBeNull();
    expect(psmBank({ ...PSM, stages: PSM.stages.slice(0, 3) })).toBeNull();
    const empty = buildIndex({ areas: [], terms: [], psm: { ...PSM, stages: [] as unknown as PsmFile['stages'] }, caseStudies: [] });
    const session = game.start(ctx(empty), { difficulty: 'normal', seed: 1 });
    expect(session.unavailable?.[0]).toMatchObject({ kind: 'text', text: expect.stringMatching(/isn't installed/) });
  });
});

describe('psm items', () => {
  it.each(LEVELS)('accept the reference answer and reject a wrong one (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      for (const kind of PSM_KINDS) {
        for (const described of [false, true]) {
          const item = psmItem(BANK, { kind, seed, described }, level);
          const { right, wrong } = answers(item);
          const label = `${item.instance}`;
          expect(item.check(right).correct, label).toBe(true);
          const r = item.check(wrong);
          expect(r.correct, label).toBe(false);
          expect(r.counted, label).not.toBe(false);
          expect(item.check('banana').counted, label).toBe(false);
          // The expected answer typed back is accepted.
          const expected = r.expected;
          const typed = kind === 'first' ? expected.charAt(0) : kind === 'order' ? expected : expected.replace(/ \(stage \d\)$/, '');
          expect(item.check(typed).correct, `${label}: ${typed}`).toBe(true);
          expect(psmItem(BANK, { kind, seed, described }, level).prompt).toEqual(item.prompt);
        }
      }
    }
  });

  it('accepts stage numbers and chips for stage questions', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const item = psmItem(BANK, { kind: 'stage', seed }, 'normal');
      const n = stageOfActivity(shownText(item));
      expect(item.check(String(n)).correct).toBe(true);
      expect(item.check(`stage ${n}`).correct).toBe(true);
      expect(STAGE_CHIPS.filter((c) => item.check(c).correct)).toHaveLength(1);
    }
  });

  it('parses stages and letters leniently', () => {
    expect(parseStage('Design')).toBe('design');
    expect(parseStage('the development stage')).toBe('development');
    expect(parseStage('4')).toBe('evaluation');
    expect(parseStage('Stage 1')).toBe('analysis');
    expect(parseStage('analyse')).toBe('analysis');
    expect(parseStage('5')).toBeNull();
    expect(parseStage('testing')).toBeNull();
    expect(parseLetters('b, a, c', 3)).toEqual([1, 0, 2]);
    expect(parseLetters('BAC', 3)).toEqual([1, 0, 2]);
    expect(parseLetters('B -> A -> C', 3)).toEqual([1, 0, 2]);
    expect(parseLetters('B A D', 3)).toBeNull();
  });
});

function ctx(content: GameContext['content']): GameContext {
  return { playerName: '', now: () => 1_000, content, mastery: () => null, today: '2026-10-01', daily: null };
}

describe('psm rounds', () => {
  const content = buildIndex({ areas: [], terms: [], psm: PSM, caseStudies: [] });

  it.each(LEVELS)('plans the %s mix with no repeated question', (level) => {
    for (const seed of SEEDS.slice(0, 100)) {
      const plan = planPsmRound(BANK, seed, level);
      expect(plan).toHaveLength(10);
      const kinds = plan.map((p) => p.kind);
      if (level === 'easy') expect(kinds.filter((k) => k === 'spec' || k === 'order')).toHaveLength(0);
      if (level === 'hard') expect(kinds.filter((k) => k === 'order')).toHaveLength(2);
      const keys = plan.map((p) => psmItem(BANK, p, level).instance!.replace(/:seed=.*$/, ''));
      expect(new Set(keys).size).toBeGreaterThanOrEqual(9);
    }
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const session = game.start(ctx(content), { difficulty: level, seed: 3 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('???').expected;
      const typed = /^[AB]\. /.test(expected) ? expected.charAt(0) : expected.replace(/ \(stage \d\)$/, '');
      expect(session.answer(typed).correct).toBe(true);
    }
    expect(session.summary()).toMatchObject({ gameId: 'psm', score: 10, total: 10 });
  });
});
