/**
 * The reqs game over 500 seeds at every difficulty: the bank is well formed, every item accepts
 * its statement's own category or quality and rejects every other, and rounds have the mix the
 * man page promises.
 */
import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../types';
import game from './index';
import {
  CATEGORY_CHIPS,
  classifyItem,
  fromReqsInstance,
  generateReqsItem,
  parseCategory,
  parseNfrType,
  planReqsRound,
  reqsItem,
  statementById,
  statementsFor,
  TYPE_CHIPS,
  typeItem,
} from './items';
import { CATEGORIES, CORE_NFR_TYPES, NFR_TYPES, ORGANISATIONS, STATEMENTS } from './statements';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 11);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

describe('reqs bank', () => {
  it('has unique ids, known organisations, and a type and reason for every non-functional statement', () => {
    expect(new Set(STATEMENTS.map((s) => s.id)).size).toBe(STATEMENTS.length);
    expect(new Set(STATEMENTS.map((s) => s.text)).size).toBe(STATEMENTS.length);
    for (const s of STATEMENTS) {
      expect(ORGANISATIONS.some((o) => o.id === s.org), s.id).toBe(true);
      expect(s.id.startsWith(`${s.org}-`), s.id).toBe(true);
      expect(s.why.length, s.id).toBeGreaterThan(30);
      expect(s.text).toMatch(/^[A-Z].*\.$/);
      if (s.category === 'non-functional') {
        expect(NFR_TYPES, s.id).toContain(s.type);
        expect(s.typeWhy, s.id).toBeTruthy();
      } else {
        expect(s.type, s.id).toBeUndefined();
      }
    }
  });

  it('covers every category and quality in several organisations', () => {
    for (const c of CATEGORIES) expect(new Set(STATEMENTS.filter((s) => s.category === c).map((s) => s.org)).size, c).toBeGreaterThanOrEqual(5);
    for (const t of NFR_TYPES) expect(STATEMENTS.filter((s) => s.type === t).length, t).toBeGreaterThanOrEqual(3);
    expect(statementsFor('easy').every((s) => !s.type || CORE_NFR_TYPES.includes(s.type))).toBe(true);
  });

  it('never names security as a quality', () => {
    for (const s of STATEMENTS) expect(`${s.text} ${s.why} ${s.typeWhy ?? ''}`).not.toMatch(/secur/i);
  });

  it('teaches the constraint versus non-functional difference in the reasons', () => {
    for (const s of STATEMENTS.filter((x) => x.category === 'constraint')) expect(s.why, s.id).toMatch(/limit/);
    for (const s of STATEMENTS.filter((x) => x.category === 'non-functional')) expect(s.why, s.id).toMatch(/quality|how well/);
  });
});

describe('reqs items', () => {
  it.each(LEVELS)('classification items accept the right category and reject the others (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      for (const s of STATEMENTS) {
        if (seed % 25 !== 0 && s.id.endsWith('2')) continue; // Every statement, a sample of seeds for the second ones.
        const item = classifyItem(s.id, seed, level);
        const right = CATEGORY_CHIPS.filter((c) => item.check(c).correct);
        expect(right, s.id).toEqual([s.category]);
        const expected = item.check('?').expected;
        expect(item.check(expected).correct).toBe(true);
        expect(item.check('?').counted).toBe(false);
        for (const c of CATEGORY_CHIPS) expect(item.check(c).counted).not.toBe(false);
        expect(fromReqsInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
  });

  it.each(LEVELS)('type items accept the right quality only (%s)', (level) => {
    for (const seed of SEEDS.slice(0, 100)) {
      for (const s of STATEMENTS.filter((x) => x.category === 'non-functional')) {
        for (const followUp of [false, true]) {
          const item = typeItem(s.id, seed, level, followUp);
          expect(TYPE_CHIPS.filter((c) => item.check(c).correct), s.id).toEqual([s.type]);
          const expected = item.check('?').expected;
          expect(item.check(expected).correct).toBe(true);
          expect(item.check('security').counted).toBe(false);
          expect(fromReqsInstance(item.instance!)?.prompt).toEqual(item.prompt);
        }
      }
    }
    expect(() => typeItem('library-c1', 1, level)).toThrow();
  });

  it('parses answers leniently', () => {
    expect(parseCategory('Functional requirement')).toBe('functional');
    expect(parseCategory('non functional')).toBe('non-functional');
    expect(parseCategory('NFR')).toBe('non-functional');
    expect(parseCategory("it's a constraint")).toBe('constraint');
    expect(parseCategory('Scope.')).toBe('scope');
    expect(parseCategory('requirement')).toBeNull();
    expect(parseNfrType('Efficiency (response time)')).toBe('efficiency');
    expect(parseNfrType('response time')).toBe('efficiency');
    expect(parseNfrType('Ease of use')).toBe('usability');
    expect(parseNfrType('maintainable')).toBe('maintainability');
    expect(parseNfrType('security')).toBeNull();
  });

  it('keeps a follow-up short and a standalone type question complete', () => {
    const standalone = typeItem('physio-n2', 3, 'normal');
    const followUp = typeItem('physio-n2', 3, 'normal', true);
    expect(standalone.prompt.map((b) => (b.kind === 'text' ? b.text : '')).join(' ')).toMatch(/Riverbend Physiotherapy.*This is a non-functional requirement/);
    expect(followUp.prompt[0]).toMatchObject({ kind: 'text', text: expect.stringMatching(/^Follow-up on the same statement: /) });
  });

  it('adds a line on why the chosen category does not fit', () => {
    const nfr = classifyItem('physio-n1', 1, 'normal');
    expect(nfr.check('constraint').reason).toMatch(/It isn't a constraint: a constraint limits the project from outside/);
    expect(nfr.check('non-functional').reason).not.toMatch(/It isn't/);
    const constraint = classifyItem('physio-c2', 1, 'normal');
    expect(constraint.check('non-functional').reason).toMatch(/It isn't non-functional/);
    for (const s of STATEMENTS) {
      for (const c of CATEGORY_CHIPS) {
        const r = classifyItem(s.id, 1, 'normal').check(c);
        expect(r.reason.startsWith(s.why)).toBe(true);
        if (!r.correct) expect(r.reason.length).toBeGreaterThan(s.why.length + 20);
      }
    }
  });

  it('tags each classification with the KK of its answer', () => {
    expect(classifyItem('library-c1', 1, 'normal').kk).toEqual(['U3O2-KK06', 'U3O1-KK02']);
    expect(classifyItem('library-s1', 1, 'normal').kk).toEqual(['U3O2-KK07', 'U3O1-KK02']);
    expect(classifyItem('library-f1', 1, 'normal').kk).toEqual(['U3O2-KK05', 'U3O1-KK02']);
    expect(typeItem('library-n1', 1, 'normal').kk).toEqual(['U3O2-KK05']);
  });
});

describe('reqs rounds', () => {
  it.each(LEVELS)('plans seven statements and three follow-ups (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const plan = planReqsRound(seed, level);
      expect(plan).toHaveLength(10);
      const classify = plan.filter((p) => p.kind === 'classify');
      expect(classify).toHaveLength(7);
      expect(new Set(classify.map((p) => p.statement)).size).toBe(7);
      const cats = classify.map((p) => statementById(p.statement).category);
      for (const c of CATEGORIES) expect(cats, `${seed}`).toContain(c);
      plan.forEach((p, i) => {
        if (p.kind === 'type') expect(plan[i - 1]).toMatchObject({ kind: 'classify', statement: p.statement });
        const item = reqsItem(p, level);
        const expected = item.check('?').expected;
        expect(item.check(expected).correct, item.instance).toBe(true);
        const chips = item.chips ?? [];
        expect(chips.filter((c) => item.check(c).correct), item.instance).toHaveLength(1);
        if (seed < 200) expect(fromReqsInstance(item.instance!)?.prompt).toEqual(item.prompt);
      });
      if (level === 'easy') expect(classify.every((p) => statementsFor('easy').some((s) => s.id === p.statement))).toBe(true);
    }
  });

  it('generates standalone items deterministically', () => {
    const ids = new Set<string>();
    for (const seed of SEEDS.slice(0, 200)) {
      for (const level of LEVELS) {
        const item = generateReqsItem(seed, level);
        ids.add(item.id);
        expect(generateReqsItem(seed, level).prompt).toEqual(item.prompt);
        expect(fromReqsInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
    expect([...ids].sort()).toEqual(['gen-reqs-classify', 'gen-reqs-type']);
    expect(fromReqsInstance('reqs:type:library-c1:seed=1:easy')).toBeNull();
    expect(fromReqsInstance('reqs:classify:nope-x1:seed=1:easy')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };
    const session = game.start(ctx, { difficulty: level, seed: 2 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('???').expected;
      expect(session.answer(expected).correct).toBe(true);
    }
    expect(session.summary()).toMatchObject({ gameId: 'reqs', score: 10, total: 10 });
  });
});
