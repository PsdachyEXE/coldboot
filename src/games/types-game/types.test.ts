/**
 * types: every scenario in the three fixed banks has exactly one correct answer among the options,
 * never gives its answer away in the prompt, and justifies it by name; generated items over 500
 * seeds at each difficulty accept their own expected answer and reject every other option.
 */
import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../types';
import { DATA_TYPES, SOURCE_SCENARIOS, SOURCES, STRUCTURE_SCENARIOS, STRUCTURES, TYPE_SCENARIOS, type Scenario } from './bank';
import game from './index';
import {
  CHIPS,
  fromTypesInstance,
  generateTypesItem,
  parseAnswer,
  planTypesRound,
  scenariosFor,
  SOURCE_OPTIONS,
  STRUCTURE_OPTIONS,
  TYPE_OPTIONS,
  TYPES_KINDS,
  typesItem,
  type TypesKind,
} from './items';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 5);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];
const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };

const BANKS: Record<TypesKind, { scenarios: readonly Scenario<string>[]; values: readonly string[]; options: readonly { value: string; label: string }[] }> = {
  type: { scenarios: TYPE_SCENARIOS, values: DATA_TYPES, options: TYPE_OPTIONS },
  structure: { scenarios: STRUCTURE_SCENARIOS, values: STRUCTURES, options: STRUCTURE_OPTIONS },
  source: { scenarios: SOURCE_SCENARIOS, values: SOURCES, options: SOURCE_OPTIONS },
};

/** Words that would give the answer away if a prompt used them. */
const GIVEAWAYS: Record<TypesKind, RegExp> = {
  type: /\b(integer|floating point|string|character|boolean)\b/i,
  structure: /\b(array|record|two-dimensional|one-dimensional)\b/i,
  source: /\b(csv|xml|plain text|delimited)\b/i,
};

describe('types banks', () => {
  it.each(TYPES_KINDS)('%s: unique ids and prompts, every answer covered at every level', (kind) => {
    const { scenarios, values, options } = BANKS[kind];
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length);
    expect(new Set(scenarios.map((s) => s.prompt)).size).toBe(scenarios.length);
    for (const value of values) expect(scenarios.filter((s) => s.answer === value).length, value).toBeGreaterThanOrEqual(5);
    for (const level of LEVELS) {
      const pool = scenariosFor(kind, level);
      for (const value of values) expect(pool.filter((s) => s.answer === value).length, `${kind} ${value} ${level}`).toBeGreaterThanOrEqual(2);
    }
    for (const s of scenarios) {
      expect(s.prompt, s.id).not.toMatch(GIVEAWAYS[kind]);
      const label = options.find((o) => o.value === s.answer)!.label;
      expect(s.why.toLowerCase(), s.id).toContain(label.toLowerCase());
      expect(s.why, s.id).toMatch(/^[A-Z0-9].*[.]$/);
      expect(`${s.prompt} ${s.why}`, s.id).not.toMatch(/’|\s{2}/);
    }
  });

  it.each(TYPES_KINDS)('%s: every scenario accepts exactly one option at every level', (kind) => {
    const { scenarios, options } = BANKS[kind];
    for (const s of scenarios) {
      for (const level of LEVELS) {
        const item = typesItem({ kind, id: s.id }, level);
        const accepted = options.filter((o) => item.check(o.label).correct);
        expect(accepted.map((o) => o.value), s.id).toEqual([s.answer]);
        for (const o of options) expect(item.check(o.label).counted).not.toBe(false);
        expect(CHIPS[kind].filter((c) => item.check(c).correct)).toHaveLength(1);
        expect(item.check(item.check('?').expected).correct).toBe(true);
        expect(item.check('banana').counted).toBe(false);
        expect(fromTypesInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
  });
});

describe('types answers', () => {
  it('reads data types in full, and asks again for short forms', () => {
    expect(parseAnswer('type', 'Floating point')).toEqual({ value: 'floating' });
    expect(parseAnswer('type', 'floating-point number')).toEqual({ value: 'floating' });
    expect(parseAnswer('type', 'a Boolean')).toEqual({ value: 'boolean' });
    expect(parseAnswer('type', 'String data type')).toEqual({ value: 'string' });
    for (const short of ['int', 'float', 'char', 'bool', 'real', 'text', 'number']) {
      expect(parseAnswer('type', short), short).toEqual({ unparsed: expect.stringMatching(/^Name the data type in full/) });
    }
    expect(parseAnswer('type', '')).toBeNull();
  });

  it('reads structures and sources leniently', () => {
    expect(parseAnswer('structure', '1D array')).toEqual({ value: 'one-d' });
    expect(parseAnswer('structure', 'two dimensional array')).toEqual({ value: 'two-d' });
    expect(parseAnswer('structure', '2-D')).toEqual({ value: 'two-d' });
    expect(parseAnswer('structure', 'a record')).toEqual({ value: 'record' });
    expect(parseAnswer('structure', 'array')).toEqual({ unparsed: expect.stringMatching(/which kind of array/) });
    expect(parseAnswer('structure', 'array of records')).toBeNull();
    expect(parseAnswer('source', 'csv file')).toEqual({ value: 'csv' });
    expect(parseAnswer('source', 'comma-separated values')).toEqual({ value: 'csv' });
    expect(parseAnswer('source', 'Plain text file')).toEqual({ value: 'plain' });
    expect(parseAnswer('source', 'XML')).toEqual({ value: 'xml' });
    expect(parseAnswer('source', 'json')).toBeNull();
  });

  it('adds a note for the commonest wrong choice', () => {
    expect(typesItem({ kind: 'type', id: 'grade' }, 'normal').check('String').reason).toMatch(/Character is the precise choice/);
    expect(typesItem({ kind: 'type', id: 'mobile' }, 'normal').check('Integer').reason).toMatch(/aren't automatically numeric/);
    expect(typesItem({ kind: 'structure', id: 'member' }, 'normal').check('1D array').reason).toMatch(/fields mix types/);
    expect(typesItem({ kind: 'source', id: 'exchange' }, 'normal').check('CSV').reason).toMatch(/position in the line/);
    expect(typesItem({ kind: 'type', id: 'grade' }, 'normal').check('Character').reason).not.toMatch(/precise choice\. /);
  });
});

describe('types rounds', () => {
  it('plans type, structure and source in turn with no scenario repeated', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS.slice(0, 200)) {
        const plan = planTypesRound(seed, level);
        expect(plan.map((p) => p.kind)).toEqual(['type', 'structure', 'source', 'type', 'structure', 'source', 'type', 'structure', 'source', 'type']);
        expect(new Set(plan.map((p) => `${p.kind}:${p.id}`)).size).toBe(10);
        for (const p of plan) expect(scenariosFor(p.kind, level).some((s) => s.id === p.id)).toBe(true);
      }
    }
    expect(planTypesRound(1, 'hard', 40)).toHaveLength(40);
  });

  it.each(LEVELS)('generates items over 500 seeds that accept their expected answer and reject the others (%s)', (level) => {
    const ids = new Set<string>();
    for (const seed of SEEDS) {
      const item = generateTypesItem(seed, level);
      ids.add(item.id);
      expect(generateTypesItem(seed, level).prompt).toEqual(item.prompt);
      const expected = item.check('?').expected;
      expect(item.check(expected).correct).toBe(true);
      expect(item.chips!.filter((c) => item.check(c).correct)).toHaveLength(1);
      expect(fromTypesInstance(item.instance!)?.prompt).toEqual(item.prompt);
    }
    expect([...ids].sort()).toEqual(['gen-types-source', 'gen-types-structure', 'gen-types-type']);
  });

  it('rejects unknown instances', () => {
    expect(fromTypesInstance('types:type:nope:easy')).toBeNull();
    expect(fromTypesInstance('types:colour:grade:easy')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const session = game.start(ctx, { difficulty: level, seed: 21 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('?').expected;
      expect(session.answer(expected).correct).toBe(true);
    }
    const summary = session.summary();
    expect(summary).toMatchObject({ gameId: 'types', score: 10, total: 10 });
    expect(summary.perKk['U4O1-KK02']).toEqual({ correct: 10, total: 10 });
    expect(summary.perKk['U3O1-KK04']).toEqual({ correct: 4, total: 4 });
  });
});
