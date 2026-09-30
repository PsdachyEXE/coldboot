/**
 * naming over 500 seeds at each difficulty: every identifier shown is read back by an independent
 * shape classifier, every item accepts its own expected answer and exactly the right convention,
 * and every rewrite rejects the same words in any other convention or with the wrong capitals.
 */
import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../types';
import { CONTROLS, PHRASES, VARIABLES } from './bank';
import { classify, CONTROL_PREFIXES, hungarianPrefix, toCamel, toHungarian, VARIABLE_PREFIXES, write, type Shape } from './conventions';
import game from './index';
import {
  diagnoseRewrite,
  fromNamingInstance,
  generateNamingItem,
  identifyCase,
  identifyItem,
  LOOKALIKES,
  namingItem,
  parseConvention,
  phrasesFor,
  planNamingRound,
  REWRITE_TASKS,
  rewriteCase,
  rewriteItem,
  SHAPES,
} from './items';
import { NAMING_MAN } from './meta';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 3);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];
const CONVENTION_ANSWERS = ['camel case', 'snake case', 'Hungarian notation', 'none', 'Pascal case', 'kebab case'];
const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };

describe('naming conventions', () => {
  it('writes and reads back every phrase in every shape', () => {
    const shapes: Shape[] = ['camel', 'snake', 'pascal', 'kebab', 'title-snake'];
    for (const words of PHRASES) {
      expect(words.length).toBeGreaterThanOrEqual(2);
      for (const w of words) expect(w).toMatch(/^[a-z]+$/);
      for (const shape of shapes) expect(classify(write(shape, words)), `${words.join(' ')} ${shape}`).toBe(shape);
    }
    expect(write('camel', ['date', 'of', 'birth'])).toBe('dateOfBirth');
    expect(write('snake', ['date', 'of', 'birth'])).toBe('date_of_birth');
    expect(write('pascal', ['total', 'cost'])).toBe('TotalCost');
    expect(write('kebab', ['total', 'cost'])).toBe('total-cost');
    expect(write('title-snake', ['total', 'cost'])).toBe('Total_Cost');
  });

  it('names every variable and control with its prefix, read back as Hungarian notation', () => {
    for (const entry of [...VARIABLES, ...CONTROLS]) {
      const id = toHungarian(entry.prefix, entry.words);
      expect(classify(id), id).toBe('hungarian');
      expect(hungarianPrefix(id)).toBe(entry.prefix);
      // The words alone in camel case must not look like Hungarian notation.
      if (entry.words.length > 1) expect(classify(toCamel(entry.words))).toBe('camel');
    }
    expect(toHungarian('chk', ['accept', 'terms'])).toBe('chkAcceptTerms');
    expect(toHungarian('str', ['first', 'name'])).toBe('strFirstName');
    // A camel case name that merely starts with the letters of a prefix is still camel case.
    expect(classify('intervalLength')).toBe('camel');
    expect(classify('strSurname')).toBe('hungarian');
    expect(classify('total')).toBeNull();
    expect(classify('TOTAL_COST')).toBeNull();
  });

  it('uses every prefix in the table, and only those', () => {
    const variables = new Set(VARIABLES.map((v) => v.prefix));
    const controls = new Set(CONTROLS.map((c) => c.prefix));
    expect([...variables].sort()).toEqual(VARIABLE_PREFIXES.map((p) => p.prefix).sort());
    expect([...controls].sort()).toEqual(CONTROL_PREFIXES.map((p) => p.prefix).sort());
    for (const p of [...VARIABLE_PREFIXES, ...CONTROL_PREFIXES]) expect(NAMING_MAN).toContain(`${p.prefix} ${p.label}`);
  });

  it('keeps phrases unique and offers enough at every level', () => {
    expect(new Set(PHRASES.map((p) => p.join(' '))).size).toBe(PHRASES.length);
    for (const level of LEVELS) expect(phrasesFor(level).length).toBeGreaterThanOrEqual(10);
  });
});

describe('naming identify items', () => {
  it.each(LEVELS)('show an identifier of the stated shape and accept exactly the right answer (%s, 500 seeds)', (level) => {
    const shapes = SHAPES.filter((s) => !['pascal', 'kebab', 'title-snake'].includes(s) || (LOOKALIKES[level] as readonly string[]).includes(s));
    for (const shape of shapes) {
      for (const seed of SEEDS) {
        const c = identifyCase(shape, seed, level);
        expect(classify(c.identifier), `${shape} ${seed}`).toBe(shape);
        const item = identifyItem(shape, seed, level);
        const expected = item.check('?').expected;
        expect(item.check(expected).correct).toBe(true);
        const accepted = CONVENTION_ANSWERS.filter((a) => item.check(a).correct);
        if (shape === 'camel' || shape === 'snake' || shape === 'hungarian') {
          expect(accepted).toHaveLength(1);
        } else {
          // A lookalike is "none"; naming the lookalike itself also counts.
          expect(accepted.includes('none')).toBe(true);
          expect(accepted.filter((a) => a !== 'none').every((a) => a.toLowerCase().startsWith(shape === 'title-snake' ? '-' : shape))).toBe(true);
        }
        for (const a of CONVENTION_ANSWERS) expect(item.check(a).counted).not.toBe(false);
        expect(item.check('banana').counted).toBe(false);
        expect(fromNamingInstance(item.instance!)?.prompt).toEqual(item.prompt);
        expect(item.prompt.some((b) => b.kind === 'table' && b.rows.length === 2)).toBe(true);
      }
    }
  });

  it('parses convention names leniently', () => {
    expect(parseConvention('Camel Case')).toBe('camel');
    expect(parseConvention('camelCase')).toBe('camel');
    expect(parseConvention('snake_case')).toBe('snake');
    expect(parseConvention('hungarian')).toBe('hungarian');
    expect(parseConvention('None of the three (Pascal case)')).toBe('none');
    expect(parseConvention('neither')).toBe('none');
    expect(parseConvention('upper camel case')).toBe('pascal');
    expect(parseConvention('kebab-case')).toBe('kebab');
    expect(parseConvention('screaming')).toBeNull();
  });

  it('counts Pascal case as none of the three, never as camel case', () => {
    const item = identifyItem('pascal', 11, 'normal');
    expect(item.check('camel case').correct).toBe(false);
    expect(item.check('none').correct).toBe(true);
    expect(item.check('Pascal case').correct).toBe(true);
    expect(item.check('kebab case').correct).toBe(false);
    expect(item.check('?').expected).toBe('None of the three (Pascal case)');
  });
});

describe('naming rewrite items', () => {
  it.each(LEVELS)('accept only the exact identifier (%s, 500 seeds)', (level) => {
    for (const task of REWRITE_TASKS) {
      for (const seed of SEEDS) {
        const c = rewriteCase(task, seed, level);
        const item = rewriteItem(task, seed, level);
        const label = `${task} ${seed} ${level}`;
        expect(classify(c.expected), label).toBe(c.target);
        if (c.target === 'hungarian') expect(hungarianPrefix(c.expected), label).toBe(c.prefix);
        if (c.source) {
          expect(classify(c.source.identifier), label).toBe(c.source.shape);
          expect(c.source.identifier).not.toBe(c.expected);
        }
        expect(item.check(c.expected).correct, label).toBe(true);
        expect(item.check(` \`${c.expected}\` `).correct, label).toBe(true);
        expect(item.check('?').expected).toBe(c.expected);
        const wrong = new Set<string>([
          ...(['camel', 'snake', 'pascal', 'kebab', 'title-snake'] as const).map((s) => write(s, c.words)),
          c.expected.toLowerCase(),
          c.expected.toUpperCase(),
          c.words.join(' '),
          c.expected.charAt(0).toUpperCase() + c.expected.slice(1),
        ]);
        if (c.prefix) {
          for (const p of [...VARIABLE_PREFIXES, ...CONTROL_PREFIXES]) if (p.prefix !== c.prefix) wrong.add(toHungarian(p.prefix, c.words));
          wrong.add(c.words.join(''));
        }
        wrong.delete(c.expected);
        for (const w of wrong) {
          const r = item.check(w);
          expect(r.correct, `${label}: ${w}`).toBe(false);
          expect(r.counted).not.toBe(false);
          expect(r.reason.length).toBeGreaterThan(20);
        }
        expect(item.check('   ').counted).toBe(false);
        expect(fromNamingInstance(item.instance!)?.prompt).toEqual(item.prompt);
        const text = item.prompt.map((b) => (b.kind === 'text' || b.kind === 'pre' ? b.text : '')).join(' ');
        if (c.target === 'hungarian') {
          expect(item.prompt.some((b) => b.kind === 'table' && b.rows.length === 1)).toBe(true);
          // Hard describes a variable by its data only; the other levels name the data type.
          if (task === 'hungarian-variable' && level === 'hard') expect(text).toMatch(/Name a variable that holds/);
        } else {
          expect(text).toContain(c.source ? c.source.identifier : c.words.join(' '));
        }
      }
    }
  });

  it('says what is wrong with a near miss', () => {
    const camel = rewriteCase('camel', 5, 'easy');
    const words = camel.words;
    expect(diagnoseRewrite(camel, write('pascal', words))).toBe('That is Pascal case: camel case starts with a lowercase letter.');
    expect(diagnoseRewrite(camel, write('snake', words))).toBe("Camel case doesn't use underscores.");
    expect(diagnoseRewrite(camel, words.join(' '))).toBe("An identifier can't contain spaces.");
    const snake = rewriteCase('snake', 5, 'easy');
    expect(diagnoseRewrite(snake, write('title-snake', snake.words))).toBe('Snake case is all lowercase.');
    expect(diagnoseRewrite(snake, write('camel', snake.words))).toBe('Snake case joins the words with underscores.');
    expect(diagnoseRewrite(snake, write('kebab', snake.words))).toMatch(/^Hyphens can't join/);
    let seed = 1;
    while (rewriteCase('hungarian-control', seed, 'normal').prefix !== 'txt') seed++;
    const txt = rewriteCase('hungarian-control', seed, 'normal');
    expect(diagnoseRewrite(txt, toHungarian('str', txt.words))).toBe('The prefix for a text box is txt.');
    expect(diagnoseRewrite(txt, `Txt${txt.expected.slice(3)}`)).toBe('The prefix is written in lowercase.');
    expect(diagnoseRewrite(txt, txt.expected.toLowerCase())).toBe('Check the capitals: after the prefix, each word starts with a capital letter.');
  });

  it('describes Hungarian variables with the type named below hard', () => {
    let seed = 1;
    while (rewriteCase('hungarian-variable', seed, 'normal').prefix !== 'flt') seed++;
    expect(rewriteCase('hungarian-variable', seed, 'normal').description).toMatch(/^a Floating point variable that holds /);
    expect(rewriteCase('hungarian-variable', seed, 'hard').description).toMatch(/^a variable that holds /);
    while (rewriteCase('hungarian-variable', seed, 'normal').prefix !== 'arr') seed++;
    expect(rewriteCase('hungarian-variable', seed, 'normal').description).toMatch(/^an array that holds /);
  });
});

describe('naming rounds', () => {
  it('plans four identifiers and six rewrites with no phrase repeated', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS.slice(0, 200)) {
        const plan = planNamingRound(seed, level);
        expect(plan).toHaveLength(10);
        const identify = plan.filter((p) => p.kind === 'identify');
        const rewrite = plan.filter((p) => p.kind === 'rewrite');
        expect(identify).toHaveLength(4);
        expect(rewrite.map((p) => p.task).sort()).toEqual(['camel', 'hungarian-control', 'hungarian-control', 'hungarian-variable', 'hungarian-variable', 'snake']);
        expect(identify.some((p) => p.shape === 'hungarian')).toBe(true);
        expect(identify.some((p) => (LOOKALIKES[level] as readonly string[]).includes(p.shape))).toBe(true);
        const words = plan.map((p) => (p.kind === 'identify' ? identifyCase(p.shape, p.seed, level).words : rewriteCase(p.task, p.seed, level).words).join(' '));
        expect(new Set(words).size).toBe(10);
      }
    }
    expect(planNamingRound(3, 'normal', 25)).toHaveLength(25);
  });

  it('generates standalone items deterministically', () => {
    const ids = new Set<string>();
    for (const seed of SEEDS) {
      for (const level of LEVELS) {
        const item = generateNamingItem(seed, level);
        ids.add(item.id);
        expect(generateNamingItem(seed, level).prompt).toEqual(item.prompt);
        expect(fromNamingInstance(item.instance!)?.prompt).toEqual(item.prompt);
        expect(item.check(item.check('?').expected).correct).toBe(true);
      }
    }
    expect([...ids].sort()).toEqual(['gen-naming-identify', 'gen-naming-rewrite']);
    expect(fromNamingInstance('naming:rewrite:pascal:seed=1:easy')).toBeNull();
    expect(fromNamingInstance('naming:identify:camel:seed=1:extreme')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const session = game.start(ctx, { difficulty: level, seed: 9 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('   ').expected;
      expect(session.answer(expected).correct).toBe(true);
    }
    expect(session.summary()).toMatchObject({ gameId: 'naming', score: 10, total: 10 });
    expect(session.summary().perKk['U3O1-KK09']).toEqual({ correct: 10, total: 10 });
  });

  it('builds items from specs', () => {
    expect(namingItem({ kind: 'rewrite', task: 'snake', seed: 4 }, 'easy').id).toBe('gen-naming-rewrite');
    expect(namingItem({ kind: 'identify', shape: 'kebab', seed: 4 }, 'normal').id).toBe('gen-naming-identify');
  });
});
