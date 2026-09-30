/**
 * Every triage template over 500 seeds at each difficulty: listings are checked by the deskcheck
 * interpreter (syntax cases fail to parse, runtime cases stop with the named error on the stated
 * line, logic cases run and differ from their fix), and every item accepts its own expected
 * answer and rejects the others.
 */
import { describe, expect, it } from 'vitest';
import { parseProgram, PseudoError, run, type PseudoErrorKind } from '../deskcheck/interpreter';
import type { Difficulty } from '../types';
import game from './index';
import {
  classifyItem,
  CLASSIFY_CHIPS,
  fromTriageInstance,
  generateTriageItem,
  parseClassification,
  parseTechnique,
  planTriageRound,
  scenarioFor,
  techniqueItem,
  TECHNIQUE_CHIPS,
  triageItem,
} from './items';
import { runOptions, runtimeError, TEMPLATE_IDS, TEMPLATES, type RuntimeKind } from './scenarios';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 1);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

const INTERPRETER_KIND: Record<RuntimeKind, PseudoErrorKind> = { index: 'index', divide: 'divide-by-zero', type: 'type', overflow: 'overflow' };
const CHIP_FOR: Record<string, string> = { syntax: 'syntax', logic: 'logic', overflow: 'overflow', index: 'index out of range', type: 'type mismatch', divide: 'divide by zero' };

describe('triage scenarios are accurate', () => {
  it.each(LEVELS)('every template, 500 seeds (%s)', (level) => {
    for (const id of TEMPLATE_IDS) {
      const t = TEMPLATES[id];
      for (const seed of SEEDS) {
        const s = scenarioFor(id, seed, level);
        const label = `${id} seed ${seed} ${level}`;
        expect(s.classification.type, label).toBe(t.type);
        expect(s.classification.kind, label).toBe(t.kind);
        expect(Boolean(s.code), label).toBe(t.code);
        expect(s.story.length, label).toBeGreaterThan(20);
        if (!s.code) continue;
        const code = s.code;
        if (t.type === 'syntax') {
          let error: unknown = null;
          try {
            parseProgram(code.source);
          } catch (e) {
            error = e;
          }
          expect(error, label).toBeInstanceOf(PseudoError);
          expect((error as PseudoError).kind, label).toBe('syntax');
          const said = /line (\d+)/.exec(s.story);
          if (said) expect(s.why + s.story, label).toContain(`line ${(error as PseudoError).line}`);
        } else if (t.type === 'runtime') {
          expect(() => parseProgram(code.source), label).not.toThrow();
          const e = runtimeError(code);
          expect(e?.kind, label).toBe(INTERPRETER_KIND[t.kind!]);
          expect(s.story, label).toContain(`line ${e!.line}`);
        } else {
          const broken = run(code.source, runOptions(code)).output;
          const fixed = run(s.fixed!, runOptions(code)).output;
          expect(broken, label).not.toEqual(fixed);
          expect(s.story, label).toContain(broken.join(', '));
          expect(s.story, label).toContain(fixed.join(', '));
        }
      }
    }
  });

  it('covers the cases the brief names', () => {
    // A typo'd keyword is syntax; a wrong comparison operator is logic; reading past the end of a
    // zero-based array is index out of range at runtime.
    const typo = scenarioFor('misspelt-keyword', 1, 'normal');
    expect(typo.classification).toEqual({ type: 'syntax' });
    const operator = scenarioFor('wrong-comparison', 1, 'normal');
    expect(operator.classification).toEqual({ type: 'logic' });
    expect(operator.code!.source).toMatch(/IF mark > \d+ THEN/);
    let pastEnd = 1;
    while (scenarioFor('index-past-end', pastEnd, 'normal').code!.indexBase !== 0) pastEnd++;
    const index = scenarioFor('index-past-end', pastEnd, 'normal');
    expect(index.classification).toEqual({ type: 'runtime', kind: 'index' });
    expect(index.why).toMatch(/indexed 0 to (\d+), but the loop reaches marks\[(\d+)\]/);
  });
});

describe('triage items', () => {
  it.each(LEVELS)('classification items accept the right answer and reject every other (%s, 500 seeds)', (level) => {
    for (const id of TEMPLATE_IDS) {
      for (const seed of SEEDS) {
        const item = classifyItem(id, seed, level);
        const s = scenarioFor(id, seed, level);
        const want = s.classification.kind ?? s.classification.type;
        expect(item.check(CHIP_FOR[want]).correct, `${id} ${seed}`).toBe(true);
        expect(item.check(item.check('?').expected).correct).toBe(true);
        for (const chip of CLASSIFY_CHIPS) {
          if (chip !== CHIP_FOR[want]) {
            const r = item.check(chip);
            expect(r.correct).toBe(false);
            expect(r.counted).not.toBe(false);
          }
        }
        expect(item.check('runtime').counted).toBe(false);
        expect(item.check('banana').counted).toBe(false);
        expect(fromTriageInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
  });

  it.each(LEVELS)('technique items accept the right technique only (%s, 500 seeds)', (level) => {
    for (const id of TEMPLATE_IDS) {
      for (const seed of SEEDS) {
        const item = techniqueItem(id, seed, level);
        const expected = item.check('?').expected;
        expect(item.check(expected).correct, `${id} ${seed}`).toBe(true);
        expect(TECHNIQUE_CHIPS.filter((c) => item.check(c).correct)).toHaveLength(1);
        expect(item.check('restart the computer').counted).toBe(false);
        expect(fromTriageInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
  });

  it('states the index base whenever a listing uses an array', () => {
    for (const id of TEMPLATE_IDS.filter((t) => TEMPLATES[t].code)) {
      for (const seed of SEEDS.slice(0, 100)) {
        const item = classifyItem(id, seed, 'normal');
        const block = item.prompt.find((b) => b.kind === 'pseudo');
        if (block?.kind === 'pseudo' && block.code.includes('[')) expect([0, 1]).toContain(block.indexBase);
      }
    }
  });

  it('parses classifications leniently', () => {
    expect(parseClassification('Logic error.')).toEqual({ type: 'logic' });
    expect(parseClassification('logical')).toEqual({ type: 'logic' });
    expect(parseClassification('SYNTAX')).toEqual({ type: 'syntax' });
    expect(parseClassification('runtime: divide by zero')).toEqual({ type: 'runtime', kind: 'divide' });
    expect(parseClassification('Run-time error (index out of range)')).toEqual({ type: 'runtime', kind: 'index' });
    expect(parseClassification('division by zero')).toEqual({ type: 'runtime', kind: 'divide' });
    expect(parseClassification('type mismatch')).toEqual({ type: 'runtime', kind: 'type' });
    expect(parseClassification('an overflow error')).toEqual({ type: 'runtime', kind: 'overflow' });
    expect(parseClassification('out of bounds')).toEqual({ type: 'runtime', kind: 'index' });
    expect(parseClassification('runtime error')).toBe('runtime');
    expect(parseClassification('runtime logic')).toBeNull();
    expect(parseClassification('compile')).toBeNull();
    expect(parseClassification('')).toBeNull();
  });

  it('parses techniques leniently', () => {
    expect(parseTechnique('Breakpoint')).toBe('breakpoint');
    expect(parseTechnique('set a breakpoint')).toBe('breakpoint');
    expect(parseTechnique('debug output')).toBe('output');
    expect(parseTechnique('print statements')).toBe('output');
    expect(parseTechnique('comment out')).toBe('comment');
    expect(parseTechnique('commenting-out code')).toBe('comment');
    expect(parseTechnique('rewrite it')).toBeNull();
  });

  it('keeps a follow-up short, and a standalone technique question complete', () => {
    const standalone = techniqueItem('divide-by-zero', 4, 'normal');
    const followUp = techniqueItem('divide-by-zero', 4, 'normal', true);
    expect(standalone.prompt.some((b) => b.kind === 'pseudo')).toBe(true);
    expect(followUp.prompt.some((b) => b.kind === 'pseudo')).toBe(false);
    expect(followUp.prompt[0]).toMatchObject({ kind: 'text', text: expect.stringMatching(/^Follow-up on the same case: /) });
    expect(followUp.check('commenting out code').correct).toBe(standalone.check('commenting out code').correct);
  });

  it('offers chips for every answer', () => {
    expect(classifyItem('overflow', 3, 'normal').chips).toEqual(CLASSIFY_CHIPS);
    expect(techniqueItem('overflow', 3, 'normal').chips).toEqual(['breakpoint', 'debugging output statement', 'commenting out code']);
  });
});

describe('triage rounds', () => {
  it('plans six cases, four with a follow-up straight after, covering every type', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS.slice(0, 200)) {
        const plan = planTriageRound(seed, level);
        expect(plan).toHaveLength(10);
        expect(plan.filter((p) => p.kind === 'classify')).toHaveLength(6);
        plan.forEach((p, i) => {
          if (p.kind === 'technique') {
            expect(p.followUp).toBe(true);
            expect(plan[i - 1]).toEqual({ kind: 'classify', template: p.template, seed: p.seed });
          }
        });
        const types = plan.filter((p) => p.kind === 'classify').map((p) => TEMPLATES[p.template].type);
        expect(types.filter((t) => t === 'syntax').length).toBeGreaterThanOrEqual(1);
        expect(types.filter((t) => t === 'logic').length).toBeGreaterThanOrEqual(2);
        expect(types.filter((t) => t === 'runtime').length).toBeGreaterThanOrEqual(2);
        const templates = plan.filter((p) => p.kind === 'classify').map((p) => p.template);
        expect(new Set(templates).size).toBe(6);
        if (seed < 20) {
          for (const p of plan) {
            const item = triageItem(p, level);
            expect(fromTriageInstance(item.instance!)?.prompt).toEqual(item.prompt);
          }
        }
      }
    }
  });

  it('generates standalone items deterministically', () => {
    const ids = new Set<string>();
    for (const seed of SEEDS.slice(0, 200)) {
      for (const level of LEVELS) {
        const item = generateTriageItem(seed, level);
        ids.add(item.id);
        expect(generateTriageItem(seed, level).prompt).toEqual(item.prompt);
        expect(fromTriageInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
    expect([...ids].sort()).toEqual(['gen-triage-classify', 'gen-triage-technique']);
    expect(fromTriageInstance('triage:classify:nope:seed=1:easy')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };
    const session = game.start(ctx, { difficulty: level, seed: 5 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('???').expected;
      expect(session.answer(expected).correct).toBe(true);
    }
    const summary = session.summary();
    expect(summary).toMatchObject({ gameId: 'triage', score: 10, total: 10 });
    expect(summary.perKk['U3O1-KK13']).toEqual({ correct: 6, total: 6 });
  });
});
