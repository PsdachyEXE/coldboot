/**
 * threat: every scenario in the fixed bank has exactly one correct control among its options, and
 * no option is a control that could be argued for it; every Essential Eight list over 500 seeds at
 * each difficulty accepts exactly the eight's letters and rejects a missing or an extra one.
 */
import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../types';
import { ALSO_HELPS, CONTROL_LABELS, CONTROLS, ESSENTIAL_EIGHT, NOT_ESSENTIAL_EIGHT, SCENARIOS } from './bank';
import game from './index';
import {
  arguable,
  E8_SHAPE,
  e8Item,
  e8List,
  fromThreatInstance,
  generateThreatItem,
  MATCH_OPTIONS,
  matchControls,
  matchItem,
  planThreatRound,
  threatItem,
} from './items';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 11);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];
const LETTERS = 'ABCDEFGH'.split('');
const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };

describe('threat bank', () => {
  it('has three distinct scenarios for every control, each with enough clear distractors', () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
    expect(new Set(SCENARIOS.map((s) => s.story)).size).toBe(SCENARIOS.length);
    for (const c of CONTROLS) {
      expect(SCENARIOS.filter((s) => s.control === c)).toHaveLength(3);
      expect(ALSO_HELPS[c]).not.toContain(c);
    }
    for (const s of SCENARIOS) {
      const pool = CONTROLS.filter((c) => !arguable(s).has(c));
      expect(pool.length, s.id).toBeGreaterThanOrEqual(MATCH_OPTIONS.hard - 1);
      expect(s.story, s.id).toMatch(/^[A-Z].*[.]$/);
      expect(s.why, s.id).toMatch(/^[A-Z].*[.]$/);
      expect(`${s.story} ${s.why}`).not.toMatch(/’/);
    }
    expect(new Set(Object.values(CONTROL_LABELS)).size).toBe(CONTROLS.length);
  });

  it('keeps the Essential Eight lists apart, with no distractor that is another name for one of the eight', () => {
    expect(new Set(ESSENTIAL_EIGHT).size).toBe(8);
    for (const d of NOT_ESSENTIAL_EIGHT) {
      expect((ESSENTIAL_EIGHT as readonly string[]).includes(d)).toBe(false);
      expect(d, d).not.toMatch(/patch|backup|multi-factor|two-factor|application|macro|admin|privilege|harden|whitelist/i);
    }
  });
});

describe('threat match items', () => {
  it.each(LEVELS)('offer one right control and only clearly wrong ones (%s, 500 seeds)', (level) => {
    for (const s of SCENARIOS) {
      for (const seed of SEEDS) {
        const controls = matchControls(s, seed, level);
        expect(controls).toHaveLength(MATCH_OPTIONS[level]);
        expect(new Set(controls).size).toBe(controls.length);
        expect(controls.filter((c) => arguable(s).has(c))).toEqual([s.control]);
        const item = matchItem(s.id, seed, level);
        const letters = LETTERS.slice(0, controls.length);
        expect(letters.filter((l) => item.check(l).correct), `${s.id} ${seed}`).toEqual([letters[controls.indexOf(s.control)]]);
        for (const l of letters) expect(item.check(l).counted).not.toBe(false);
        expect(item.check(LETTERS[controls.length]).counted).toBe(false);
        expect(item.check(item.check('?').expected).correct).toBe(true);
        expect(item.check(CONTROL_LABELS[s.control]).correct).toBe(true);
        expect(item.chips).toEqual(letters);
        expect(fromThreatInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
  });

  it('moves the answer around the options', () => {
    const positions = new Set(SEEDS.slice(0, 100).map((seed) => matchControls(SCENARIOS[0], seed, 'normal').indexOf(SCENARIOS[0].control)));
    expect(positions.size).toBe(4);
  });
});

describe('threat Essential Eight items', () => {
  it.each(LEVELS)('accept exactly the Essential Eight letters (%s, 500 seeds)', (level) => {
    const counts = new Set<number>();
    for (const seed of SEEDS) {
      const { options, answer } = e8List(seed, level);
      const shape = E8_SHAPE[level];
      expect(options).toHaveLength(shape.options);
      expect(new Set(options).size).toBe(options.length);
      expect(answer.length).toBeGreaterThanOrEqual(shape.min);
      expect(answer.length).toBeLessThanOrEqual(shape.max);
      counts.add(answer.length);
      for (const [i, o] of options.entries()) expect(answer.includes(i)).toBe((ESSENTIAL_EIGHT as readonly string[]).includes(o));
      const item = e8Item(seed, level);
      const right = answer.map((i) => LETTERS[i]);
      expect(item.check(right.join(' ')).correct).toBe(true);
      expect(item.check(right.reverse().join(', ').toLowerCase()).correct).toBe(true);
      expect(item.check(item.check('?').expected).correct).toBe(true);
      const missing = item.check(answer.slice(1).map((i) => LETTERS[i]).join(' '));
      expect(missing.correct).toBe(false);
      expect(missing.reason).toMatch(/^You left out /);
      const wrongLetter = LETTERS[options.findIndex((_, i) => !answer.includes(i))];
      const extra = item.check([...answer.map((i) => LETTERS[i]), wrongLetter].join(' '));
      expect(extra.correct).toBe(false);
      expect(extra.reason).toMatch(new RegExp(`^${wrongLetter} isn't one of the eight`));
      expect(item.check(LETTERS.slice(0, options.length).join('')).correct).toBe(false);
      expect(item.check(String.fromCharCode(65 + options.length)).counted).toBe(false);
      expect(item.check('none').counted).toBe(false);
      expect(fromThreatInstance(item.instance!)?.prompt).toEqual(item.prompt);
    }
    expect(counts.size).toBe(2);
  });
});

describe('threat rounds', () => {
  it('plans seven weaknesses with different controls and three lists that never sit together', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS.slice(0, 200)) {
        const plan = planThreatRound(seed, level);
        expect(plan).toHaveLength(10);
        const matches = plan.flatMap((p) => (p.kind === 'match' ? [SCENARIOS.find((s) => s.id === p.scenario)!] : []));
        expect(matches).toHaveLength(7);
        expect(new Set(matches.map((s) => s.control)).size).toBe(7);
        expect(plan[0].kind).toBe('match');
        plan.forEach((p, i) => {
          if (p.kind === 'e8' && i > 0) expect(plan[i - 1].kind).toBe('match');
        });
        if (seed < 50) for (const p of plan) expect(fromThreatInstance(threatItem(p, level).instance!)?.prompt).toEqual(threatItem(p, level).prompt);
      }
    }
    expect(planThreatRound(4, 'hard', 30)).toHaveLength(30);
  });

  it.each(LEVELS)('generates standalone items over 500 seeds (%s)', (level) => {
    const ids = new Set<string>();
    for (const seed of SEEDS) {
      const item = generateThreatItem(seed, level);
      ids.add(item.id);
      expect(generateThreatItem(seed, level).prompt).toEqual(item.prompt);
      expect(item.check(item.check('?').expected).correct).toBe(true);
      expect(fromThreatInstance(item.instance!)?.prompt).toEqual(item.prompt);
    }
    expect([...ids].sort()).toEqual(['gen-threat-e8', 'gen-threat-match']);
  });

  it('rejects unknown instances', () => {
    expect(fromThreatInstance('threat:match:nope:seed=1:easy')).toBeNull();
    expect(fromThreatInstance('threat:e8:seed=1:extreme')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const session = game.start(ctx, { difficulty: level, seed: 17 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('?').expected;
      expect(session.answer(expected).correct).toBe(true);
    }
    const summary = session.summary();
    expect(summary).toMatchObject({ gameId: 'threat', score: 10, total: 10 });
    expect(summary.perKk['U4O2-KK04']).toEqual({ correct: 7, total: 7 });
    expect(summary.perKk['U4O2-KK07']).toEqual({ correct: 3, total: 3 });
  });
});
