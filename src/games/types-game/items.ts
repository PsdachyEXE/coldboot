/**
 * `types` items: choose a data type, a data structure or a data source for a scenario. Answers are
 * typed; the feedback gives the one-line justification the exam expects, plus a note on the
 * commonest wrong choice. Data types must be named as the study design names them (the 2025
 * examination report gave no marks for Bool or Float), so short forms re-prompt without counting.
 * Each item stands alone for the daily challenge; instances ("types:structure:cinema:hard")
 * regenerate an item exactly through fromTypesInstance.
 */
import type { KkId } from '../../content/schema';
import { normaliseAnswer } from '../../lib/text';
import { matchOption } from '../answers';
import { childSeed, mulberry32, pick, shuffle } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import {
  SOURCE_SCENARIOS,
  STRUCTURE_SCENARIOS,
  TYPE_SCENARIOS,
  type DataType,
  type Level,
  type Scenario,
  type Source,
  type Structure,
} from './bank';

export const TYPES_KINDS = ['type', 'structure', 'source'] as const;
export type TypesKind = (typeof TYPES_KINDS)[number];

export interface TypesSpec {
  kind: TypesKind;
  id: string;
}

export const TYPE_KK: KkId[] = ['U3O1-KK04', 'U4O1-KK02'];
export const STRUCTURE_KK: KkId[] = ['U3O1-KK05', 'U4O1-KK02'];
export const SOURCE_KK: KkId[] = ['U3O1-KK06', 'U4O1-KK02'];

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

const LEVELS: Record<Difficulty, readonly Level[]> = { easy: [1, 2], normal: [1, 2, 3], hard: [2, 3] };

type Option<T extends string> = { value: T; label: string; accept: readonly string[] };

/** The study design's names, in its order; matching ignores case, spaces and hyphens. */
export const TYPE_OPTIONS: readonly Option<DataType>[] = [
  { value: 'character', label: 'character', accept: ['character'] },
  { value: 'string', label: 'string', accept: ['string'] },
  { value: 'integer', label: 'integer', accept: ['integer'] },
  { value: 'floating', label: 'floating point', accept: ['floating point', 'floating point number'] },
  { value: 'datetime', label: 'date/time', accept: ['date/time', 'date / time', 'date time', 'date and time'] },
  { value: 'boolean', label: 'Boolean', accept: ['boolean'] },
];

export const STRUCTURE_OPTIONS: readonly Option<Structure>[] = [
  {
    value: 'one-d',
    label: 'one-dimensional array',
    accept: ['one-dimensional array', 'one-dimensional', '1d array', '1d', '1 dimensional array', 'single-dimensional array', 'one-d array'],
  },
  {
    value: 'two-d',
    label: 'two-dimensional array',
    accept: ['two-dimensional array', 'two-dimensional', '2d array', '2d', '2 dimensional array', 'two-d array'],
  },
  { value: 'record', label: 'record', accept: ['record', 'records'] },
];

export const SOURCE_OPTIONS: readonly Option<Source>[] = [
  { value: 'plain', label: 'plain text', accept: ['plain text', 'plain text file', 'plain', 'text file', 'text', 'txt', 'txt file'] },
  {
    value: 'csv',
    label: 'CSV',
    accept: ['csv', 'csv file', 'comma separated values', 'comma separated', 'comma delimited', 'delimited', 'delimited file'],
  },
  { value: 'xml', label: 'XML', accept: ['xml', 'xml file', 'extensible markup language'] },
];

/** Strips a leading article and a trailing "type", "data type", "file" or "structure". */
function tidy(input: string): string {
  return normaliseAnswer(input)
    .replace(/^(an?|the)\s+/, '')
    .replace(/\s+(data\s+type|type|data\s+structure|structure|data\s+source|source)$/, '');
}

/** Short, informal or language-specific names for a type: not counted, with a reminder to name the type in full. */
const TYPE_SHORTHAND = new Set(['int', 'float', 'floating', 'real', 'double', 'decimal', 'str', 'char', 'chr', 'bool', 'bln', 'flt', 'dtm', 'whole number', 'decimal number', 'long', 'single', 'date', 'time', 'timestamp', 'currency', 'money']);

/** The study design's groups of types, which aren't types themselves. */
const TYPE_GROUPS = new Set(['text', 'numeric', 'number']);

const TYPE_NAMES = 'character, string, integer, floating point, date/time or Boolean';
const GROUP_HINT = `Text and numeric are groups of data types. Name the type itself: ${TYPE_NAMES}.`;

/** The re-prompt for a type that isn't named in full; the `oop` game's data type gaps use it too. */
export const TYPE_HINT = `Name the data type in full: ${TYPE_NAMES}.`;

const HINTS: Record<TypesKind, string> = {
  type: TYPE_HINT,
  structure: 'Type one-dimensional array, two-dimensional array or record.',
  source: 'Type plain text, CSV or XML.',
};

const QUESTIONS: Record<TypesKind, string> = {
  type: 'Which data type suits this data best?',
  structure: 'Which data structure suits this data best?',
  source: 'Which data source suits this data best?',
};

export const CHIPS: Record<TypesKind, string[]> = {
  type: TYPE_OPTIONS.map((o) => o.label),
  structure: STRUCTURE_OPTIONS.map((o) => o.label),
  source: SOURCE_OPTIONS.map((o) => o.label),
};

export type Parsed = { value: string } | { unparsed: string } | null;

export function parseAnswer(kind: TypesKind, input: string): Parsed {
  const s = tidy(input);
  if (!s) return null;
  if (kind === 'type') {
    const value = matchOption(s, TYPE_OPTIONS);
    if (value) return { value };
    if (TYPE_GROUPS.has(s)) return { unparsed: GROUP_HINT };
    return TYPE_SHORTHAND.has(s) ? { unparsed: HINTS.type } : null;
  }
  if (kind === 'structure') {
    const value = matchOption(s, STRUCTURE_OPTIONS);
    if (value) return { value };
    if (/^arrays?$/.test(s)) return { unparsed: 'Say which kind of array: one-dimensional or two-dimensional.' };
    return null;
  }
  const value = matchOption(s, SOURCE_OPTIONS);
  return value ? { value } : null;
}

function bank(kind: TypesKind): readonly Scenario<string>[] {
  return kind === 'type' ? TYPE_SCENARIOS : kind === 'structure' ? STRUCTURE_SCENARIOS : SOURCE_SCENARIOS;
}

function options(kind: TypesKind): readonly Option<string>[] {
  return kind === 'type' ? TYPE_OPTIONS : kind === 'structure' ? STRUCTURE_OPTIONS : SOURCE_OPTIONS;
}

export function scenarioFor(kind: TypesKind, id: string): Scenario<string> {
  const s = bank(kind).find((x) => x.id === id);
  if (!s) throw new Error(`unknown types scenario ${kind}:${id}`);
  return s;
}

export function scenariosFor(kind: TypesKind, difficulty: Difficulty): readonly Scenario<string>[] {
  return bank(kind).filter((s) => LEVELS[difficulty].includes(s.level));
}

/** A note for the commonest wrong choices, added after the justification. */
function misconception(expected: string, chosen: string): string {
  const key = `${expected}<${chosen}`;
  const notes: Record<string, string> = {
    'character<string': 'A string could hold it, but data that is always exactly one symbol or letter is a character.',
    'string<integer': "Digits aren't automatically numeric: if you never calculate with them, store them as a string.",
    'string<floating': "Digits aren't automatically numeric: if you never calculate with them, store them as a string.",
    'string<character': 'A character holds exactly one symbol, and this data is longer than that.',
    'integer<string': "Numbers stored as text can't be calculated with directly, and they sort as text, so 101 comes before 15.",
    'floating<string': "Numbers stored as text can't be calculated with directly, and they sort as text, so 101.5 comes before 15.5.",
    'boolean<string': 'Storing yes or no as text allows entries such as Y or yes that fail comparisons; a Boolean has only two values.',
    'boolean<character': 'Storing Y or N as a character allows other letters too; a Boolean has only two values.',
    'boolean<integer': 'Storing 1 or 0 as an integer allows every other number too; a Boolean has only two values.',
    'floating<integer': 'An integer would drop the fractional part.',
    'integer<floating': 'The value is always whole, so floating point adds nothing.',
    'floating<datetime': 'This is an amount, not a date or a time of day.',
    'integer<datetime': 'This is a whole number, not a date or a time of day.',
    'datetime<string': "Stored as a string, a date can't be compared or calculated with as a date; date/time can.",
    'datetime<integer': 'Dates and times have their own numeric data type, date/time, which can be compared and calculated with as dates.',
    'datetime<floating': 'Dates and times have their own numeric data type, date/time, which can be compared and calculated with as dates.',
    'record<one-d': 'Every element of an array has the same data type, but these fields mix types.',
    'record<two-d': 'Every element of an array has the same data type, but these fields mix types.',
    'two-d<one-d': 'Each value is identified by two things, so it needs two indices: a row and a column.',
    'one-d<two-d': 'Each value is identified by one thing only, so one index is enough.',
    'one-d<record': 'A record groups different fields of one item; here every value is the same kind of thing.',
    'two-d<record': 'A record groups different fields of one item; here every value is the same kind of thing, in a grid.',
    'csv<xml': 'XML would work, but it repeats a tag around every value, so uniform records are far more compact as CSV.',
    'xml<csv': 'In a CSV file a value is identified only by its position in the line; XML names every value with a tag.',
    'plain<csv': 'There are no fields to separate, so a delimited structure adds nothing.',
    'plain<xml': 'There are no fields to label, so XML tags add nothing.',
  };
  return notes[key] ?? '';
}

export function typesItem(spec: TypesSpec, difficulty: Difficulty): QuizItem {
  const { kind } = spec;
  const scenario = scenarioFor(kind, spec.id);
  const opts = options(kind);
  const expected = opts.find((o) => o.value === scenario.answer)!.label;
  const kk = kind === 'type' ? TYPE_KK : kind === 'structure' ? STRUCTURE_KK : SOURCE_KK;
  return {
    id: `gen-types-${kind}`,
    kk,
    instance: `types:${kind}:${scenario.id}:${difficulty}`,
    chips: CHIPS[kind],
    prompt: [
      { kind: 'text', text: scenario.prompt },
      { kind: 'text', text: QUESTIONS[kind], tone: 'accent' },
      { kind: 'text', text: HINTS[kind], tone: 'muted' },
    ],
    check(input) {
      const parsed = parseAnswer(kind, input);
      if (!parsed) return { correct: false, expected, reason: HINTS[kind], counted: false };
      if ('unparsed' in parsed) return { correct: false, expected, reason: parsed.unparsed, counted: false };
      const correct = parsed.value === scenario.answer;
      const note = correct ? '' : misconception(scenario.answer, parsed.value);
      return { correct, expected, reason: note ? `${scenario.why} ${note}` : scenario.why };
    },
  };
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromTypesInstance(instance: string): QuizItem | null {
  const m = /^types:(type|structure|source):([a-z0-9-]+):(easy|normal|hard)$/.exec(instance);
  if (!m || !DIFFICULTIES.includes(m[3] as Difficulty)) return null;
  const kind = m[1] as TypesKind;
  if (!bank(kind).some((s) => s.id === m[2])) return null;
  return typesItem({ kind, id: m[2] }, m[3] as Difficulty);
}

const ROUND_ORDER: readonly TypesKind[] = ['type', 'structure', 'source'];

/**
 * A round of `count` items in the order the exam builds a design: a data type, then a data
 * structure, then a data source, repeated (four types, three structures and three sources in 10).
 * No scenario repeats until its bank runs out.
 */
export function planTypesRound(seed: number, difficulty: Difficulty, count = 10): TypesSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const queues = new Map<TypesKind, string[]>();
  const next = (kind: TypesKind): string => {
    let queue = queues.get(kind);
    if (!queue?.length) {
      queue = shuffle(rng, scenariosFor(kind, difficulty).map((s) => s.id));
      queues.set(kind, queue);
    }
    return queue.shift()!;
  };
  return Array.from({ length: count }, (_, i) => {
    const kind = ROUND_ORDER[i % ROUND_ORDER.length];
    return { kind, id: next(kind) };
  });
}

/** Game.generate: one self-contained item, a data type two times in five. */
export function generateTypesItem(seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'kind'));
  const roll = rng();
  const kind: TypesKind = roll < 0.4 ? 'type' : roll < 0.7 ? 'structure' : 'source';
  return typesItem({ kind, id: pick(rng, scenariosFor(kind, difficulty)).id }, difficulty);
}

