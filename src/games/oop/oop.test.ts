/**
 * oop: every scenario in the fixed banks accepts exactly one answer at every level and doesn't give
 * it away; every object description gap blanks exactly one row of a valid figure, and its options
 * hold exactly one member that belongs there; generated items over 500 seeds at each difficulty
 * accept their own expected answer and reject the rest.
 */
import { describe, expect, it } from 'vitest';
import { ObjectDescriptionSchema } from '../../content/schema';
import { TYPE_OPTIONS } from '../types-game/items';
import type { Difficulty } from '../types';
import { ACCESS_SCENARIOS, MODIFIERS, OBJECTS, PRINCIPLE_SCENARIOS, PRINCIPLES } from './bank';
import game from './index';
import {
  ACCESS_CHIPS,
  accessFor,
  accessItem,
  blankedFigure,
  fromOopInstance,
  gapKeys,
  generateOopItem,
  memberOptions,
  objectItem,
  parseModifier,
  parsePrinciple,
  planOopRound,
  PRINCIPLE_CHIPS,
  principleItem,
  principlesFor,
} from './items';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 7);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];
const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

describe('oop banks', () => {
  it('has unique scenarios covering every principle and modifier at every level', () => {
    for (const bank of [PRINCIPLE_SCENARIOS, ACCESS_SCENARIOS]) {
      expect(new Set(bank.map((s) => s.id)).size).toBe(bank.length);
      expect(new Set(bank.map((s) => s.prompt)).size).toBe(bank.length);
    }
    for (const p of PRINCIPLES) expect(PRINCIPLE_SCENARIOS.filter((s) => s.answer === p).length).toBeGreaterThanOrEqual(5);
    for (const m of MODIFIERS) expect(ACCESS_SCENARIOS.filter((s) => s.answer === m).length).toBeGreaterThanOrEqual(3);
    for (const level of LEVELS) {
      for (const p of PRINCIPLES) expect(principlesFor(level).some((s) => s.answer === p), `${p} ${level}`).toBe(true);
      for (const m of MODIFIERS) expect(accessFor(level).some((s) => s.answer === m), `${m} ${level}`).toBe(true);
    }
  });

  it("never gives the answer away in a prompt, and keeps Java-only rules to questions that name Java", () => {
    for (const s of PRINCIPLE_SCENARIOS) expect(s.prompt, s.id).not.toMatch(/\b(abstract\w*|encapsulat\w*|generali[sz]\w*|inherit\w*)\b/i);
    for (const s of ACCESS_SCENARIOS) {
      expect(s.prompt, s.id).not.toMatch(/\b(public|private|protected|default)\b/i);
      expect(s.prompt, s.id).toMatch(/\?$/);
      if (s.answer === 'protected') expect(`${s.prompt} ${s.why}`, s.id).not.toMatch(/Java|package/);
      if (/package/.test(s.prompt)) expect(s.prompt, s.id).toMatch(/^The program is written in Java\./);
    }
    for (const s of [...PRINCIPLE_SCENARIOS, ...ACCESS_SCENARIOS]) {
      expect(s.why.toLowerCase(), s.id).toContain(s.answer);
      expect(`${s.prompt} ${s.why}`, s.id).not.toMatch(/’/);
    }
  });

  it.each(LEVELS)('principle and access items accept exactly one answer (%s)', (level) => {
    for (const s of PRINCIPLE_SCENARIOS) {
      const item = principleItem(s.id, level);
      expect(PRINCIPLE_CHIPS.filter((c) => item.check(c).correct), s.id).toEqual([s.answer]);
      for (const c of PRINCIPLE_CHIPS) expect(item.check(c).counted).not.toBe(false);
      expect(item.check(item.check('?').expected).correct).toBe(true);
      expect(item.check('polymorphism').counted).toBe(false);
      expect(fromOopInstance(item.instance!)?.prompt).toEqual(item.prompt);
    }
    for (const s of ACCESS_SCENARIOS) {
      const item = accessItem(s.id, level);
      expect(ACCESS_CHIPS.filter((c) => item.check(c).correct), s.id).toEqual([s.answer]);
      for (const c of ACCESS_CHIPS) expect(item.check(c).counted).not.toBe(false);
      expect(item.check(item.check('?').expected).correct).toBe(true);
      expect(item.check('internal').counted).toBe(false);
      expect(fromOopInstance(item.instance!)?.prompt).toEqual(item.prompt);
      const question = item.prompt.find((b) => b.kind === 'text' && b.tone === 'accent');
      expect(question?.kind === 'text' && question.text).toMatch(/^(Which|What) .*\?$/);
    }
  });

  it('parses principles and modifiers leniently', () => {
    expect(parsePrinciple('Generalization')).toBe('generalisation');
    expect(parsePrinciple('inherit')).toBe('inheritance');
    expect(parsePrinciple('the encapsulation principle')).toBeNull();
    expect(parsePrinciple('encapsulation principle')).toBe('encapsulation');
    expect(parseModifier('Protected')).toBe('protected');
    expect(parseModifier('package-private')).toBe('default');
    expect(parseModifier('no modifier')).toBe('default');
    expect(parseModifier('private access modifier')).toBe('private');
    expect(parseModifier('friend')).toBeNull();
  });

  it('explains the classic confusions', () => {
    expect(principleItem('vehicle-super', 'normal').check('inheritance').reason).toMatch(/creating the superclass/);
    expect(principleItem('truck-sub', 'normal').check('generalisation').reason).toMatch(/subclass is receiving/);
    expect(principleItem('patient-details', 'normal').check('encapsulation').reason).toMatch(/which details are modelled/);
    expect(accessItem('odometer', 'normal').check('private').reason).toMatch(/hide it from the subclasses too/);
    expect(accessItem('java-package-method', 'hard').check('protected').reason).toMatch(/subclasses in other packages/);
  });
});

describe('oop object descriptions', () => {
  it('describes every object validly, with gaps that point at real rows', () => {
    expect(new Set(OBJECTS.map((o) => o.id)).size).toBe(OBJECTS.length);
    const types = TYPE_OPTIONS.map((o) => o.label);
    for (const obj of OBJECTS) {
      for (const p of obj.properties) expect(types, `${obj.id}.${p.name}`).toContain(p.type);
      for (const m of obj.methods) expect(m).toMatch(/^[a-z][A-Za-z]*\(\)$/);
      for (const name of obj.typeGaps) expect(obj.properties.some((p) => p.name === name)).toBe(true);
      expect(obj.memberGaps.map((g) => g.kind).sort()).toEqual(['method', 'property']);
      for (const g of obj.memberGaps) {
        if (g.kind === 'method') expect(obj.methods).toContain(g.answer);
        else expect(obj.properties.some((p) => `${p.name}: ${p.type}` === g.answer)).toBe(true);
        expect(new Set([g.answer, ...g.distractors]).size).toBe(4);
        // No distractor is a row the figure still shows, so only the answer can belong in the blank.
        const shown = [...obj.properties.map((p) => `${p.name}: ${p.type}`), ...obj.methods].filter((r) => r !== g.answer);
        for (const d of g.distractors) expect(shown, `${obj.id} ${g.id} ${d}`).not.toContain(d);
        // A method gap offers at least one property-shaped option; a property gap offers a method.
        const methodShaped = g.distractors.filter((d) => d.endsWith('()'));
        expect(methodShaped.length, `${obj.id} ${g.id}`).toBeGreaterThanOrEqual(1);
        if (g.kind === 'method') expect(methodShaped.length).toBeLessThan(3);
      }
      for (const gap of gapKeys(obj)) {
        const figure = blankedFigure(obj, gap);
        expect(() => ObjectDescriptionSchema.parse(figure)).not.toThrow();
        const blanks = [...figure.properties.filter((p) => p.name === '?' || p.type === '?'), ...figure.methods.filter((m) => m.name === '?')];
        expect(blanks, `${obj.id} ${gap}`).toHaveLength(1);
        expect(figure.properties.length).toBe(obj.properties.length);
        expect(figure.methods.length).toBe(obj.methods.length);
      }
    }
  });

  it.each(LEVELS)('every gap accepts exactly one answer over 500 seeds (%s)', (level) => {
    for (const obj of OBJECTS) {
      for (const gap of gapKeys(obj)) {
        for (const seed of SEEDS) {
          const item = objectItem(obj.id, gap, seed, level);
          const expected = item.check('?').expected;
          expect(item.check(expected).correct, `${obj.id} ${gap} ${seed}`).toBe(true);
          expect(item.prompt[0].kind).toBe('figure');
          if (gap.startsWith('type-')) {
            const accepted = TYPE_OPTIONS.filter((o) => item.check(o.label).correct);
            expect(accepted).toHaveLength(1);
            expect(item.check('int').counted).toBe(false);
          } else {
            const options = memberOptions(obj.memberGaps.find((g) => `member-${g.id}` === gap)!, seed, level);
            expect(options).toHaveLength(level === 'easy' ? 3 : 4);
            const accepted = LETTERS.slice(0, options.length).filter((l) => item.check(l).correct);
            expect(accepted).toHaveLength(1);
            expect(item.check(LETTERS[options.length]).counted).toBe(false);
            expect(item.chips).toEqual(LETTERS.slice(0, options.length));
          }
          expect(item.check('banana').counted).toBe(false);
          expect(fromOopInstance(item.instance!)?.prompt).toEqual(item.prompt);
        }
      }
    }
  });

  it('moves the answer around the options', () => {
    const gap = OBJECTS[0].memberGaps[0];
    const positions = new Set(SEEDS.slice(0, 100).map((seed) => memberOptions(gap, seed, 'normal').indexOf(gap.answer)));
    expect(positions.size).toBe(4);
  });
});

describe('oop rounds', () => {
  it('plans four principles, three objects and three access modifiers, well spread', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS.slice(0, 200)) {
        const plan = planOopRound(seed, level);
        expect(plan).toHaveLength(10);
        const principles = plan.flatMap((p) => (p.kind === 'principle' ? [PRINCIPLE_SCENARIOS.find((s) => s.id === p.id)!] : []));
        const access = plan.flatMap((p) => (p.kind === 'access' ? [ACCESS_SCENARIOS.find((s) => s.id === p.id)!] : []));
        const objects = plan.flatMap((p) => (p.kind === 'object' ? [p] : []));
        expect(principles).toHaveLength(4);
        expect(new Set(principles.map((s) => s.answer)).size).toBe(4);
        expect(new Set(principles.map((s) => s.id)).size).toBe(4);
        expect(access).toHaveLength(3);
        expect(new Set(access.map((s) => s.answer)).size).toBe(3);
        expect(objects).toHaveLength(3);
        expect(new Set(objects.map((o) => o.object)).size).toBe(3);
        expect(objects.some((o) => o.gap.startsWith('type-'))).toBe(true);
        expect(objects.some((o) => o.gap.startsWith('member-'))).toBe(true);
      }
    }
    expect(planOopRound(2, 'normal', 25)).toHaveLength(25);
  });

  it.each(LEVELS)('generates standalone items over 500 seeds (%s)', (level) => {
    const ids = new Set<string>();
    for (const seed of SEEDS) {
      const item = generateOopItem(seed, level);
      ids.add(item.id);
      expect(generateOopItem(seed, level).prompt).toEqual(item.prompt);
      expect(item.check(item.check('?').expected).correct).toBe(true);
      expect(item.chips!.filter((c) => item.check(c).correct)).toHaveLength(1);
      expect(fromOopInstance(item.instance!)?.prompt).toEqual(item.prompt);
    }
    expect([...ids].sort()).toEqual(['gen-oop-access', 'gen-oop-object', 'gen-oop-principle']);
  });

  it('rejects unknown instances', () => {
    expect(fromOopInstance('oop:principle:nope:easy')).toBeNull();
    expect(fromOopInstance('oop:object:booking:type-nope:seed=1:easy')).toBeNull();
    expect(fromOopInstance('oop:object:spaceship:member-total:seed=1:easy')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const session = game.start(ctx, { difficulty: level, seed: 13 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('?').expected;
      expect(session.answer(expected).correct).toBe(true);
    }
    const summary = session.summary();
    expect(summary).toMatchObject({ gameId: 'oop', score: 10, total: 10 });
    expect(summary.perKk['U3O1-KK07']).toEqual({ correct: 10, total: 10 });
    expect(summary.perKk['U3O1-KK03']).toEqual({ correct: 3, total: 3 });
  });
});
