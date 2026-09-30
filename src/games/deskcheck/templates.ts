/**
 * Trace templates for `deskcheck`. Each builds a listing in the house style from a seeded PRNG and
 * proposes questions about it. Templates never work out answers: the item builder (./items.ts)
 * runs every listing through the interpreter and takes the answer from that run. Explanations
 * that quote values read them from the run as well.
 *
 * Families (Section 7.3): counters and accumulators; IF/ELSEIF chains probed at their boundaries;
 * counted, pre-test and post-test loops over one-dimensional arrays; two-dimensional arrays;
 * strings; functions with parameters and return values. Hard mode adds nested loops and
 * off-by-one traps.
 */
import type { KkId } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import { pick, randInt, sample, shuffle, type Rng } from '../prng';
import type { Difficulty } from '../types';
import { timesRun, type RunResult, type Value } from './interpreter';
import { Listing, literal } from './listing';

export const TRACE_FAMILIES = ['accumulate', 'branch', 'loop', 'grid', 'string', 'function', 'nested', 'offbyone'] as const;
export type TraceFamily = (typeof TRACE_FAMILIES)[number];

export type Ask =
  | { kind: 'output' }
  | { kind: 'return' }
  /** The value of `variable` after `line` runs for the `occurrence`-th time. */
  | { kind: 'line'; line: number; occurrence: number; variable: string }
  /** The value of `variable` at the end of pass `pass` of the loop that starts on `loopLine`. */
  | { kind: 'pass'; loopLine: number; pass: number; variable: string };

export interface TraceCase {
  family: TraceFamily;
  /** Which shape of listing, e.g. "array-filter". */
  variant: string;
  kk: KkId[];
  /** Sentences shown before the listing. */
  intro: string[];
  code: string;
  indexBase: 0 | 1;
  /** True when the listing or its data uses arrays, so the question states the index base. */
  usesArrays: boolean;
  /** Variables that exist before the listing runs (a 2D array shown as a table). */
  globals?: Record<string, Value>;
  /** Blocks shown before the listing, such as that table. */
  data?: TerminalBlock[];
  /** For a FUNCTION listing: the call the question asks about. */
  call?: { name: string; args: Value[] };
  /** Candidate questions. One the run can answer is picked by seed; the last is always an 'output' or 'return' question, which always can. */
  asks: Ask[];
  /**
   * One line on how to get the answer, reading any values from the run. Questions about a line or
   * a pass get a lead sentence from the item builder first, so a reason about the final result
   * should say something else for them (check `ask.kind`).
   */
  reason: (run: RunResult, ask: Ask) => string;
}

const KK_TRACE: KkId[] = ['U3O1-KK08', 'U3O1-KK14'];
const KK_ARRAYS: KkId[] = ['U3O1-KK08', 'U3O1-KK05', 'U3O1-KK14'];
const KK_GRID: KkId[] = ['U3O1-KK05', 'U3O1-KK14'];
const KK_STRING: KkId[] = ['U3O1-KK08', 'U3O1-KK04', 'U3O1-KK14'];

type Base = 0 | 1;

function range(a: number, b: number, step = 1): number[] {
  const out: number[] = [];
  for (let x = a; x <= b; x += step) out.push(x);
  return out;
}

function chooseBase(rng: Rng): Base {
  return rng() < 0.5 ? 0 : 1;
}

function ints(rng: Rng, n: number, lo: number, hi: number): number[] {
  return Array.from({ length: n }, () => randInt(rng, lo, hi));
}

const INCLUDES_EQUAL = new Set(['≥', '≤']);

function lastIndex(n: number, base: Base): number {
  return n - 1 + base;
}

// ---------------------------------------------------------------------------
// Counters and accumulators
// ---------------------------------------------------------------------------

function accumulate(rng: Rng, d: Difficulty): TraceCase {
  const variant = pick(rng, d === 'easy' ? ['range-sum', 'range-sum', 'array-filter'] : d === 'normal' ? ['range-sum', 'array-filter', 'array-filter', 'digits'] : ['array-filter', 'digits', 'range-sum']);
  if (variant === 'array-filter') return arrayFilter(rng, d);
  if (variant === 'digits') return digits(rng, d);

  const a = randInt(rng, 1, d === 'easy' ? 3 : 6);
  const step = d === 'easy' ? 1 : pick(rng, [1, 2, 3]);
  const passes = d === 'easy' ? randInt(rng, 4, 5) : randInt(rng, 4, 7);
  const b = a + step * (passes - 1) + (step > 1 ? randInt(rng, 0, step - 1) : 0);
  const body = d === 'easy' ? 'plain' : pick(rng, ['plain', 'times', 'mod'] as const);
  const m = body === 'times' ? randInt(rng, 2, 5) : randInt(rng, 2, 3);
  const L = new Listing();
  L.open('BEGIN');
  L.line('total ← 0');
  const loop = L.open(`FOR k ← ${a} TO ${b}${step > 1 ? ` STEP ${step}` : ''}`);
  let addLine: number;
  if (body === 'plain') addLine = L.line('total ← total + k');
  else if (body === 'times') addLine = L.line(`total ← total + k * ${m}`);
  else {
    L.open(`IF k MOD ${m} = 0 THEN`);
    addLine = L.line('total ← total + k');
    L.close('ENDIF');
  }
  L.close('ENDFOR');
  L.line('DISPLAY total');
  L.close('END');
  const going = step > 1 ? ` going up by ${step}` : '';
  const how =
    body === 'plain' ? 'adding k to total each time' : body === 'times' ? `adding k * ${m} to total each time` : `but it only adds k when k MOD ${m} = 0, that is, when k is a multiple of ${m}`;
  return {
    family: 'accumulate',
    variant: `range-sum-${body}`,
    kk: KK_TRACE,
    intro: [],
    code: L.code,
    indexBase: 0,
    usesArrays: false,
    asks: [
      ...(d === 'easy' ? [] : [{ kind: 'pass', loopLine: loop, pass: randInt(rng, 2, passes - 1), variable: 'total' } as Ask]),
      ...(d === 'hard' && body === 'mod' ? [{ kind: 'line', line: addLine, occurrence: 2, variable: 'total' } as Ask] : []),
      { kind: 'output' },
    ],
    reason: (r) => `The loop runs ${times(passesOf(r, loop))}, once for each value of k from ${a} to ${b}${going}, ${how}.`,
  };
}

function passesOf(r: RunResult, loopLine: number): number {
  return r.trace.filter((s) => s.kind === 'iteration' && s.line === loopLine).length;
}

function times(n: number): string {
  return n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`;
}

const FILTER_ARRAYS = ['scores', 'marks', 'points', 'sales'] as const;

function arrayFilter(rng: Rng, d: Difficulty): TraceCase {
  const base = chooseBase(rng);
  const n = d === 'hard' ? randInt(rng, 6, 7) : 5;
  const name = pick(rng, FILTER_ARRAYS);
  const t = randInt(rng, 8, 20);
  const values = ints(rng, n, 2, 30);
  if (d !== 'easy') values[randInt(rng, 0, n - 1)] = t;
  const op = pick(rng, d === 'easy' ? ['≥', '>'] : ['≥', '>', '<', '≤']);
  const shows = pick(rng, ['total', 'count', 'both'] as const);
  const L = new Listing();
  L.open('BEGIN');
  L.line(`${name} ← ${literal(values)}`);
  L.line('total ← 0');
  L.line('count ← 0');
  const loop = L.open(`FOR i ← ${base} TO ${lastIndex(n, base)}`);
  L.open(`IF ${name}[i] ${op} ${t} THEN`);
  L.line(`total ← total + ${name}[i]`);
  const countLine = L.line('count ← count + 1');
  L.close('ENDIF');
  L.close('ENDFOR');
  if (shows !== 'count') L.line('DISPLAY total');
  if (shows !== 'total') L.line('DISPLAY count');
  L.close('END');
  const equal = INCLUDES_EQUAL.has(op) ? 'is' : "isn't";
  return {
    family: 'accumulate',
    variant: 'array-filter',
    kk: KK_ARRAYS,
    intro: [],
    code: L.code,
    indexBase: base,
    usesArrays: true,
    asks: [
      ...(d === 'easy' ? [] : [{ kind: 'pass', loopLine: loop, pass: randInt(rng, 2, n - 1), variable: pick(rng, ['total', 'count']) } as Ask]),
      ...(d === 'hard' ? [{ kind: 'line', line: countLine, occurrence: 2, variable: 'total' } as Ask] : []),
      { kind: 'output' },
    ],
    reason: () => `The loop checks every value, but only values where ${name}[i] ${op} ${t} is TRUE are added to total and counted. A value equal to ${t} ${equal} included, because the condition uses ${op}.`,
  };
}

function digits(rng: Rng, d: Difficulty): TraceCase {
  const n = d === 'hard' ? randInt(rng, 10_000, 99_999) : randInt(rng, 1000, 9999);
  const counting = rng() < 0.3;
  const L = new Listing();
  L.open('BEGIN');
  L.line(`n ← ${n}`);
  L.line(counting ? 'digits ← 0' : 'sum ← 0');
  const rep = L.open('REPEAT');
  L.line(counting ? 'digits ← digits + 1' : 'sum ← sum + n MOD 10');
  L.line('n ← n DIV 10');
  L.close('UNTIL n = 0');
  L.line(counting ? 'DISPLAY digits' : 'DISPLAY sum');
  L.close('END');
  const variable = counting ? 'digits' : pick(rng, ['sum', 'n']);
  return {
    family: 'accumulate',
    variant: counting ? 'digits-count' : 'digits-sum',
    kk: KK_TRACE,
    intro: [],
    code: L.code,
    indexBase: 0,
    usesArrays: false,
    asks: [{ kind: 'pass', loopLine: rep, pass: randInt(rng, 2, String(n).length - 1), variable }, { kind: 'output' }],
    reason: () =>
      counting
        ? 'Each pass counts one digit and removes it with n DIV 10, which rounds down, until n is 0.'
        : 'Each pass adds the last digit of n (n MOD 10) to sum, then removes that digit with n DIV 10, which rounds down, until n is 0.',
  };
}

// ---------------------------------------------------------------------------
// IF/ELSEIF chains probed at their boundaries
// ---------------------------------------------------------------------------

interface BandContext {
  v: string;
  fn: string;
  out: string;
  outputs: readonly (number | string)[];
  lo: number;
  hi: number;
  step: number;
}

const BAND_CONTEXTS: readonly BandContext[] = [
  { v: 'speed', fn: 'fineFor', out: 'fine', outputs: [0, 150, 300, 500], lo: 40, hi: 150, step: 5 },
  { v: 'mark', fn: 'gradeFor', out: 'grade', outputs: ['N', 'C', 'B', 'A'], lo: 0, hi: 100, step: 5 },
  { v: 'temp', fn: 'describeTemp', out: 'label', outputs: ['Cold', 'Mild', 'Warm', 'Hot'], lo: 0, hi: 40, step: 1 },
  { v: 'points', fn: 'levelFor', out: 'level', outputs: ['Bronze', 'Silver', 'Gold', 'Platinum'], lo: 0, hi: 500, step: 10 },
  { v: 'battery', fn: 'batteryStatus', out: 'status', outputs: ['Critical', 'Low', 'Fair', 'Full'], lo: 0, hi: 100, step: 5 },
];

interface Chain {
  /** Condition lines in order, with their text and the first line of their body. */
  conds: { line: number; text: string; body: number }[];
  elseBody: number;
}

/** Cut points in ascending order, at least `gap` apart. */
function cutPoints(rng: Rng, ctx: BandContext, count: number): number[] {
  const candidates = range(ctx.lo + ctx.step, ctx.hi - ctx.step).filter((x) => x % ctx.step === 0);
  const gap = Math.max(4, ctx.step * 2);
  for (let tries = 0; tries < 100; tries++) {
    const cuts = sample(rng, candidates, count).sort((a, b) => a - b);
    if (cuts.every((c, i) => i === 0 || c - cuts[i - 1] >= gap)) return cuts;
  }
  // Evenly spaced cut points, rounded to the context's step.
  const span = (ctx.hi - ctx.lo) / (count + 1);
  return range(1, count).map((i) => Math.round((ctx.lo + span * i) / ctx.step) * ctx.step);
}

/**
 * Writes an IF/ELSEIF/ELSE chain. `desc` tests the highest band first with ≥ or >; otherwise
 * the lowest band first with < or ≤. `emit` writes each branch's body.
 */
function writeChain(L: Listing, rng: Rng, subject: string, cuts: number[], desc: boolean, emit: (band: number) => number): Chain {
  const k = cuts.length + 1;
  const conds: Chain['conds'] = [];
  const order = desc ? range(1, k - 1).reverse() : range(0, k - 2);
  order.forEach((band, i) => {
    const op = desc ? pick(rng, ['≥', '>']) : pick(rng, ['<', '≤']);
    const cut = desc ? cuts[band - 1] : cuts[band];
    const text = `${subject} ${op} ${cut}`;
    const line = i === 0 ? L.open(`IF ${text} THEN`) : L.middle(`ELSEIF ${text} THEN`);
    conds.push({ line, text, body: emit(band) });
  });
  L.middle('ELSE');
  const elseBody = emit(desc ? 0 : k - 1);
  L.close('ENDIF');
  return { conds, elseBody };
}

/** "For speed = 80: speed > 110 is FALSE and speed ≥ 80 is TRUE, so line 6 runs." */
function chainReason(r: RunResult, chain: Chain, subject: string, probe: number): string {
  const parts: string[] = [];
  for (const c of chain.conds) {
    if (timesRun(r, c.body) > 0) {
      parts.push(`${c.text} is TRUE`);
      return `For ${subject} = ${probe}: ${joinAnd(parts)}, so line ${c.body} runs.`;
    }
    parts.push(`${c.text} is FALSE`);
  }
  return `For ${subject} = ${probe}, none of the conditions is TRUE (${parts.join(', ')}), so the ELSE branch on line ${chain.elseBody} runs.`;
}

function joinAnd(parts: string[]): string {
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function branch(rng: Rng, d: Difficulty): TraceCase {
  const ctx = pick(rng, BAND_CONTEXTS);
  const k = d === 'easy' ? 3 : pick(rng, [3, 4]);
  const cuts = cutPoints(rng, ctx, k - 1);
  const desc = rng() < 0.5;
  const outputs = ctx.outputs.slice(0, k);
  const nearCut = (c: number) => (d === 'easy' || rng() < 0.7 ? c : c + pick(rng, [-1, 1]));

  if (d === 'hard' && rng() < 0.5) {
    // Several readings through one chain, displaying a label for each.
    const base = chooseBase(rng);
    const probes = shuffle(rng, [cuts[0], cuts[0] + pick(rng, [-1, 1]), cuts[k - 2], cuts[k - 2] + pick(rng, [-1, 1])]);
    const L = new Listing();
    L.open('BEGIN');
    L.line(`readings ← ${literal(probes)}`);
    L.open(`FOR i ← ${base} TO ${lastIndex(probes.length, base)}`);
    writeChain(L, rng, 'readings[i]', cuts, desc, (band) => L.line(`DISPLAY ${literal(outputs[band])}`));
    L.close('ENDFOR');
    L.close('END');
    return {
      family: 'branch',
      variant: 'readings',
      kk: KK_ARRAYS,
      intro: [],
      code: L.code,
      indexBase: base,
      usesArrays: true,
      asks: [{ kind: 'output' }],
      reason: () => 'Each reading goes through the conditions in order and the first TRUE one decides what is displayed. A reading equal to a boundary only matches a condition that uses ≥ or ≤.',
    };
  }

  const probe = nearCut(pick(rng, cuts));
  const asFunction = d !== 'easy' && rng() < 0.5;
  const L = new Listing();
  let chain: Chain;
  if (asFunction) {
    L.open(`FUNCTION ${ctx.fn}(${ctx.v})`);
    chain = writeChain(L, rng, ctx.v, cuts, desc, (band) => L.line(`${ctx.out} ← ${literal(outputs[band])}`));
    L.line(`RETURN ${ctx.out}`);
    L.close('ENDFUNCTION');
  } else {
    L.open('BEGIN');
    L.line(`${ctx.v} ← ${probe}`);
    chain = writeChain(L, rng, ctx.v, cuts, desc, (band) => L.line(`${ctx.out} ← ${literal(outputs[band])}`));
    L.line(`DISPLAY ${ctx.out}`);
    L.close('END');
  }
  return {
    family: 'branch',
    variant: asFunction ? 'function' : 'program',
    kk: KK_TRACE,
    intro: [],
    code: L.code,
    indexBase: 0,
    usesArrays: false,
    call: asFunction ? { name: ctx.fn, args: [probe] } : undefined,
    asks: [asFunction ? { kind: 'return' } : { kind: 'output' }],
    reason: (r) => chainReason(r, chain, ctx.v, probe),
  };
}

// ---------------------------------------------------------------------------
// Counted, pre-test and post-test loops over one-dimensional arrays
// ---------------------------------------------------------------------------

function loop(rng: Rng, d: Difficulty): TraceCase {
  const variant = pick(rng, ['max-position', 'search-while', 'running-while', 'repeat-count'] as const);
  const base = chooseBase(rng);
  const n = d === 'easy' ? 5 : d === 'normal' ? randInt(rng, 5, 6) : randInt(rng, 6, 7);
  const last = lastIndex(n, base);
  const L = new Listing();
  L.open('BEGIN');

  if (variant === 'max-position') {
    const name = pick(rng, ['temps', 'heights', 'laps', 'sales']);
    const findMax = rng() < 0.6;
    const values = sample(rng, range(10, 40), n);
    if (d !== 'easy') {
      // Repeat the extreme value later, so > versus ≥ decides which position is kept.
      const extreme = findMax ? Math.max(...values) : Math.min(...values);
      const at = values.indexOf(extreme);
      const later = range(at + 1, n - 1).filter((i) => i > at);
      if (later.length) values[pick(rng, later)] = extreme;
      else values[randInt(rng, 0, at - 1)] = extreme;
    }
    const op = findMax ? pick(rng, ['>', '≥']) : pick(rng, ['<', '≤']);
    const best = findMax ? 'highest' : 'lowest';
    L.line(`${name} ← ${literal(values)}`);
    L.line(`${best} ← ${name}[${base}]`);
    L.line(`place ← ${base}`);
    const head = L.open(`FOR i ← ${base + 1} TO ${last}`);
    L.open(`IF ${name}[i] ${op} ${best} THEN`);
    const bestLine = L.line(`${best} ← ${name}[i]`);
    L.line('place ← i');
    L.close('ENDIF');
    L.close('ENDFOR');
    L.line('DISPLAY place');
    L.close('END');
    const ties = INCLUDES_EQUAL.has(op)
      ? `Because the test uses ${op}, a later value equal to ${best} also moves place.`
      : `Because the test uses ${op}, a later value equal to ${best} doesn't move place.`;
    return {
      family: 'loop',
      variant,
      kk: KK_ARRAYS,
      intro: [],
      code: L.code,
      indexBase: base,
      usesArrays: true,
      asks: [
        ...(d === 'easy' ? [] : [{ kind: 'pass', loopLine: head, pass: randInt(rng, 2, n - 2), variable: pick(rng, [best, 'place']) } as Ask]),
        ...(d === 'hard' ? [{ kind: 'line', line: bestLine, occurrence: 2, variable: 'place' } as Ask] : []),
        { kind: 'output' },
      ],
      reason: () => `place keeps the index of the ${best} value found so far. ${ties}`,
    };
  }

  if (variant === 'search-while') {
    const values = sample(rng, range(10, 99), n);
    const present = rng() < (d === 'hard' ? 0.6 : 0.8);
    const missing = range(10, 99).filter((v) => !values.includes(v));
    const target = present ? values[randInt(rng, 1, n - 1)] : pick(rng, missing);
    if (present && d !== 'easy' && rng() < 0.5) {
      const at = values.indexOf(target);
      if (at < n - 1) values[randInt(rng, at + 1, n - 1)] = target;
    }
    L.line(`codes ← ${literal(values)}`);
    L.line(`target ← ${target}`);
    L.line('found ← FALSE');
    L.line(`i ← ${base}`);
    const head = L.open(`WHILE found = FALSE AND i ≤ ${last} DO`);
    L.open('IF codes[i] = target THEN');
    L.line('found ← TRUE');
    L.middle('ELSE');
    L.line('i ← i + 1');
    L.close('ENDIF');
    L.close('ENDWHILE');
    L.line('DISPLAY i');
    L.close('END');
    return {
      family: 'loop',
      variant,
      kk: KK_ARRAYS,
      intro: [],
      code: L.code,
      indexBase: base,
      usesArrays: true,
      asks: [
        ...(d !== 'easy' ? [{ kind: 'pass', loopLine: head, pass: 2, variable: pick(rng, ['i', 'found']) } as Ask] : []),
        { kind: 'output' },
      ],
      reason: (r) =>
        r.output[0] === String(last + 1)
          ? `${target} isn't in codes, so the loop only stops when i passes the last index, ${last}: i ends one past it.`
          : `The WHILE test runs before every pass. The loop stops at the first index holding ${target}, because found becomes TRUE and i isn't increased again.`,
    };
  }

  if (variant === 'running-while') {
    const values = ints(rng, n, 3, 15);
    const total = values.reduce((s, v) => s + v, 0);
    const limit = randInt(rng, Math.floor(total * 0.35), Math.floor(total * 0.8));
    const shows = pick(rng, ['i', 'total'] as const);
    L.line(`sales ← ${literal(values)}`);
    L.line('total ← 0');
    L.line(`i ← ${base}`);
    const head = L.open(`WHILE total < ${limit} AND i ≤ ${last} DO`);
    L.line('total ← total + sales[i]');
    L.line('i ← i + 1');
    L.close('ENDWHILE');
    L.line(`DISPLAY ${shows}`);
    L.close('END');
    return {
      family: 'loop',
      variant,
      kk: KK_ARRAYS,
      intro: [],
      code: L.code,
      indexBase: base,
      usesArrays: true,
      asks: [
        ...(d !== 'easy' ? [{ kind: 'pass', loopLine: head, pass: 2, variable: pick(rng, ['total', 'i']) } as Ask] : []),
        { kind: 'output' },
      ],
      reason: (r, ask) => {
        const n = passesOf(r, head);
        if (ask.kind === 'pass') return `WHILE tests total < ${limit} before each pass, and each pass adds the next value to total and moves i on by 1.`;
        return `WHILE tests total < ${limit} before each pass. After ${n} ${n === 1 ? 'pass' : 'passes'} through the body, total is no longer below ${limit} (or the array has run out), so the loop stops.`;
      },
    };
  }

  // repeat-count: a post-test loop over every element.
  const values = ints(rng, n, 1, 30);
  const test = pick(rng, ['even', 'above'] as const);
  const t = randInt(rng, 8, 22);
  if (test === 'above' && d !== 'easy') values[randInt(rng, 0, n - 1)] = t;
  const cond = test === 'even' ? 'values[i] MOD 2 = 0' : `values[i] > ${t}`;
  const endTest = pick(rng, [`UNTIL i > ${last}`, `UNTIL i = ${last + 1}`]);
  L.line(`values ← ${literal(values)}`);
  L.line('count ← 0');
  L.line(`i ← ${base}`);
  const head = L.open('REPEAT');
  L.open(`IF ${cond} THEN`);
  L.line('count ← count + 1');
  L.close('ENDIF');
  L.line('i ← i + 1');
  L.close(endTest);
  L.line('DISPLAY count');
  L.close('END');
  return {
    family: 'loop',
    variant,
    kk: KK_ARRAYS,
    intro: [],
    code: L.code,
    indexBase: base,
    usesArrays: true,
    asks: [...(d !== 'easy' ? [{ kind: 'pass', loopLine: head, pass: randInt(rng, 2, n - 1), variable: pick(rng, ['count', 'i']) } as Ask] : []), { kind: 'output' }],
    reason: () =>
      `REPEAT tests its condition after each pass, so the body runs for every index from ${base} to ${last}. count goes up only when ${cond} is TRUE${test === 'above' ? `, and a value equal to ${t} isn't greater than ${t}` : ''}.`,
  };
}

// ---------------------------------------------------------------------------
// Two-dimensional arrays
// ---------------------------------------------------------------------------

function gridTable(grid: number[][], base: Base): TerminalBlock {
  return {
    kind: 'table',
    caption: `grid (indexes start at ${base})`,
    columns: ['Row', ...grid[0].map((_, c) => `Column ${c + base}`)],
    rows: grid.map((row, r) => [String(r + base), ...row.map(String)]),
  };
}

const GRID_INTRO = 'The two-dimensional array grid holds the values in the table. grid[row][column] is the value in that row and column.';

function gridCase(rng: Rng, d: Difficulty): TraceCase {
  const base = chooseBase(rng);
  const rows = d === 'hard' ? 4 : 3;
  const cols = d === 'easy' ? 3 : 4;
  const grid = Array.from({ length: rows }, () => ints(rng, cols, 1, d === 'hard' ? 50 : 30));
  const L = new Listing();
  L.open('BEGIN');
  let variant: string;
  let asks: Ask[] = [{ kind: 'output' }];
  let reason: (r: RunResult) => string;

  if (d === 'easy') {
    // Two single cells, chosen so that swapping row and column gives a different value.
    variant = 'cells';
    const cell = (): [number, number] => {
      const [r, c] = sample(rng, range(0, Math.min(rows, cols) - 1), 2);
      if (grid[r][c] === grid[c][r]) grid[r][c] = (grid[c][r] % 30) + 1;
      return [r, c];
    };
    const [r1, c1] = cell();
    const [r2, c2] = cell();
    L.line(`first ← grid[${r1 + base}][${c1 + base}]`);
    L.line(`second ← grid[${r2 + base}][${c2 + base}]`);
    L.line('DISPLAY first + second');
    reason = () => `grid[${r1 + base}][${c1 + base}] is row ${r1 + base}, column ${c1 + base}: the first index picks the row and the second picks the column.`;
  } else if (d === 'normal') {
    const byRow = rng() < 0.5;
    variant = byRow ? 'row-total' : 'column-total';
    const fixed = byRow ? randInt(rng, 0, rows - 1) + base : randInt(rng, 0, cols - 1) + base;
    const count = byRow ? cols : rows;
    L.line('total ← 0');
    const head = byRow ? L.open(`FOR col ← ${base} TO ${lastIndex(cols, base)}`) : L.open(`FOR row ← ${base} TO ${lastIndex(rows, base)}`);
    L.line(byRow ? `total ← total + grid[${fixed}][col]` : `total ← total + grid[row][${fixed}]`);
    L.close('ENDFOR');
    L.line('DISPLAY total');
    asks = [{ kind: 'pass', loopLine: head, pass: randInt(rng, 2, count - 1), variable: 'total' }, { kind: 'output' }];
    reason = () =>
      byRow
        ? `The row index stays at ${fixed} while col moves across, so the loop adds every value in row ${fixed}.`
        : `The column index stays at ${fixed} while row moves down, so the loop adds every value in column ${fixed}.`;
  } else if (rng() < 0.5) {
    variant = 'count-cells';
    const t = randInt(rng, 15, 35);
    grid[randInt(rng, 0, rows - 1)][randInt(rng, 0, cols - 1)] = t;
    L.line('count ← 0');
    const outer = L.open(`FOR row ← ${base} TO ${lastIndex(rows, base)}`);
    L.open(`FOR col ← ${base} TO ${lastIndex(cols, base)}`);
    L.open(`IF grid[row][col] > ${t} THEN`);
    L.line('count ← count + 1');
    L.close('ENDIF');
    L.close('ENDFOR');
    L.close('ENDFOR');
    L.line('DISPLAY count');
    asks = [{ kind: 'pass', loopLine: outer, pass: randInt(rng, 2, rows - 1), variable: 'count' }, { kind: 'output' }];
    reason = () => `The nested loops visit every cell, row by row, and count the values greater than ${t}. A value equal to ${t} isn't counted.`;
  } else {
    variant = 'diagonal';
    L.line('total ← 0');
    const head = L.open(`FOR i ← ${base} TO ${lastIndex(rows, base)}`);
    L.line('total ← total + grid[i][i]');
    L.close('ENDFOR');
    L.line('DISPLAY total');
    asks = [{ kind: 'pass', loopLine: head, pass: randInt(rng, 2, rows - 1), variable: 'total' }, { kind: 'output' }];
    reason = () => `grid[i][i] uses the same index for the row and the column, so the loop adds the diagonal from the top-left corner: grid[${base}][${base}], grid[${base + 1}][${base + 1}] and so on.`;
  }
  L.close('END');
  return {
    family: 'grid',
    variant,
    kk: KK_GRID,
    intro: [GRID_INTRO],
    code: L.code,
    indexBase: base,
    usesArrays: true,
    globals: { grid },
    data: [gridTable(grid, base)],
    asks,
    reason,
  };
}

// ---------------------------------------------------------------------------
// Strings: concatenation and LENGTH
// ---------------------------------------------------------------------------

const FIRST_NAMES = ['Mia', 'Noah', 'Ava', 'Leo', 'Zara', 'Kai', 'Isla', 'Omar', 'Ruby', 'Eli', 'Tahlia', 'Finn', 'Priya', 'Jack'];
const SURNAMES = ['Tran', 'Nguyen', 'Kelly', 'Singh', 'Brown', 'Chen', 'Walker', 'Patel', 'Rossi', 'Moore'];
const WORDS = ['tram', 'wombat', 'gum', 'wattle', 'creek', 'possum', 'reef', 'dingo', 'koala', 'emu', 'magpie', 'jetty', 'swag', 'billy'];

function stringCase(rng: Rng, d: Difficulty): TraceCase {
  const variant = pick(rng, d === 'easy' ? ['join', 'label'] : d === 'normal' ? ['join', 'pattern', 'longest', 'label'] : ['pattern', 'longest', 'sentence']);
  const L = new Listing();
  L.open('BEGIN');
  const base = chooseBase(rng);

  if (variant === 'join') {
    const first = pick(rng, FIRST_NAMES);
    const last = pick(rng, SURNAMES);
    const year = randInt(rng, 7, 12);
    const order = rng() < 0.5;
    L.line(`first ← ${literal(first)}`);
    L.line(`last ← ${literal(last)}`);
    L.line(`year ← ${year}`);
    L.line(order ? 'username ← last + first + year' : 'username ← first + last + year');
    L.line(d === 'easy' || rng() < 0.5 ? 'DISPLAY username' : 'DISPLAY LENGTH(username)');
    L.close('END');
    return {
      family: 'string',
      variant,
      kk: KK_STRING,
      intro: [],
      code: L.code,
      indexBase: 0,
      usesArrays: false,
      asks: [{ kind: 'output' }],
      reason: () => '+ joins strings end to end with no space between them, and a number joined to a string becomes its digits. LENGTH counts every character.',
    };
  }

  if (variant === 'label') {
    const floor = randInt(rng, 1, 9);
    const room = randInt(rng, 1, 30);
    const factor = pick(rng, [100, 10]);
    L.line(`floor ← ${floor}`);
    L.line(`room ← ${room}`);
    L.line(`number ← floor * ${factor} + room`);
    L.line('label ← "Room " + number');
    const measure = rng() < 0.5;
    L.line(measure ? 'DISPLAY LENGTH(label)' : 'DISPLAY label');
    L.close('END');
    return {
      family: 'string',
      variant,
      kk: KK_STRING,
      intro: [],
      code: L.code,
      indexBase: 0,
      usesArrays: false,
      asks: [{ kind: 'output' }],
      reason: () =>
        `number is worked out first with arithmetic (floor * ${factor} + room). Then + joins "Room " and the digits of number${measure ? ', and LENGTH counts every character, including the space' : ''}.`,
    };
  }

  if (variant === 'pattern') {
    const n = randInt(rng, 4, d === 'hard' ? 7 : 6);
    const m = d === 'hard' ? pick(rng, [2, 3]) : 2;
    const [a, b] = pick(rng, [['#', '*'], ['*', '-'], ['+', '='], ['o', 'x']] as const);
    L.line('line ← ""');
    const head = L.open(`FOR i ← 1 TO ${n}`);
    L.open(`IF i MOD ${m} = 0 THEN`);
    L.line(`line ← line + ${literal(a)}`);
    L.middle('ELSE');
    L.line(`line ← line + ${literal(b)}`);
    L.close('ENDIF');
    L.close('ENDFOR');
    L.line(d === 'hard' && rng() < 0.5 ? 'DISPLAY LENGTH(line)' : 'DISPLAY line');
    L.close('END');
    return {
      family: 'string',
      variant,
      kk: KK_STRING,
      intro: [],
      code: L.code,
      indexBase: 0,
      usesArrays: false,
      asks: [{ kind: 'pass', loopLine: head, pass: randInt(rng, 2, n - 1), variable: 'line' }, { kind: 'output' }],
      reason: () => `i MOD ${m} = 0 is TRUE when i is a multiple of ${m}, so those passes add ${a} and the others add ${b}.`,
    };
  }

  if (variant === 'longest') {
    const n = d === 'hard' ? 5 : 4;
    const words = sample(rng, WORDS, n);
    const op = d === 'hard' ? pick(rng, ['>', '≥']) : '>';
    L.line(`words ← ${literal(words)}`);
    L.line(`longest ← words[${base}]`);
    const head = L.open(`FOR i ← ${base + 1} TO ${lastIndex(n, base)}`);
    L.open(`IF LENGTH(words[i]) ${op} LENGTH(longest) THEN`);
    L.line('longest ← words[i]');
    L.close('ENDIF');
    L.close('ENDFOR');
    L.line(pick(rng, ['DISPLAY longest', 'DISPLAY LENGTH(longest)']));
    L.close('END');
    return {
      family: 'string',
      variant,
      kk: KK_STRING,
      intro: [],
      code: L.code,
      indexBase: base,
      usesArrays: true,
      asks: [{ kind: 'pass', loopLine: head, pass: randInt(rng, 1, n - 2), variable: 'longest' }, { kind: 'output' }],
      reason: () =>
        op === '>'
          ? 'longest only changes when a word has more characters than it; a later word of the same length doesn’t replace it.'
          : 'Because the test uses ≥, a later word of the same length also replaces longest.',
    };
  }

  // sentence: joins words with a space after each, then measures the result.
  const n = randInt(rng, 3, 4);
  const words = sample(rng, WORDS, n);
  L.line(`words ← ${literal(words)}`);
  L.line('message ← ""');
  const head = L.open(`FOR i ← ${base} TO ${lastIndex(n, base)}`);
  L.line('message ← message + words[i] + " "');
  L.close('ENDFOR');
  L.line('DISPLAY LENGTH(message)');
  L.close('END');
  return {
    family: 'string',
    variant: 'sentence',
    kk: KK_STRING,
    intro: [],
    code: L.code,
    indexBase: base,
    usesArrays: true,
    asks: [{ kind: 'pass', loopLine: head, pass: 2, variable: 'message' }, { kind: 'output' }],
    reason: () => `Each pass adds a word and then a space, so message ends with a space, and LENGTH counts all ${n} spaces as well as the letters.`,
  };
}

// ---------------------------------------------------------------------------
// Functions with parameters and return values
// ---------------------------------------------------------------------------

function functionCase(rng: Rng, d: Difficulty): TraceCase {
  const variant = pick(rng, d === 'easy' ? ['power', 'clamp'] : ['power', 'count-above', 'average', 'clamp']);
  const L = new Listing();

  if (variant === 'power') {
    const b = randInt(rng, 2, 5);
    const e = randInt(rng, 3, b > 3 ? 4 : 5);
    L.open('FUNCTION power(base, exponent)');
    L.line('result ← 1');
    const head = L.open('FOR i ← 1 TO exponent');
    L.line('result ← result * base');
    L.close('ENDFOR');
    L.line('RETURN result');
    L.close('ENDFUNCTION');
    return {
      family: 'function',
      variant,
      kk: KK_TRACE,
      intro: [],
      code: L.code,
      indexBase: 0,
      usesArrays: false,
      call: { name: 'power', args: [b, e] },
      asks: [...(d === 'easy' ? [] : [{ kind: 'pass', loopLine: head, pass: randInt(rng, 2, e - 1), variable: 'result' } as Ask]), { kind: 'return' }],
      reason: () => `The parameters take the values in the call: base is ${b} and exponent is ${e}. result starts at 1 and is multiplied by base once per pass, ${e} times.`,
    };
  }

  if (variant === 'clamp') {
    const low = randInt(rng, 1, 5) * 10;
    const high = low + randInt(rng, 3, 8) * 10;
    const value = pick(rng, [low, high, low - randInt(rng, 1, 9), high + randInt(rng, 1, 9), low + randInt(rng, 1, 9)]);
    const strict = rng() < 0.5;
    L.open('FUNCTION clamp(value, low, high)');
    L.open(strict ? 'IF value < low THEN' : 'IF value ≤ low THEN');
    L.line('RETURN low');
    L.middle(strict ? 'ELSEIF value > high THEN' : 'ELSEIF value ≥ high THEN');
    L.line('RETURN high');
    L.close('ENDIF');
    L.line('RETURN value');
    L.close('ENDFUNCTION');
    return {
      family: 'function',
      variant,
      kk: KK_TRACE,
      intro: [],
      code: L.code,
      indexBase: 0,
      usesArrays: false,
      call: { name: 'clamp', args: [value, low, high] },
      asks: [{ kind: 'return' }],
      reason: () => `In the call, value is ${value}, low is ${low} and high is ${high}. The first RETURN that runs ends the function and gives its result.`,
    };
  }

  const base = chooseBase(rng);
  const loopHead = base === 0 ? 'FOR i ← 0 TO LENGTH(values) - 1' : 'FOR i ← 1 TO LENGTH(values)';

  if (variant === 'count-above') {
    const n = randInt(rng, 5, 6);
    const limit = randInt(rng, 5, 15);
    const values = ints(rng, n, 1, 20);
    values[randInt(rng, 0, n - 1)] = limit;
    const op = pick(rng, ['>', '≥']);
    L.open('FUNCTION countAbove(values, limit)');
    L.line('count ← 0');
    const head = L.open(loopHead);
    L.open(`IF values[i] ${op} limit THEN`);
    L.line('count ← count + 1');
    L.close('ENDIF');
    L.close('ENDFOR');
    L.line('RETURN count');
    L.close('ENDFUNCTION');
    return {
      family: 'function',
      variant,
      kk: KK_ARRAYS,
      intro: [],
      code: L.code,
      indexBase: base,
      usesArrays: true,
      call: { name: 'countAbove', args: [values, limit] },
      asks: [...(d === 'hard' ? [{ kind: 'pass', loopLine: head, pass: randInt(rng, 2, n - 1), variable: 'count' } as Ask] : []), { kind: 'return' }],
      reason: () => `values holds the array in the call and limit is ${limit}. A value equal to ${limit} ${op === '≥' ? 'is' : "isn't"} counted, because the test uses ${op}.`,
    };
  }

  // average: a floating point result from /.
  const n = pick(rng, [4, 5, 8]);
  let values: number[];
  do values = ints(rng, n, 2, 20);
  while (values.reduce((s, v) => s + v, 0) % n === 0);
  L.open('FUNCTION average(values)');
  L.line('total ← 0');
  const head = L.open(loopHead);
  L.line('total ← total + values[i]');
  L.close('ENDFOR');
  L.line('RETURN total / LENGTH(values)');
  L.close('ENDFUNCTION');
  return {
    family: 'function',
    variant,
    kk: KK_ARRAYS,
    intro: [],
    code: L.code,
    indexBase: base,
    usesArrays: true,
    call: { name: 'average', args: [values] },
    asks: [...(d === 'hard' ? [{ kind: 'pass', loopLine: head, pass: randInt(rng, 2, n - 1), variable: 'total' } as Ask] : []), { kind: 'return' }],
    reason: (r, ask) =>
      ask.kind === 'pass'
        ? 'Each pass adds the next value to total.'
        : `The loop adds all ${n} values, giving a total of ${totalOf(r)}, then / divides by LENGTH(values), which is ${n}. / always gives a floating point result.`,
  };
}

function totalOf(r: RunResult): string {
  const last = [...r.trace].reverse().find((s) => s.vars.total !== undefined);
  return last ? String(last.vars.total) : 'the sum';
}

// ---------------------------------------------------------------------------
// Hard mode: nested loops
// ---------------------------------------------------------------------------

function nested(rng: Rng): TraceCase {
  const variant = pick(rng, ['pairs', 'multiples', 'triangle'] as const);
  const L = new Listing();
  L.open('BEGIN');
  if (variant === 'triangle') {
    const n = randInt(rng, 3, 5);
    const [a, b] = pick(rng, [['*', '#'], ['o', '-'], ['+', 'x']] as const);
    const alternate = rng() < 0.5;
    const outer = L.open(`FOR i ← 1 TO ${n}`);
    L.line('row ← ""');
    L.open('FOR j ← 1 TO i');
    if (alternate) {
      L.open('IF j MOD 2 = 0 THEN');
      L.line(`row ← row + ${literal(b)}`);
      L.middle('ELSE');
      L.line(`row ← row + ${literal(a)}`);
      L.close('ENDIF');
    } else {
      L.line(`row ← row + ${literal(a)}`);
    }
    L.close('ENDFOR');
    L.line('DISPLAY row');
    L.close('ENDFOR');
    L.close('END');
    return {
      family: 'nested',
      variant,
      kk: KK_TRACE,
      intro: [],
      code: L.code,
      indexBase: 0,
      usesArrays: false,
      asks: [{ kind: 'pass', loopLine: outer, pass: randInt(rng, 2, n - 1), variable: 'row' }, { kind: 'output' }],
      reason: () => `For each i, the inner loop runs i times, so each row is one character longer than the one before, and DISPLAY runs once per pass of the outer loop.`,
    };
  }
  const n = randInt(rng, 3, 5);
  const startAt = pick(rng, ['i', 'i + 1', '1'] as const);
  L.line('count ← 0');
  const outer = L.open(`FOR i ← 1 TO ${n}`);
  L.open(`FOR j ← ${startAt} TO ${n}`);
  let countLine: number;
  let reason: string;
  if (variant === 'pairs') {
    countLine = L.line('count ← count + 1');
    reason = `The inner loop starts at ${startAt}, so it runs a different number of times on each pass of the outer loop. Add the passes: count goes up once per inner pass.`;
  } else {
    const m = randInt(rng, 2, 4);
    L.open(`IF (i + j) MOD ${m} = 0 THEN`);
    countLine = L.line('count ← count + 1');
    L.close('ENDIF');
    reason = `count goes up only when i + j is a multiple of ${m}. The inner loop starts at ${startAt}, so list the pairs (i, j) it visits on each outer pass.`;
  }
  L.close('ENDFOR');
  L.close('ENDFOR');
  L.line('DISPLAY count');
  L.close('END');
  return {
    family: 'nested',
    variant,
    kk: KK_TRACE,
    intro: [],
    code: L.code,
    indexBase: 0,
    usesArrays: false,
    asks: [
      pick(rng, [
        { kind: 'pass', loopLine: outer, pass: randInt(rng, 2, n - 1), variable: 'count' } as Ask,
        { kind: 'line', line: countLine, occurrence: randInt(rng, 3, 5), variable: 'j' } as Ask,
      ]),
      { kind: 'output' },
    ],
    reason: () => reason,
  };
}

// ---------------------------------------------------------------------------
// Hard mode: off-by-one traps
// ---------------------------------------------------------------------------

function offByOne(rng: Rng): TraceCase {
  const variant = pick(rng, ['short-loop', 'while-less', 'repeat-once', 'adjacent', 'last-index'] as const);
  const base = chooseBase(rng);
  const L = new Listing();
  L.open('BEGIN');

  if (variant === 'short-loop') {
    const n = randInt(rng, 5, 6);
    const values = ints(rng, n, 2, 25);
    L.line(`values ← ${literal(values)}`);
    L.line('total ← 0');
    L.open('FOR i ← 1 TO LENGTH(values) - 1');
    L.line('total ← total + values[i]');
    L.close('ENDFOR');
    L.line('DISPLAY total');
    L.close('END');
    return {
      family: 'offbyone',
      variant,
      kk: KK_ARRAYS,
      intro: [],
      code: L.code,
      indexBase: base,
      usesArrays: true,
      asks: [{ kind: 'output' }],
      reason: () =>
        base === 0
          ? `Indexes start at 0, but the loop starts at 1, so values[0] (${values[0]}) is never added. It ends at LENGTH(values) - 1, the last index.`
          : `Indexes start at 1, so the last index is LENGTH(values). The loop stops at LENGTH(values) - 1, so the last value (${values[n - 1]}) is never added.`,
    };
  }

  if (variant === 'while-less') {
    const step = pick(rng, [2, 3, 5]);
    const start = randInt(rng, 0, 4);
    const passes = randInt(rng, 3, 6);
    const end = start + step * passes;
    const op = pick(rng, ['<', '≤']);
    L.line(`i ← ${start}`);
    L.line('count ← 0');
    L.open(`WHILE i ${op} ${end} DO`);
    L.line('count ← count + 1');
    L.line(`i ← i + ${step}`);
    L.close('ENDWHILE');
    L.line(pick(rng, ['DISPLAY count', 'DISPLAY i']));
    L.close('END');
    return {
      family: 'offbyone',
      variant,
      kk: KK_TRACE,
      intro: [],
      code: L.code,
      indexBase: 0,
      usesArrays: false,
      asks: [{ kind: 'output' }],
      reason: () =>
        op === '<'
          ? `i reaches exactly ${end}, but ${end} < ${end} is FALSE, so the loop stops without a pass for i = ${end}.`
          : `i reaches exactly ${end}, and ${end} ≤ ${end} is TRUE, so the loop runs one more pass before stopping.`,
    };
  }

  if (variant === 'repeat-once') {
    const limit = randInt(rng, 5, 20) * 10;
    const balance = limit + randInt(rng, 1, 5) * 10;
    const add = randInt(rng, 1, 5) * 10;
    L.line(`balance ← ${balance}`);
    L.line('years ← 0');
    L.open('REPEAT');
    L.line(`balance ← balance + ${add}`);
    L.line('years ← years + 1');
    L.close(`UNTIL balance ≥ ${limit}`);
    L.line(pick(rng, ['DISPLAY years', 'DISPLAY balance']));
    L.close('END');
    return {
      family: 'offbyone',
      variant,
      kk: KK_TRACE,
      intro: [],
      code: L.code,
      indexBase: 0,
      usesArrays: false,
      asks: [{ kind: 'output' }],
      reason: () => `balance already meets the UNTIL condition, but REPEAT runs its body before it tests the condition, so the body runs once.`,
    };
  }

  if (variant === 'adjacent') {
    const n = randInt(rng, 5, 7);
    const values = ints(rng, n, 1, 20);
    const last = lastIndex(n, base);
    L.line(`temps ← ${literal(values)}`);
    L.line('rises ← 0');
    L.open(`FOR i ← ${base} TO ${last - 1}`);
    L.open('IF temps[i + 1] > temps[i] THEN');
    L.line('rises ← rises + 1');
    L.close('ENDIF');
    L.close('ENDFOR');
    L.line('DISPLAY rises');
    L.close('END');
    return {
      family: 'offbyone',
      variant,
      kk: KK_ARRAYS,
      intro: [],
      code: L.code,
      indexBase: base,
      usesArrays: true,
      asks: [{ kind: 'output' }],
      reason: () => `Each pass compares a value with the one after it, so there are ${n - 1} comparisons for ${n} values. A value equal to the one before it isn't a rise.`,
    };
  }

  // last-index: values[LENGTH(values) - 1] is the last element only when indexes start at 0.
  const n = randInt(rng, 4, 6);
  const values = sample(rng, range(10, 60), n);
  L.line(`values ← ${literal(values)}`);
  L.line('lastValue ← values[LENGTH(values) - 1]');
  L.line('DISPLAY lastValue');
  L.close('END');
  return {
    family: 'offbyone',
    variant,
    kk: KK_ARRAYS,
    intro: [],
    code: L.code,
    indexBase: base,
    usesArrays: true,
    asks: [{ kind: 'output' }],
    reason: () =>
      base === 0
        ? `LENGTH(values) is ${n} and indexes run from 0 to ${n - 1}, so values[${n - 1}] is the last value.`
        : `LENGTH(values) is ${n} and indexes run from 1 to ${n}, so values[${n - 1}] is the second-last value, not the last.`,
  };
}

export const TEMPLATES: Record<TraceFamily, (rng: Rng, d: Difficulty) => TraceCase> = {
  accumulate,
  branch,
  loop,
  grid: gridCase,
  string: stringCase,
  function: functionCase,
  nested: (rng) => nested(rng),
  offbyone: (rng) => offByOne(rng),
};
