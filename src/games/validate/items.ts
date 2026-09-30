/**
 * `validate` items. A round takes two fields. For each, a batch of four test inputs appears as a
 * table that fills in as the student names the check that rejects each input (or "valid"), then
 * one question asks for the field's boundary test values. Each item stands alone for the daily
 * challenge; instances ("validate:check:seed=12:i=2:normal") regenerate them exactly.
 */
import type { KkId } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import { normaliseAnswer, parseList } from '../../lib/text';
import { formatAnd } from '../answers';
import { childSeed, mulberry32, pick, randInt } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { batchFor, explain, fieldFor, firstFailedCheck, formatBound, parseDate, specText, type FieldKind, type FieldSpec, type Verdict } from './fields';

export const VALIDATE_KINDS = ['check', 'boundary'] as const;
export type ValidateKind = (typeof VALIDATE_KINDS)[number];

export interface ValidateSpec {
  kind: ValidateKind;
  /** The field's seed: the same seed gives the same field and batch. */
  seed: number;
  /** For 'check': which input of the batch (0-based). */
  index?: number;
}

export const CHECK_KK: KkId[] = ['U3O1-KK10', 'U4O1-KK05'];
export const BOUNDARY_KK: KkId[] = ['U3O1-KK10', 'U3O1-KK14'];
export const BATCH_SIZE = 4;
export const VERDICT_CHIPS = ['existence', 'type', 'range', 'valid'];

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export function fieldAndBatch(seed: number, difficulty: Difficulty): { spec: FieldSpec; inputs: string[] } {
  const rng = mulberry32(seed);
  const spec = fieldFor(rng, difficulty);
  return { spec, inputs: batchFor(rng, spec, BATCH_SIZE) };
}

const VERDICT_WORDS: Record<string, Verdict> = {
  existence: 'existence',
  exist: 'existence',
  exists: 'existence',
  e: 'existence',
  type: 'type',
  t: 'type',
  range: 'range',
  r: 'range',
  valid: 'valid',
  v: 'valid',
};

/** "Range", "range check", "the type check" and "v" all parse. Null for anything else. */
export function parseVerdict(input: string): Verdict | null {
  const words = normaliseAnswer(input)
    .split(/\s+/)
    .filter((w) => !['the', 'a', 'check', 'checks', 'it', 'is'].includes(w));
  return words.length === 1 ? (VERDICT_WORDS[words[0]] ?? null) : null;
}

export function verdictLabel(v: Verdict): string {
  return v === 'valid' ? 'Valid' : `${v.charAt(0).toUpperCase()}${v.slice(1)} check`;
}

function shown(input: string): string {
  return input === '' ? '(nothing entered)' : `"${input}"`;
}

function specBlock(spec: FieldSpec): TerminalBlock {
  return { kind: 'pre', text: specText(spec), label: 'Field specification' };
}

function rules(spec: FieldSpec): string {
  const extra = [
    spec.required ? '' : 'An optional field left blank is valid.',
    spec.kind === 'text' ? 'For text, the range check tests the number of characters.' : '',
  ].filter(Boolean);
  return ['Checks run in this order: existence, then type, then range. The first check that fails rejects the input.', ...extra].join(' ');
}

export function checkItem(seed: number, index: number, difficulty: Difficulty): QuizItem {
  const { spec, inputs } = fieldAndBatch(seed, difficulty);
  const at = Math.max(0, Math.min(inputs.length - 1, index));
  const input = inputs[at];
  const answer = firstFailedCheck(spec, input);
  const expected = verdictLabel(answer);
  const rows = inputs.map((x, i) => [String(i + 1), shown(x), i < at ? verdictLabel(firstFailedCheck(spec, x)).toLowerCase() : i === at ? '?' : '']);
  const unparsed = 'Type existence, type or range, or valid if no check rejects it.';
  return {
    id: 'gen-validate-check',
    kk: CHECK_KK,
    instance: `validate:check:seed=${seed}:i=${at}:${difficulty}`,
    chips: VERDICT_CHIPS,
    prompt: [
      specBlock(spec),
      { kind: 'text', text: rules(spec), tone: 'muted' },
      { kind: 'table', caption: 'Test inputs (entered text is shown in quotes)', columns: ['Input', 'Entered', 'Result'], rows },
      { kind: 'text', text: `Which check rejects input ${at + 1}, ${shown(input)}?`, tone: 'accent' },
      { kind: 'text', text: unparsed, tone: 'muted' },
    ],
    check(typed) {
      const verdict = parseVerdict(typed);
      if (!verdict) return { correct: false, expected, reason: unparsed, counted: false };
      return { correct: verdict === answer, expected, reason: explain(spec, input) };
    },
  };
}

// ---------------------------------------------------------------------------
// Boundary test values
// ---------------------------------------------------------------------------

export type BoundaryAsk = 'valid-ends' | 'outside' | 'all-four';

export interface BoundarySpec {
  spec: FieldSpec;
  ask: BoundaryAsk;
  /** The values asked for, as numbers (day numbers for dates, lengths for text). */
  values: number[];
}

function stepOf(spec: FieldSpec): number {
  return spec.kind === 'decimal' ? 10 ** -spec.places : 1;
}

export function boundarySpec(seed: number, difficulty: Difficulty): BoundarySpec {
  const { spec } = fieldAndBatch(seed, difficulty);
  const rng = mulberry32(childSeed(seed, 'boundary'));
  const step = stepOf(spec);
  const exact = spec.min === spec.max;
  const ask: BoundaryAsk = exact ? 'outside' : difficulty === 'easy' ? pick(rng, ['valid-ends', 'outside'] as const) : pick(rng, ['valid-ends', 'outside', 'all-four'] as const);
  const round = (v: number) => (spec.kind === 'decimal' ? Number(v.toFixed(spec.places)) : v);
  const ends = [spec.min, spec.max];
  const outside = [round(spec.min - step), round(spec.max + step)];
  const values = ask === 'valid-ends' ? ends : ask === 'outside' ? outside : [...ends, ...outside];
  return { spec, ask, values };
}

function formatValue(spec: FieldSpec, v: number): string {
  return spec.kind === 'text' ? String(v) : formatBound(spec, v);
}

/** Parses one typed boundary value for the field's kind, or null. */
function parseValue(kind: FieldKind, token: string): number | null {
  if (kind === 'date') return parseDate(token);
  if (kind === 'decimal') return /^\d+(\.\d+)?$/.test(token) ? Number(token) : null;
  return /^\d+$/.test(token) ? Number(token) : null;
}

export function boundaryItem(seed: number, difficulty: Difficulty): QuizItem {
  const { spec, ask, values } = boundarySpec(seed, difficulty);
  const what = spec.kind === 'text' ? 'lengths' : 'values';
  const one = spec.kind === 'text' ? 'length' : 'value';
  const question =
    ask === 'valid-ends'
      ? `Which two ${what} test the ends of the valid range? Type the lowest valid ${one} and the highest valid ${one}.`
      : ask === 'outside'
        ? `Which two invalid ${what} sit just outside the valid range? Type the nearest invalid ${one} below it and the nearest invalid ${one} above it.`
        : `Which four ${what} test the boundaries? Type the lowest and highest valid ${what}, and the nearest invalid ${one} on each side.`;
  const format =
    spec.kind === 'date'
      ? 'Type dates as DD/MM/YYYY, separated by spaces or commas, in any order.'
      : spec.kind === 'decimal'
        ? `Give values to ${spec.places === 1 ? 'one decimal place' : 'two decimal places'}, separated by spaces or commas, in any order.`
        : spec.kind === 'text'
          ? 'Type the lengths in characters as whole numbers, separated by spaces or commas, in any order.'
          : 'Type whole numbers separated by spaces or commas, in any order.';
  const expected = values.map((v) => formatValue(spec, v)).join(', ');
  const step = stepOf(spec);
  const lo = formatValue(spec, spec.min);
  const hi = formatValue(spec, spec.max);
  const below = formatValue(spec, spec.kind === 'decimal' ? Number((spec.min - step).toFixed(spec.places)) : spec.min - step);
  const above = formatValue(spec, spec.kind === 'decimal' ? Number((spec.max + step).toFixed(spec.places)) : spec.max + step);
  const unit = spec.kind === 'text' ? ' characters' : '';
  const gap =
    spec.kind === 'decimal'
      ? ` Values have ${spec.places === 1 ? 'one decimal place' : 'two decimal places'}, so the nearest invalid values are ${formatBound(spec, step)} outside the range.`
      : spec.kind === 'date'
        ? ' The nearest invalid dates are the day before and the day after.'
        : '';
  const reason =
    spec.min === spec.max
      ? `Only ${lo}${unit} is valid, so the nearest invalid ${what} are ${below} and ${above}${unit}.`
      : `The valid range is ${lo} to ${hi}${unit}: ${lo} and ${hi} are the lowest and highest valid ${what}, and ${below} and ${above} are the nearest invalid ones.${gap}`;
  return {
    id: 'gen-validate-boundary',
    kk: BOUNDARY_KK,
    instance: `validate:boundary:seed=${seed}:${difficulty}`,
    prompt: [specBlock(spec), { kind: 'text', text: question, tone: 'accent' }, { kind: 'text', text: format, tone: 'muted' }],
    check(input) {
      const tokens = parseList(input);
      const parsed = tokens.map((t) => parseValue(spec.kind, t));
      if (!tokens.length || parsed.some((v) => v === null)) return { correct: false, expected, reason: format, counted: false };
      if (tokens.length !== values.length) {
        return { correct: false, expected, reason: `Type ${values.length === 2 ? 'two' : 'four'} ${what}, separated by spaces or commas.`, counted: false };
      }
      const want = [...values].sort((a, b) => a - b);
      const got = (parsed as number[]).sort((a, b) => a - b);
      const correct = want.every((v, i) => Math.abs(v - got[i]) < 1e-9);
      const missing = want.filter((v) => !got.some((g) => Math.abs(g - v) < 1e-9)).map((v) => formatValue(spec, v));
      return { correct, expected, reason: correct ? reason : `${reason} Missing: ${formatAnd(missing)}.` };
    },
  };
}

export function validateItem(spec: ValidateSpec, difficulty: Difficulty): QuizItem {
  const seed = spec.seed >>> 0;
  return spec.kind === 'check' ? checkItem(seed, spec.index ?? 0, difficulty) : boundaryItem(seed, difficulty);
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromValidateInstance(instance: string): QuizItem | null {
  const check = /^validate:check:seed=(\d+):i=(\d+):(easy|normal|hard)$/.exec(instance);
  if (check) return checkItem(Number(check[1]), Number(check[2]), check[3] as Difficulty);
  const boundary = /^validate:boundary:seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (boundary && DIFFICULTIES.includes(boundary[2] as Difficulty)) return boundaryItem(Number(boundary[1]), boundary[2] as Difficulty);
  return null;
}

/**
 * A round of `count` items: for each of two fields, its four test inputs in order, then its
 * boundary question. The two fields have different kinds of data where possible.
 */
export function planValidateRound(seed: number, difficulty: Difficulty, count = 10): ValidateSpec[] {
  const specs: ValidateSpec[] = [];
  let lastKind: FieldKind | null = null;
  for (let field = 0; specs.length < count; field++) {
    let fieldSeed = childSeed(seed, `field:${field}`);
    for (let attempt = 1; attempt < 20 && fieldAndBatch(fieldSeed, difficulty).spec.kind === lastKind; attempt++) {
      fieldSeed = childSeed(seed, `field:${field}:${attempt}`);
    }
    lastKind = fieldAndBatch(fieldSeed, difficulty).spec.kind;
    for (let i = 0; i < BATCH_SIZE; i++) specs.push({ kind: 'check', seed: fieldSeed, index: i });
    specs.push({ kind: 'boundary', seed: fieldSeed });
  }
  return specs.slice(0, count);
}

/** Game.generate: one self-contained item, an input to check four times in five. */
export function generateValidateItem(seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'kind'));
  return rng() < 0.8 ? checkItem(seed, randInt(rng, 0, BATCH_SIZE - 1), difficulty) : boundaryItem(seed, difficulty);
}
