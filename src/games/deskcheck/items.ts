/**
 * `deskcheck` items. A trace item runs its template's listing through the interpreter with tracing
 * on, asks the first question the run can answer, and takes the expected answer from that run
 * (Section 12: never hand-computed). A wrong answer shows a trace table built from the same run.
 *
 * Every item's `instance` ("deskcheck:loop:seed=123:normal") regenerates it exactly through
 * fromDeskcheckInstance.
 */
import type { TerminalBlock } from '../../terminal/blocks';
import { childSeed, mulberry32, pick, shuffle } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { answerHint, checkDeskAnswer, formatDeskAnswer, type DeskAnswer } from './answers';
import {
  afterIteration,
  afterLine,
  callFunction,
  formatValue,
  parseProgram,
  runProgram,
  timesRun,
  type Program,
  type RunResult,
  type Stmt,
  type Value,
} from './interpreter';
import { callText, ordinal } from './listing';
import { TEMPLATES, TRACE_FAMILIES, type Ask, type TraceCase, type TraceFamily } from './templates';
import { testTableItem } from './testtable';

export const DESKCHECK_KINDS = [...TRACE_FAMILIES, 'testtable'] as const;
export type DeskcheckKind = (typeof DESKCHECK_KINDS)[number];

export interface DeskcheckSpec {
  kind: DeskcheckKind;
  seed: number;
}

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export interface BuiltTrace {
  tc: TraceCase;
  program: Program;
  run: RunResult;
  ask: Ask;
  answer: DeskAnswer;
  question: string;
}

function scopeOf(tc: TraceCase): string {
  return tc.call ? tc.call.name : 'main';
}

/** The value a question asks about, or undefined when this run can't answer it. */
function answerFor(tc: TraceCase, run: RunResult, ask: Ask): DeskAnswer | undefined {
  const scope = scopeOf(tc);
  switch (ask.kind) {
    case 'output':
      return run.output.length ? { kind: 'output', lines: run.output } : undefined;
    case 'return':
      return run.returned === undefined ? undefined : { kind: 'value', value: run.returned };
    case 'line': {
      const snap = afterLine(run, ask.line, ask.occurrence);
      const v = snap && snap.scope === scope ? snap.vars[ask.variable] : undefined;
      return v === undefined ? undefined : { kind: 'value', value: v };
    }
    case 'pass': {
      const snap = afterIteration(run, ask.loopLine, ask.pass);
      const v = snap && snap.scope === scope ? snap.vars[ask.variable] : undefined;
      return v === undefined ? undefined : { kind: 'value', value: v };
    }
  }
}

function questionFor(tc: TraceCase, run: RunResult, ask: Ask): string {
  const call = tc.call ? callText(tc.call.name, tc.call.args) : '';
  const when = call ? `When ${call} runs, what` : 'What';
  switch (ask.kind) {
    case 'output':
      return 'What is displayed when the program runs?';
    case 'return':
      return `What does ${call} return?`;
    case 'line': {
      const often = timesRun(run, ask.line) > 1 ? ` for the ${ordinal(ask.occurrence)} time` : '';
      return `${when} is the value of ${ask.variable} after line ${ask.line} runs${often}?`;
    }
    case 'pass':
      return `${when} is the value of ${ask.variable} at the end of the ${ordinal(ask.pass)} pass through the loop that starts on line ${ask.loopLine}?`;
  }
}

/** Builds the listing, runs it and settles the question. Exposed for the tests. */
export function buildTrace(family: TraceFamily, seed: number, difficulty: Difficulty): BuiltTrace {
  const tc = TEMPLATES[family](mulberry32(seed), difficulty);
  const program = parseProgram(tc.code);
  const opts = { indexBase: tc.indexBase, globals: tc.globals, trace: true };
  const run = tc.call ? callFunction(program, tc.call.name, tc.call.args, opts) : runProgram(program, opts);
  const answerable = tc.asks.flatMap((ask) => {
    const answer = answerFor(tc, run, ask);
    return answer ? [{ ask, answer }] : [];
  });
  if (!answerable.length) throw new Error(`deskcheck ${family} seed ${seed} has no answerable question`);
  const { ask, answer } = pick(mulberry32(childSeed(seed, 'ask')), answerable);
  return { tc, program, run, ask, answer, question: questionFor(tc, run, ask) };
}

function linesOf(body: readonly Stmt[], kind: 'display' | 'return', out: Set<number>): Set<number> {
  for (const s of body) {
    if (s.k === kind) out.add(s.line);
    if (s.k === 'if') s.branches.forEach((b) => linesOf(b.body, kind, out));
    if (s.k === 'for' || s.k === 'while' || s.k === 'repeat') linesOf(s.body, kind, out);
  }
  return out;
}

function cell(v: Value | undefined): string {
  if (v === undefined) return '';
  return typeof v === 'string' ? `"${v}"` : formatValue(v);
}

export const TRACE_ROWS_MAX = 40;

/** A desk-check trace table: the variables after each line runs, and what it displayed or returned. */
export function traceTable(built: Pick<BuiltTrace, 'tc' | 'program' | 'run' | 'ask'>): TerminalBlock {
  const { tc, program, run, ask } = built;
  const scope = scopeOf(tc);
  const body = tc.call ? (program.functions.get(tc.call.name)?.body ?? []) : (program.main ?? []);
  const displays = linesOf(body, 'display', new Set());
  const returns = linesOf(body, 'return', new Set());
  const steps = run.trace.filter((s) => s.kind === 'line' && s.scope === scope);
  const asked = ask.kind === 'line' || ask.kind === 'pass' ? ask.variable : null;
  const names: string[] = [];
  for (const s of steps) {
    for (const [name, v] of Object.entries(s.vars)) {
      if (names.includes(name) || tc.globals?.[name] !== undefined) continue;
      if (Array.isArray(v) && name !== asked) continue;
      names.push(name);
    }
  }
  let shown = 0;
  const all = steps.map((s) => {
    let note = '';
    if (displays.has(s.line)) note = run.output[shown++] ?? '';
    else if (returns.has(s.line)) note = `returns ${cell(run.returned)}`;
    return [String(s.line), ...names.map((n) => cell(s.vars[n])), note];
  });
  // Rows with nothing to show (such as setting up an array the table leaves out) are dropped.
  const useful = all.filter((r) => r.slice(1).some(Boolean));
  const rows = useful.slice(0, TRACE_ROWS_MAX);
  const caption = useful.length > TRACE_ROWS_MAX ? `Trace table (first ${TRACE_ROWS_MAX} of ${useful.length} steps)` : 'Trace table';
  return { kind: 'table', caption, columns: ['Line', ...names, 'Output'], rows };
}

/** For questions about a line or a pass: where the answer comes from in the trace. */
function leadFor(ask: Ask, expected: string, run: RunResult): string {
  if (ask.kind === 'pass') return `At the end of the ${ordinal(ask.pass)} pass, ${ask.variable} is ${expected}.`;
  if (ask.kind === 'line') {
    const often = timesRun(run, ask.line) > 1 ? ` for the ${ordinal(ask.occurrence)} time` : '';
    return `After line ${ask.line} runs${often}, ${ask.variable} is ${expected}.`;
  }
  return '';
}

export function traceItem(family: TraceFamily, seed: number, difficulty: Difficulty): QuizItem {
  const built = buildTrace(family, seed, difficulty);
  const { tc, ask, answer, run, question } = built;
  const expected = formatDeskAnswer(answer);
  const reason = [leadFor(ask, expected, run), tc.reason(run, ask)].filter(Boolean).join(' ');
  const highlight = ask.kind === 'line' ? [ask.line] : ask.kind === 'pass' ? [ask.loopLine] : undefined;
  const prompt: TerminalBlock[] = [
    ...tc.intro.map((text): TerminalBlock => ({ kind: 'text', text })),
    ...(tc.data ?? []),
    { kind: 'pseudo', code: tc.code, indexBase: tc.usesArrays ? tc.indexBase : undefined, highlightLines: highlight },
    { kind: 'text', text: question, tone: 'accent' },
    { kind: 'text', text: answerHint(answer), tone: 'muted' },
  ];
  return {
    id: `gen-deskcheck-${family}`,
    kk: tc.kk,
    instance: `deskcheck:${family}:seed=${seed}:${difficulty}`,
    prompt,
    check(input) {
      const verdict = checkDeskAnswer(input, answer);
      if (verdict.status === 'unparsed') return { correct: false, expected, reason: verdict.message, counted: false };
      if (verdict.status === 'right') return { correct: true, expected, reason };
      return { correct: false, expected, reason: [verdict.note, reason].filter(Boolean).join(' '), followUp: [traceTable(built)] };
    },
  };
}

export function deskcheckItem(spec: DeskcheckSpec, difficulty: Difficulty): QuizItem {
  const seed = spec.seed >>> 0;
  return spec.kind === 'testtable' ? testTableItem(seed, difficulty) : traceItem(spec.kind, seed, difficulty);
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromDeskcheckInstance(instance: string): QuizItem | null {
  const m = /^deskcheck:([a-z]+):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (!m || !(DESKCHECK_KINDS as readonly string[]).includes(m[1]) || !DIFFICULTIES.includes(m[3] as Difficulty)) return null;
  return deskcheckItem({ kind: m[1] as DeskcheckKind, seed: Number(m[2]) }, m[3] as Difficulty);
}

/** Trace families per difficulty. Hard swaps two easier families for nested loops and off-by-one traps. */
export const ROUND_FAMILIES: Record<Difficulty, readonly TraceFamily[]> = {
  easy: ['accumulate', 'branch', 'loop', 'grid', 'string', 'function', 'accumulate', 'branch', 'loop'],
  normal: ['accumulate', 'branch', 'loop', 'loop', 'grid', 'string', 'function', 'function'],
  hard: ['nested', 'offbyone', 'offbyone', 'branch', 'loop', 'grid', 'string', 'function'],
};

/**
 * A round of `count` items: nine trace questions and one test table on easy, eight and two
 * otherwise, in a seeded order. Test tables never come first.
 */
export function planDeskcheckRound(seed: number, difficulty: Difficulty, count = 10): DeskcheckSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const specs: DeskcheckSpec[] = [];
  for (let cycle = 0; specs.length < count; cycle++) {
    const kinds: DeskcheckKind[] = shuffle(rng, ROUND_FAMILIES[difficulty]);
    if (difficulty === 'easy') kinds.splice(3 + Math.floor(rng() * 7), 0, 'testtable');
    else {
      kinds.splice(3 + Math.floor(rng() * 3), 0, 'testtable');
      kinds.push('testtable');
    }
    kinds.forEach((kind, i) => specs.push({ kind, seed: childSeed(seed, `${cycle}:${i}`) }));
  }
  return specs.slice(0, count);
}

/** Game.generate: one self-contained item, from the difficulty's families or a test table. */
export function generateDeskcheckItem(seed: number, difficulty: Difficulty): QuizItem {
  const kinds: DeskcheckKind[] = [...new Set(ROUND_FAMILIES[difficulty])];
  kinds.push('testtable');
  const r = mulberry32(childSeed(seed, 'kind'))();
  return deskcheckItem({ kind: kinds[Math.floor(r * kinds.length)], seed }, difficulty);
}
