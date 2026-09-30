/**
 * `deskcheck` test tables: a function, its requirements, and a request for test inputs. The checker
 * runs the interpreter on every input to confirm that the inputs reach every branch and test every
 * boundary from both sides, then prints the test table (Test number, Input(s), Expected output,
 * Actual output) with Actual output left blank for the student to fill in when they run the code.
 *
 * Boundaries, as the item states them: for each band, its lowest value and the value just below it
 * (so a band starting at 65 needs 65 and 64). Hard items also validate the input, which adds the
 * lowest and highest valid values and the invalid values just outside them.
 */
import type { KkId } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import { formatAnd, parseIntList } from '../answers';
import { mulberry32, pick, randInt, sample, type Rng } from '../prng';
import type { CheckResult, Difficulty, QuizItem } from '../types';
import { callFunction, formatValue, parseProgram, timesRun, type Program } from './interpreter';
import { Listing, literal } from './listing';

export const TESTTABLE_KK: KkId[] = ['U3O1-KK14', 'U4O1-KK06'];
export const TEST_TABLE_COLUMNS = ['Test number', 'Input(s)', 'Expected output', 'Actual output'];
const MAX_INPUTS = 20;
const INVALID = 'Invalid';

interface TableContext {
  fn: string;
  param: string;
  out: string;
  /** Column heading for the input in the requirements table. */
  heading: string;
  /** "a mark", "an age in years". */
  noun: string;
  lo: number;
  hi: number;
  step: number;
  /** One output per band, lowest band first. */
  outputs: readonly (number | string)[];
}

const CONTEXTS: readonly TableContext[] = [
  { fn: 'gradeFor', param: 'mark', out: 'grade', heading: 'Mark', noun: 'a mark', lo: 0, hi: 100, step: 5, outputs: ['N', 'C', 'B', 'A'] },
  { fn: 'ticketPrice', param: 'age', out: 'price', heading: 'Age (years)', noun: 'an age in years', lo: 0, hi: 120, step: 1, outputs: [0, 12, 20, 14] },
  { fn: 'shippingCost', param: 'weight', out: 'cost', heading: 'Weight (kg)', noun: 'a weight in whole kilograms', lo: 1, hi: 30, step: 1, outputs: [8, 15, 25, 40] },
  { fn: 'batteryStatus', param: 'level', out: 'status', heading: 'Battery level (%)', noun: 'a battery level', lo: 0, hi: 100, step: 5, outputs: ['Critical', 'Low', 'Fair', 'Full'] },
  { fn: 'levelFor', param: 'points', out: 'level', heading: 'Points', noun: 'a points total', lo: 0, hi: 1000, step: 50, outputs: ['Bronze', 'Silver', 'Gold', 'Platinum'] },
];

export type TableStyle = 'desc-ge' | 'desc-gt' | 'asc-lt' | 'asc-le';

export interface TableSpec {
  context: TableContext;
  /** The lowest value of bands 1 to k - 1, ascending. */
  cuts: number[];
  outputs: (number | string)[];
  style: TableStyle;
  /** Hard items reject inputs outside [lo, hi] with "Invalid". */
  validates: boolean;
  code: string;
  /** Condition lines and the first line of each branch body, in listing order. */
  branches: { line: number; output: number | string }[];
  /** Boundary pairs [just below, lowest of band], with what each side returns. */
  boundaries: { below: number; at: number; label: string }[];
}

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function cutsFor(rng: Rng, ctx: TableContext, count: number): number[] {
  const candidates = range(ctx.lo + ctx.step, ctx.hi - ctx.step).filter((x) => x % ctx.step === 0);
  const gap = Math.max(3, ctx.step * 2);
  for (let tries = 0; tries < 100; tries++) {
    const cuts = sample(rng, candidates, count).sort((a, b) => a - b);
    if (cuts.every((c, i) => i === 0 || c - cuts[i - 1] >= gap)) return cuts;
  }
  const span = (ctx.hi - ctx.lo) / (count + 1);
  return range(1, count).map((i) => Math.round((ctx.lo + span * i) / ctx.step) * ctx.step);
}

/** Builds the listing and its boundaries. Exposed for the tests. */
export function tableSpec(seed: number, difficulty: Difficulty): TableSpec {
  const rng = mulberry32(seed);
  const context = pick(rng, CONTEXTS);
  const k = difficulty === 'easy' ? 3 : randInt(rng, 3, 4);
  const cuts = cutsFor(rng, context, k - 1);
  const outputs = context.outputs.slice(0, k);
  const style = pick(rng, ['desc-ge', 'desc-gt', 'asc-lt', 'asc-le'] as const);
  const validates = difficulty === 'hard';
  const { param, out } = context;
  const L = new Listing();
  const branches: TableSpec['branches'] = [];
  L.open(`FUNCTION ${context.fn}(${param})`);
  let first = true;
  const cond = (text: string) => {
    const line = first ? L.open(`IF ${text} THEN`) : L.middle(`ELSEIF ${text} THEN`);
    first = false;
    return line;
  };
  const body = (output: number | string) => {
    branches.push({ line: L.line(`${out} ← ${literal(output)}`), output });
  };
  if (validates) {
    cond(`${param} < ${context.lo} OR ${param} > ${context.hi}`);
    body(INVALID);
  }
  const desc = style.startsWith('desc');
  const order = desc ? range(1, k - 1).reverse() : range(0, k - 2);
  for (const band of order) {
    // Band j covers cuts[j - 1] up to cuts[j] - 1.
    if (style === 'desc-ge') cond(`${param} ≥ ${cuts[band - 1]}`);
    else if (style === 'desc-gt') cond(`${param} > ${cuts[band - 1] - 1}`);
    else if (style === 'asc-lt') cond(`${param} < ${cuts[band]}`);
    else cond(`${param} ≤ ${cuts[band] - 1}`);
    body(outputs[band]);
  }
  L.middle('ELSE');
  body(outputs[desc ? 0 : k - 1]);
  L.close('ENDIF');
  L.line(`RETURN ${out}`);
  L.close('ENDFUNCTION');

  const show = (o: number | string) => formatValue(o);
  const boundaries: TableSpec['boundaries'] = [];
  if (validates) boundaries.push({ below: context.lo - 1, at: context.lo, label: `either side of the lowest valid input, ${context.lo}` });
  cuts.forEach((c, j) => boundaries.push({ below: c - 1, at: c, label: `where the result changes from ${show(outputs[j])} to ${show(outputs[j + 1])}` }));
  if (validates) boundaries.push({ below: context.hi, at: context.hi + 1, label: `either side of the highest valid input, ${context.hi}` });
  return { context, cuts, outputs, style, validates, code: L.code, branches, boundaries };
}

/** The requirements as a table: each band's range and output, lowest band first. */
export function requirementsTable(spec: TableSpec): TerminalBlock {
  const { context, cuts, outputs } = spec;
  const bounds = [context.lo, ...cuts, context.hi + 1];
  const rows = outputs.map((o, j) => [`${bounds[j]} to ${bounds[j + 1] - 1}`, formatValue(o)]);
  if (spec.validates) rows.push([`Below ${context.lo} or above ${context.hi}`, INVALID]);
  return { kind: 'table', caption: `What ${context.fn} returns`, columns: [context.heading, 'Returns'], rows };
}

export interface TestTableResult {
  inputs: number[];
  outputs: string[];
  missingBoundaries: TableSpec['boundaries'];
  missingBranches: TableSpec['branches'];
}

/** Runs every input through the function and works out what the set is missing. */
export function evaluateInputs(spec: TableSpec, program: Program, inputs: readonly number[]): TestTableResult {
  const hit = new Set<number>();
  const outputs = inputs.map((x) => {
    const r = callFunction(program, spec.context.fn, [x], { indexBase: 0 });
    for (const b of spec.branches) if (timesRun(r, b.line) > 0) hit.add(b.line);
    return formatValue(r.returned!);
  });
  const typed = new Set(inputs);
  const missingBoundaries = spec.boundaries.filter((b) => !typed.has(b.below) || !typed.has(b.at));
  const missingBranches = spec.branches.filter((b) => !hit.has(b.line));
  return { inputs: [...inputs], outputs, missingBoundaries, missingBranches };
}

export function testTable(result: Pick<TestTableResult, 'inputs' | 'outputs'>): TerminalBlock {
  return {
    kind: 'table',
    caption: 'Test table (fill in Actual output when you run the code)',
    columns: TEST_TABLE_COLUMNS,
    rows: result.inputs.map((x, i) => [String(i + 1), String(x), result.outputs[i], '']),
  };
}

/** The smallest complete set: both sides of every boundary, ascending. */
export function minimalInputs(spec: TableSpec): number[] {
  return [...new Set(spec.boundaries.flatMap((b) => [b.below, b.at]))].sort((a, b) => a - b);
}

export function testTableItem(seed: number, difficulty: Difficulty): QuizItem {
  const spec = tableSpec(seed, difficulty);
  const program = parseProgram(spec.code);
  const { context } = spec;
  const complete = minimalInputs(spec);
  const expected = complete.join(', ');
  const validRule = spec.validates
    ? ` It must also reject anything outside ${context.lo} to ${context.hi} by returning "${INVALID}".`
    : ` The input is always ${context.noun} from ${context.lo} to ${context.hi}.`;
  const boundaryRule = spec.validates
    ? 'Test each boundary from both sides: the lowest value of each band and the value just below it, plus the lowest and highest valid inputs and the invalid values just outside them.'
    : 'Test each boundary from both sides: the lowest value of each band and the value just below it.';
  const prompt: TerminalBlock[] = [
    { kind: 'text', text: `Requirements: ${context.fn}(${context.param}) takes ${context.noun} and returns the value in the table.${validRule}` },
    requirementsTable(spec),
    { kind: 'pseudo', code: spec.code },
    { kind: 'text', text: 'Which test inputs belong in a test table for this function?', tone: 'accent' },
    { kind: 'text', text: `Include an input for every branch. ${boundaryRule}`, tone: 'muted' },
    { kind: 'text', text: 'Type whole numbers separated by spaces or commas, in any order.', tone: 'muted' },
  ];

  return {
    id: 'gen-deskcheck-testtable',
    kk: TESTTABLE_KK,
    instance: `deskcheck:testtable:seed=${seed}:${difficulty}`,
    prompt,
    check(input): CheckResult {
      const typed = parseIntList(input);
      if (!typed) return { correct: false, expected, reason: 'Type the test inputs as whole numbers separated by spaces or commas, for example 3 10 25.', counted: false };
      const inputs = [...new Set(typed)];
      if (inputs.length > MAX_INPUTS) return { correct: false, expected, reason: `Keep the test table to ${MAX_INPUTS} inputs or fewer.`, counted: false };
      if (!spec.validates) {
        const outside = inputs.find((x) => x < context.lo || x > context.hi);
        if (outside !== undefined) {
          return { correct: false, expected, reason: `${context.param} is always from ${context.lo} to ${context.hi}, so ${outside} can't be a test input here.`, counted: false };
        }
      }
      const result = evaluateInputs(spec, program, inputs);
      const correct = result.missingBoundaries.length === 0 && result.missingBranches.length === 0;
      const problems: string[] = [];
      const branches = result.missingBranches;
      if (branches.length === 1) {
        problems.push(`No input reaches the branch on line ${branches[0].line} that returns ${formatValue(branches[0].output)}.`);
      } else if (branches.length) {
        problems.push(
          `No input reaches the branches that return ${formatAnd(branches.map((b) => formatValue(b.output)))} (lines ${formatAnd(branches.map((b) => b.line))}).`,
        );
      }
      if (result.missingBoundaries.length) {
        const gaps = result.missingBoundaries.map((b) => `${formatAnd([b.below, b.at].filter((v) => !inputs.includes(v)))} (${b.label})`);
        problems.push(`Missing boundary values: ${gaps.join('; ')}.`);
      }
      const reason = correct
        ? `Your inputs reach every branch and test both sides of every boundary (${spec.boundaries.map((b) => `${b.below} and ${b.at}`).join('; ')}).`
        : problems.join(' ');
      return { correct, expected, reason, followUp: [testTable(result)] };
    },
  };
}
