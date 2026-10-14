/**
 * The reqs game over 500 seeds at every difficulty: the bank is well formed and uses the PSM
 * specifications' qualities and kinds of constraint, every item accepts its statement's own
 * category, quality or kind and rejects every other, and rounds have the mix the man page promises.
 */
import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../types';
import game from './index';
import {
  CATEGORY_CHIPS,
  classifyItem,
  fromReqsInstance,
  generateReqsItem,
  KIND_CHIPS,
  kindItem,
  parseCategory,
  parseConstraintKind,
  parseNfrType,
  planReqsRound,
  reqsItem,
  statementById,
  statementsFor,
  TYPE_CHIPS,
  typeItem,
} from './items';
import { CATEGORIES, CONSTRAINT_KINDS, CORE_CONSTRAINT_KINDS, CORE_NFR_TYPES, NFR_TYPES, ORGANISATIONS, STATEMENTS } from './statements';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 11);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

describe('reqs bank', () => {
  it('has unique ids, known organisations, and a type or kind and its reason for every non-functional statement and constraint', () => {
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
      if (s.category === 'constraint') {
        expect(CONSTRAINT_KINDS, s.id).toContain(s.kind);
        expect(s.kindWhy, s.id).toBeTruthy();
        // The classification's reason doesn't give away the kind asked next.
        expect(s.why, s.id).not.toMatch(/economic|technical|social|legal|usability/i);
      } else {
        expect(s.kind, s.id).toBeUndefined();
      }
    }
  });

  it("uses the PSM specifications' five qualities and five kinds of constraint", () => {
    expect([...NFR_TYPES]).toEqual(['usability', 'reliability', 'portability', 'robustness', 'maintainability']);
    expect([...CONSTRAINT_KINDS]).toEqual(['economic', 'technical', 'social', 'legal', 'usability']);
    // U3O2-KK06 lists four; usability comes from the PSM specifications.
    expect([...CORE_CONSTRAINT_KINDS].sort()).toEqual(['economic', 'legal', 'social', 'technical']);
    expect(TYPE_CHIPS).toEqual([...NFR_TYPES]);
    expect(KIND_CHIPS).toEqual([...CONSTRAINT_KINDS]);
  });

  it('keeps response times and security out, since the PSM lists both among technical constraints', () => {
    for (const s of STATEMENTS) {
      expect(`${s.text} ${s.why} ${s.typeWhy ?? ''} ${s.kindWhy ?? ''}`, s.id).not.toMatch(/secur|second|response time|efficien|speed/i);
    }
  });

  it('keeps reliability and robustness apart: no line about surviving a dropped connection or a power cut, which reads as either', () => {
    for (const s of STATEMENTS.filter((x) => x.category === 'non-functional')) {
      expect(s.text, s.id).not.toMatch(/connection|coverage|signal|wi-?fi|power|offline/i);
    }
    for (const s of STATEMENTS.filter((x) => x.type === 'robustness')) expect(s.typeWhy, s.id).toMatch(/unexpected|cannot use|invalid/);
  });

  it('covers every category and quality in several organisations', () => {
    for (const c of CATEGORIES) expect(new Set(STATEMENTS.filter((s) => s.category === c).map((s) => s.org)).size, c).toBeGreaterThanOrEqual(5);
    for (const t of NFR_TYPES) expect(STATEMENTS.filter((s) => s.type === t).length, t).toBeGreaterThanOrEqual(3);
    for (const k of CONSTRAINT_KINDS) expect(new Set(STATEMENTS.filter((s) => s.kind === k).map((s) => s.org)).size, k).toBeGreaterThanOrEqual(3);
    expect(statementsFor('easy').every((s) => !s.type || CORE_NFR_TYPES.includes(s.type))).toBe(true);
    expect(statementsFor('easy').every((s) => !s.kind || CORE_CONSTRAINT_KINDS.includes(s.kind))).toBe(true);
    expect(statementsFor('normal')).toHaveLength(STATEMENTS.length);
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

  it.each(LEVELS)('kind items accept the right kind of constraint only (%s)', (level) => {
    for (const seed of SEEDS.slice(0, 100)) {
      for (const s of STATEMENTS.filter((x) => x.category === 'constraint')) {
        for (const followUp of [false, true]) {
          const item = kindItem(s.id, seed, level, followUp);
          expect(KIND_CHIPS.filter((c) => item.check(c).correct), s.id).toEqual([s.kind]);
          const expected = item.check('?').expected;
          expect(item.check(expected).correct).toBe(true);
          expect(item.check('political').counted).toBe(false);
          expect(fromReqsInstance(item.instance!)?.prompt).toEqual(item.prompt);
        }
      }
    }
    expect(() => kindItem('library-n1', 1, level)).toThrow();
  });

  it('parses answers leniently', () => {
    expect(parseCategory('Functional requirement')).toBe('functional');
    expect(parseCategory('non functional')).toBe('non-functional');
    expect(parseCategory('NFR')).toBe('non-functional');
    expect(parseCategory("it's a constraint")).toBe('constraint');
    expect(parseCategory('Scope.')).toBe('scope');
    expect(parseCategory('requirement')).toBeNull();
    expect(parseNfrType('Robustness')).toBe('robustness');
    expect(parseNfrType('robust')).toBe('robustness');
    expect(parseNfrType('Ease of use')).toBe('usability');
    expect(parseNfrType('maintainable')).toBe('maintainability');
    expect(parseNfrType('security')).toBeNull();
    expect(parseNfrType('efficiency')).toBeNull();
    expect(parseConstraintKind('an economic constraint')).toBe('economic');
    expect(parseConstraintKind('Time')).toBe('economic');
    expect(parseConstraintKind('technical constraint')).toBe('technical');
    expect(parseConstraintKind('Social')).toBe('social');
    expect(parseConstraintKind('privacy')).toBe('legal');
    expect(parseConstraintKind('accessibility')).toBe('usability');
    expect(parseConstraintKind('political')).toBeNull();
  });

  it('keeps a follow-up short and a standalone type or kind question complete', () => {
    const standalone = typeItem('physio-n2', 3, 'normal');
    const followUp = typeItem('physio-n2', 3, 'normal', true);
    expect(standalone.prompt.map((b) => (b.kind === 'text' ? b.text : '')).join(' ')).toMatch(/Riverbend Physiotherapy.*This is a non-functional requirement/);
    expect(followUp.prompt[0]).toMatchObject({ kind: 'text', text: expect.stringMatching(/^Follow-up on the same statement: /) });
    const kind = kindItem('physio-c2', 3, 'normal');
    expect(kind.prompt.map((b) => (b.kind === 'text' ? b.text : '')).join(' ')).toMatch(/Riverbend Physiotherapy.*This is a constraint/);
    expect(kindItem('physio-c2', 3, 'normal', true).prompt[0]).toMatchObject({ kind: 'text', text: expect.stringMatching(/^Follow-up on the same statement: /) });
  });

  it('adds a line on why the chosen category does not fit', () => {
    const nfr = classifyItem('physio-n1', 1, 'normal');
    expect(nfr.check('constraint').reason).toMatch(/It isn't a constraint: a constraint limits the project from outside/);
    expect(nfr.check('non-functional').reason).not.toMatch(/It isn't/);
    const constraint = classifyItem('physio-c2', 1, 'normal');
    expect(constraint.check('non-functional').reason).toMatch(/It isn't non-functional/);
    // Usability is both a quality and a kind of constraint, so that mix-up says so, either way round.
    expect(classifyItem('library-c3', 1, 'normal').check('non-functional').reason).toMatch(/Usability can be a non-functional requirement too/);
    expect(classifyItem('library-n1', 1, 'normal').check('constraint').reason).toMatch(/Usability can be a constraint too/);
    expect(constraint.check('non-functional').reason).not.toMatch(/Usability can be/);
    expect(classifyItem('physio-n2', 1, 'normal').check('constraint').reason).not.toMatch(/Usability can be/);
    for (const s of STATEMENTS) {
      for (const c of CATEGORY_CHIPS) {
        const r = classifyItem(s.id, 1, 'normal').check(c);
        expect(r.reason.startsWith(s.why)).toBe(true);
        if (!r.correct) expect(r.reason.length).toBeGreaterThan(s.why.length + 20);
      }
    }
  });

  it('contrasts reliability with robustness, and social with usability constraints, when they are mixed up', () => {
    for (const s of STATEMENTS.filter((x) => x.type === 'robustness')) {
      const item = typeItem(s.id, 1, 'normal');
      expect(item.check('reliability').reason, s.id).toMatch(/^.+ Reliability is about working correctly, time after time/);
      expect(item.check('usability').reason, s.id).toBe(s.typeWhy);
    }
    for (const s of STATEMENTS.filter((x) => x.type === 'reliability')) expect(typeItem(s.id, 1, 'normal').check('robustness').reason, s.id).toMatch(/Robustness is about coping with something unexpected/);
    for (const s of STATEMENTS.filter((x) => x.kind === 'social')) {
      expect(kindItem(s.id, 1, 'normal').check('usability').reason, s.id).toMatch(/how much expertise the users have is the social kind/);
      expect(kindItem(s.id, 1, 'normal').check('economic').reason, s.id).toBe(s.kindWhy);
    }
    for (const s of STATEMENTS.filter((x) => x.kind === 'usability')) expect(kindItem(s.id, 1, 'normal').check('social').reason, s.id).toMatch(/accessibility is the usability kind/);
  });

  it('tags each classification with the KK of its answer', () => {
    expect(classifyItem('library-c1', 1, 'normal').kk).toEqual(['U3O2-KK06', 'U3O1-KK02']);
    expect(classifyItem('library-s1', 1, 'normal').kk).toEqual(['U3O2-KK07', 'U3O1-KK02']);
    expect(classifyItem('library-f1', 1, 'normal').kk).toEqual(['U3O2-KK05', 'U3O1-KK02']);
    // The five qualities are the PSM specifications' list.
    expect(typeItem('library-n1', 1, 'normal').kk).toEqual(['U3O2-KK05', 'PSM']);
    expect(kindItem('library-c1', 1, 'normal').kk).toEqual(['U3O2-KK06']);
    expect(kindItem('library-c3', 1, 'normal').kk).toEqual(['U3O2-KK06', 'PSM']);
  });

  it('classes a requirement with a number in it as functional when it names something the solution does', () => {
    // The 2025 examination's trap: reports covering 10 years of data are still functional.
    for (const id of ['freight-f3', 'library-f2', 'physio-f1']) expect(classifyItem(id, 1, 'normal').check('functional').correct, id).toBe(true);
    // Validation is part of what a solution does.
    expect(classifyItem('school-f3', 1, 'normal').check('functional').correct).toBe(true);
  });
});

describe('reqs rounds', () => {
  it.each(LEVELS)('plans seven statements and three follow-ups, on qualities and kinds (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const plan = planReqsRound(seed, level);
      expect(plan).toHaveLength(10);
      const classify = plan.filter((p) => p.kind === 'classify');
      expect(classify).toHaveLength(7);
      expect(new Set(classify.map((p) => p.statement)).size).toBe(7);
      const cats = classify.map((p) => statementById(p.statement).category);
      for (const c of CATEGORIES) expect(cats, `${seed}`).toContain(c);
      expect(plan.filter((p) => p.kind === 'type').length, `${seed}`).toBeGreaterThanOrEqual(1);
      expect(plan.filter((p) => p.kind === 'kind').length, `${seed}`).toBeGreaterThanOrEqual(1);
      plan.forEach((p, i) => {
        if (p.kind !== 'classify') expect(plan[i - 1]).toMatchObject({ kind: 'classify', statement: p.statement });
        if (p.kind === 'type') expect(statementById(p.statement).category).toBe('non-functional');
        if (p.kind === 'kind') expect(statementById(p.statement).category).toBe('constraint');
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
    expect([...ids].sort()).toEqual(['gen-reqs-classify', 'gen-reqs-kind', 'gen-reqs-type']);
    expect(fromReqsInstance('reqs:type:library-c1:seed=1:easy')).toBeNull();
    expect(fromReqsInstance('reqs:kind:library-n1:seed=1:easy')).toBeNull();
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
