/**
 * The deskcheck generator against the interpreter: over 500 seeds at each difficulty, every emitted
 * listing parses, every array question states its index base, and the answer each item accepts is
 * what the interpreter gives when it runs the emitted listing for the question as printed.
 */
import { describe, expect, it } from 'vitest';
import type { TerminalBlock } from '../../terminal/blocks';
import type { Difficulty, QuizItem } from '../types';
import { checkDeskAnswer, formatDeskAnswer } from './answers';
import game from './index';
import {
  afterIteration,
  afterLine,
  formatValue,
  isReal,
  parseProgram,
  run,
  runProgram,
  type RunResult,
  type Value,
} from './interpreter';
import { buildTrace, deskcheckItem, fromDeskcheckInstance, generateDeskcheckItem, planDeskcheckRound, TRACE_ROWS_MAX, traceItem } from './items';
import { TRACE_FAMILIES } from './templates';
import { minimalInputs, tableSpec, TEST_TABLE_COLUMNS, testTableItem } from './testtable';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 1);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

type Pseudo = Extract<TerminalBlock, { kind: 'pseudo' }>;
type Table = Extract<TerminalBlock, { kind: 'table' }>;

function pseudoOf(item: QuizItem): Pseudo {
  const block = item.prompt.find((b): b is Pseudo => b.kind === 'pseudo');
  if (!block) throw new Error(`no listing in ${item.instance}`);
  return block;
}

function questionOf(item: QuizItem): string {
  const q = item.prompt.find((b) => b.kind === 'text' && b.tone === 'accent');
  if (!q || q.kind !== 'text') throw new Error(`no question in ${item.instance}`);
  return q.text;
}

/** Rebuilds the grid from the printed table, so the check uses what the student sees. */
function gridFromTable(item: QuizItem): Record<string, Value> | undefined {
  const table = item.prompt.find((b): b is Table => b.kind === 'table' && (b.caption ?? '').startsWith('The array grid'));
  if (!table) return undefined;
  return { grid: table.rows.map((r) => r.slice(1).map(Number)) };
}

/**
 * Works out the answer independently: parses the question as printed, runs the printed listing
 * through the interpreter (a called function goes through a small BEGIN block that calls it) and
 * reads the value the question names.
 */
function independentAnswer(item: QuizItem): { value?: Value; lines?: string[] } {
  const { code, indexBase } = pseudoOf(item);
  const q = questionOf(item);
  const opts = { indexBase: indexBase ?? 0, globals: gridFromTable(item), trace: true } as const;
  const call = /^(?:When (.+) runs, what|What does (.+) return\?)/.exec(q);
  const callExpr = call?.[1] ?? call?.[2];
  let r: RunResult;
  let scope = 'main';
  if (callExpr) {
    const name = callExpr.slice(0, callExpr.indexOf('('));
    scope = name;
    const program = parseProgram(`${code}\nBEGIN\n    answer ← ${callExpr}\nEND`);
    r = runProgram(program, opts);
    if (q.startsWith('What does')) {
      const last = r.trace.at(-1)!;
      expect(last.scope).toBe('main');
      return { value: last.vars.answer };
    }
  } else {
    r = run(code, opts);
  }
  if (q === 'What is displayed when the program runs?') return { lines: r.output };
  const line = /is the value of (\w+) after line (\d+) runs(?: for the (\w+) time)?\?$/.exec(q);
  if (line) {
    const snap = afterLine(r, Number(line[2]), line[3] ? ORDINALS.indexOf(line[3]) + 1 : 1);
    expect(snap?.scope).toBe(scope);
    if (!line[3]) expect(r.lineCounts.get(Number(line[2]))).toBe(1);
    return { value: snap!.vars[line[1]] };
  }
  const pass = /is the value of (\w+) at the end of the (\w+) pass through the loop that starts on line (\d+)\?$/.exec(q);
  if (pass) {
    const snap = afterIteration(r, Number(pass[3]), ORDINALS.indexOf(pass[2]) + 1);
    expect(snap?.scope).toBe(scope);
    expect(code.split('\n')[Number(pass[3]) - 1].trim()).toMatch(/^(FOR|WHILE|REPEAT)\b/);
    return { value: snap!.vars[pass[1]] };
  }
  throw new Error(`unrecognised question: ${q}`);
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

/** How a student would type a value. */
function typed(v: Value): string {
  return Array.isArray(v) ? v.map((x) => formatValue(x)).join(' ') : formatValue(v);
}

/** A plausible wrong answer of the same shape. */
function wrongFor(v: Value): string {
  if (typeof v === 'number') return String(v + 1);
  if (isReal(v)) return formatValue(v.value + 1).includes('.') ? String(v.value + 1) : `${v.value + 1}.5`;
  if (typeof v === 'boolean') return v ? 'FALSE' : 'TRUE';
  if (typeof v === 'string') return `${v}x`;
  return typed([...v].reverse()) === typed(v) ? typed(v.map((x) => (typeof x === 'number' ? x + 1 : x))) : typed([...v].reverse());
}

describe('deskcheck trace questions against the interpreter', () => {
  it.each(LEVELS)('every family at %s: 500 seeds each', (level) => {
    for (const family of TRACE_FAMILIES) {
      for (const seed of SEEDS) {
        const item = traceItem(family, seed, level);
        const label = item.instance!;
        const { code, indexBase } = pseudoOf(item);

        // Every emitted listing parses, has no blank lines and uses the house indentation.
        expect(() => parseProgram(code), label).not.toThrow();
        expect(code.split('\n').every((l) => l.trim() && (l.length - l.trimStart().length) % 4 === 0), label).toBe(true);

        // Every question with an array states its index base.
        const usesArrays = /\[/.test(code) || item.prompt.some((b) => b.kind === 'table');
        if (usesArrays) expect([0, 1], label).toContain(indexBase);

        // The item accepts exactly what the interpreter gives for the printed listing and question.
        const ind = independentAnswer(item);
        const expected = item.check('').expected;
        if (ind.lines) {
          expect(ind.lines.length, label).toBeGreaterThan(0);
          expect(ind.lines.join(''), `${label}: output lines never contain commas`).not.toContain(',');
          expect(expected, label).toBe(formatDeskAnswer({ kind: 'output', lines: ind.lines }));
          expect(item.check(ind.lines.join(' ')).correct, label).toBe(true);
          expect(item.check(ind.lines.join(', ').toUpperCase()).correct, label).toBe(true);
          const words = ind.lines.join(' ').split(' ');
          const last = words.at(-1)!;
          const changed = /^-?\d+$/.test(last) ? String(Number(last) + 1) : `${last}z`;
          const wrong = item.check([...words.slice(0, -1), changed].join(' '));
          expect(wrong.correct, label).toBe(false);
          expect(wrong.counted, label).not.toBe(false);
        } else {
          const v = ind.value!;
          expect(v, label).toBeDefined();
          expect(expected, label).toBe(formatDeskAnswer({ kind: 'value', value: v }));
          expect(item.check(typed(v)).correct, label).toBe(true);
          const wrong = item.check(wrongFor(v));
          expect(wrong.correct, `${label}: ${wrongFor(v)}`).toBe(false);
          // A floating point answer is never a whole number, so 7 versus 7.0 never decides it.
          if (isReal(v)) expect(Number.isInteger(v.value), label).toBe(false);
        }
        // The same seed always gives the same item.
        expect(fromDeskcheckInstance(label)?.prompt, label).toEqual(item.prompt);
      }
    }
  });

  it('asks about lines and passes the listing really has, and highlights them', () => {
    for (const level of LEVELS) {
      for (const family of TRACE_FAMILIES) {
        for (const seed of SEEDS.slice(0, 100)) {
          const built = buildTrace(family, seed, level);
          const { ask, tc } = built;
          const lines = tc.code.split('\n');
          const block = pseudoOf(traceItem(family, seed, level));
          if (ask.kind === 'line') {
            expect(lines[ask.line - 1], tc.code).toMatch(new RegExp(`^\\s*${ask.variable} ←|←`));
            expect(block.highlightLines).toEqual([ask.line]);
          }
          if (ask.kind === 'pass') {
            expect(lines[ask.loopLine - 1].trim()).toMatch(/^(FOR|WHILE|REPEAT)\b/);
            expect(block.highlightLines).toEqual([ask.loopLine]);
          }
        }
      }
    }
  });

  it('uses both index bases and every kind of question', () => {
    const bases = new Set<number>();
    const kinds = new Set<string>();
    for (const level of LEVELS) {
      for (const family of TRACE_FAMILIES) {
        for (const seed of SEEDS.slice(0, 60)) {
          const built = buildTrace(family, seed, level);
          kinds.add(built.ask.kind);
          if (built.tc.usesArrays) bases.add(built.tc.indexBase);
        }
      }
    }
    expect([...bases].sort()).toEqual([0, 1]);
    expect([...kinds].sort()).toEqual(['line', 'output', 'pass', 'return']);
  });

  it('shows a trace table after a wrong answer, from the same run', () => {
    const item = traceItem('accumulate', 11, 'easy');
    const answer = item.check('').expected;
    const wrong = item.check(/^\d+$/.test(answer) ? String(Number(answer) + 1) : 'nothing');
    expect(wrong.correct).toBe(false);
    const table = wrong.followUp?.[0];
    expect(table?.kind).toBe('table');
    if (table?.kind !== 'table') return;
    expect(table.columns[0]).toBe('Line');
    expect(table.columns.at(-1)).toBe('Output');
    expect(table.rows.length).toBeLessThanOrEqual(TRACE_ROWS_MAX);
    expect(table.rows.some((r) => r.at(-1) === answer)).toBe(true);
    expect(item.check(answer).followUp).toBeUndefined();
  });

  it('states the answer format under every question', () => {
    const item = traceItem('function', 3, 'normal');
    const hint = item.prompt.at(-1);
    expect(hint).toMatchObject({ kind: 'text', tone: 'muted' });
  });
});

describe('deskcheck answers', () => {
  it('is strict about whole numbers and decimal points', () => {
    expect(checkDeskAnswer('7', { kind: 'value', value: 7 }).status).toBe('right');
    const point = checkDeskAnswer('7.0', { kind: 'value', value: 7 });
    expect(point.status).toBe('wrong');
    expect(point.status === 'wrong' && point.note).toContain('whole number');
    expect(checkDeskAnswer('seven', { kind: 'value', value: 7 }).status).toBe('unparsed');
    const real = { kind: 'value', value: run('BEGIN\n    x ← 9 / 4\n    DISPLAY x\nEND', { indexBase: 0, trace: true }).trace[0].vars.x } as const;
    expect(checkDeskAnswer('2.25', real).status).toBe('right');
    expect(checkDeskAnswer('2.250', real).status).toBe('right');
    expect(checkDeskAnswer('2.2', real).status).toBe('wrong');
  });

  it('is lenient about case, quotes, spaces and commas', () => {
    expect(checkDeskAnswer('"tranmia7"', { kind: 'value', value: 'TranMia7' }).status).toBe('right');
    expect(checkDeskAnswer('  Room   204 ', { kind: 'output', lines: ['Room 204'] }).status).toBe('right');
    expect(checkDeskAnswer('3,5, 8', { kind: 'output', lines: ['3', '5', '8'] }).status).toBe('right');
    expect(checkDeskAnswer('[3 5 8]', { kind: 'value', value: [3, 5, 8] }).status).toBe('right');
    expect(checkDeskAnswer('true', { kind: 'value', value: true }).status).toBe('right');
    expect(checkDeskAnswer('yes', { kind: 'value', value: true }).status).toBe('unparsed');
    expect(checkDeskAnswer('3 5', { kind: 'value', value: [3, 5, 8] }).status).toBe('unparsed');
    expect(checkDeskAnswer('3 5', { kind: 'output', lines: ['3', '5', '8'] }).status).toBe('wrong');
    expect(checkDeskAnswer('', { kind: 'output', lines: ['3'] }).status).toBe('unparsed');
  });

  it('formats expected output for several lines', () => {
    expect(formatDeskAnswer({ kind: 'output', lines: ['47', '3'] })).toBe('47, 3 (one per line)');
    expect(formatDeskAnswer({ kind: 'output', lines: ['Room 204', '8'] })).toBe('Room 204, then 8');
  });
});

describe('deskcheck test tables', () => {
  /** The requirements as printed: [from, to, output] per row, plus the invalid rule. */
  function bandsOf(item: QuizItem): { bands: [number, number, string][]; invalid: boolean } {
    const table = item.prompt.find((b): b is Table => b.kind === 'table')!;
    const bands: [number, number, string][] = [];
    let invalid = false;
    for (const [range, out] of table.rows) {
      const m = /^(\d+) to (\d+)$/.exec(range);
      if (m) bands.push([Number(m[1]), Number(m[2]), out]);
      else invalid = out === 'Invalid';
    }
    return { bands, invalid };
  }

  it.each(LEVELS)('implements the printed requirements and accepts a complete set of inputs (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const item = testTableItem(seed, level);
      const spec = tableSpec(seed, level);
      const label = item.instance!;
      const code = pseudoOf(item).code;
      const program = parseProgram(code);
      const fn = [...program.functions.keys()][0];
      const { bands, invalid } = bandsOf(item);
      expect(invalid, label).toBe(level === 'hard');
      // The listing returns what the requirements table says, for every value in range and just outside it.
      const lo = bands[0][0];
      const hi = bands.at(-1)![1];
      for (let x = lo - (invalid ? 2 : 0); x <= hi + (invalid ? 2 : 0); x++) {
        const band = bands.find(([a, b]) => x >= a && x <= b);
        const want = band ? band[2] : 'Invalid';
        const got = run(`${code}\nBEGIN\n    DISPLAY ${fn}(${x})\nEND`, { indexBase: 0 }).output[0];
        expect(got, `${label} x=${x}`).toBe(want);
      }
      // The minimal set: both sides of every boundary.
      const needed = minimalInputs(spec);
      const cuts = bands.slice(1).map(([a]) => a);
      const expectedSet = [...cuts.flatMap((c) => [c - 1, c]), ...(invalid ? [lo - 1, lo, hi, hi + 1] : [])].sort((a, b) => a - b);
      expect(needed, label).toEqual([...new Set(expectedSet)]);
      const right = item.check([...needed].reverse().join(', '));
      expect(right.correct, `${label}: ${right.reason}`).toBe(true);
      expect(item.check('').expected).toBe(needed.join(', '));
      // Dropping any one boundary value is wrong, and the reason names it.
      for (const drop of needed) {
        const partial = item.check(needed.filter((v) => v !== drop).join(' '));
        expect(partial.correct, `${label} without ${drop}`).toBe(false);
        expect(partial.counted).not.toBe(false);
        expect(partial.reason).toContain(String(drop));
      }
      // The test table uses the exam's columns and leaves Actual output blank.
      const table = right.followUp?.[0];
      expect(table?.kind).toBe('table');
      if (table?.kind === 'table') {
        expect(table.columns).toEqual(TEST_TABLE_COLUMNS);
        expect(table.rows.map((r) => r[0])).toEqual(needed.map((_, i) => String(i + 1)));
        expect(table.rows.every((r) => r[3] === '')).toBe(true);
        for (const row of table.rows) {
          const x = Number(row[1]);
          const band = bands.find(([a, b]) => x >= a && x <= b);
          expect(row[2]).toBe(band ? band[2] : 'Invalid');
        }
      }
    }
  });

  it('explains a missing branch as well as missing boundaries', () => {
    const item = testTableItem(21, 'normal');
    const { bands } = bandsOf(item);
    const onlyFirst = item.check(String(bands[0][0]));
    expect(onlyFirst.correct).toBe(false);
    expect(onlyFirst.reason).toMatch(/^No input reaches the branches that return .+ \(lines \d+(, \d+)* and \d+\)\./);
    const allButOne = item.check(bands.slice(0, -1).map(([a]) => a).join(' '));
    expect(allButOne.reason).toMatch(/^No input reaches the branch on line \d+ that returns /);
    expect(onlyFirst.reason).toContain('Missing boundary values: ');
  });

  it('re-prompts for unparseable, out-of-range and oversized input without counting it', () => {
    const item = testTableItem(5, 'normal');
    const { bands } = bandsOf(item);
    expect(item.check('fifty').counted).toBe(false);
    expect(item.check(String(bands.at(-1)![1] + 1)).counted).toBe(false);
    expect(item.check(Array.from({ length: 21 }, (_, i) => i).join(' ')).counted).toBe(false);
    const hard = testTableItem(5, 'hard');
    expect(hard.check('-5 5').counted).not.toBe(false);
  });
});

describe('deskcheck rounds', () => {
  it('plans 10 items with one test table on easy and two otherwise, never first', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS.slice(0, 100)) {
        const plan = planDeskcheckRound(seed, level);
        expect(plan).toHaveLength(10);
        const tables = plan.filter((p) => p.kind === 'testtable').length;
        expect(tables).toBe(level === 'easy' ? 1 : 2);
        expect(plan[0].kind).not.toBe('testtable');
        if (level === 'hard') {
          expect(plan.some((p) => p.kind === 'nested')).toBe(true);
          expect(plan.some((p) => p.kind === 'offbyone')).toBe(true);
        } else {
          expect(plan.some((p) => p.kind === 'nested' || p.kind === 'offbyone')).toBe(false);
        }
        expect(new Set(plan.map((p) => p.kind)).size).toBeGreaterThanOrEqual(6);
      }
    }
    expect(planDeskcheckRound(3, 'normal', 25)).toHaveLength(25);
  });

  it('generates standalone items deterministically, including test tables', () => {
    const kinds = new Set<string>();
    for (const seed of SEEDS.slice(0, 200)) {
      for (const level of LEVELS) {
        const item = generateDeskcheckItem(seed, level);
        expect(item.id).toMatch(/^gen-deskcheck-[a-z]+$/);
        expect(generateDeskcheckItem(seed, level).prompt).toEqual(item.prompt);
        expect(fromDeskcheckInstance(item.instance!)?.prompt).toEqual(item.prompt);
        kinds.add(item.id);
      }
    }
    expect(kinds.has('gen-deskcheck-testtable')).toBe(true);
    expect(fromDeskcheckInstance('deskcheck:bogus:seed=1:easy')).toBeNull();
    expect(fromDeskcheckInstance('sort:selection:seed=1:k=2:easy')).toBeNull();
    expect(deskcheckItem({ kind: 'testtable', seed: 9 }, 'easy').id).toBe('gen-deskcheck-testtable');
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };
    const session = game.start(ctx, { difficulty: level, seed: 77 });
    expect(session.progress).toEqual({ current: 1, total: 10 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      expect(session.prompt().some((b) => b.kind === 'pseudo')).toBe(true);
      const probe = session.answer('');
      expect(probe.counted).toBe(false);
      expect(session.answer(probe.expected.replace(/ \(one per line\)$/, '').replace(/, then /g, ' ')).correct).toBe(true);
    }
    const summary = session.summary();
    expect(summary).toMatchObject({ gameId: 'deskcheck', score: 10, total: 10 });
  });
});
