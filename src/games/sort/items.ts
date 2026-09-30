/**
 * `sort` question generators. Every item is built from a seed and a difficulty, and its `instance`
 * string (e.g. "sort:selection:seed=123:k=2:normal") regenerates it exactly through fromSortInstance.
 * Expected answers come from ./algorithms.ts, never from template arithmetic.
 */
import type { TerminalBlock } from '../../terminal/blocks';
import { formatAnd, formatGroups, formatList, parseCount, parseIntGroups, parseIntList, sameList } from '../answers';
import { choiceItem, whichItem } from '../concepts';
import { childSeed, mulberry32, pick, randInt, sample, shuffle, type Rng } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { lomutoPartition, selectionComparisons, selectionSortPasses } from './algorithms';
import { SORT_ANSWERS, SORT_CHOICE, SORT_WHICH } from './concepts';
import { SORT_KK } from './meta';

export const SORT_KINDS = ['selection', 'partition', 'sublists', 'concept', 'count'] as const;
export type SortKind = (typeof SORT_KINDS)[number];

export interface SortSpec {
  kind: SortKind;
  seed: number;
}

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function isAscending(values: readonly number[]): boolean {
  return values.every((v, i) => i === 0 || values[i - 1] <= v);
}

/** Easy: 5 distinct values. Normal: 6 or 7 distinct values. Hard: 8 values with one repeat. Never already sorted. */
export function sortValues(rng: Rng, difficulty: Difficulty): number[] {
  for (;;) {
    let values: number[];
    if (difficulty === 'easy') values = sample(rng, range(1, 50), 5);
    else if (difficulty === 'normal') values = sample(rng, range(1, 99), randInt(rng, 6, 7));
    else {
      const base = sample(rng, range(1, 40), 7);
      values = [...base];
      values.splice(randInt(rng, 0, 7), 0, pick(rng, base));
    }
    if (!isAscending(values)) return values;
  }
}

function hasRepeats(values: readonly number[]): boolean {
  return new Set(values).size !== values.length;
}

// ---------------------------------------------------------------------------
// Specs: the data behind each item, exposed so tests can check it independently.
// ---------------------------------------------------------------------------

export interface SelectionSpec {
  values: number[];
  /** Ask for the array after this pass (1-based). */
  k: number;
}

export function selectionSpec(seed: number, difficulty: Difficulty): SelectionSpec {
  const rng = mulberry32(seed);
  const k = difficulty === 'easy' ? randInt(rng, 1, 2) : difficulty === 'normal' ? randInt(rng, 2, 3) : randInt(rng, 2, 5);
  let values = sortValues(rng, difficulty);
  // Prefer arrays where at least one of the first k passes really moves something.
  for (let tries = 0; tries < 20 && selectionSortPasses(values).slice(0, k).every((p) => p.inPlace); tries++) {
    values = sortValues(rng, difficulty);
  }
  return { values, k };
}

export interface PartitionSpec {
  values: number[];
}

export function partitionSpec(seed: number, difficulty: Difficulty): PartitionSpec {
  const rng = mulberry32(seed);
  for (;;) {
    const values = sortValues(rng, difficulty);
    const pivot = values[values.length - 1];
    const others = values.slice(0, -1);
    if (difficulty === 'easy' && (others.every((v) => v > pivot) || others.every((v) => v <= pivot))) continue;
    if (difficulty === 'hard' && rng() < 0.5) {
      // Half the hard items make the repeated value the pivot, so "less than or equal" matters.
      const repeated = values.find((v, i) => values.indexOf(v) !== i)!;
      const at = values.indexOf(repeated);
      [values[at], values[values.length - 1]] = [values[values.length - 1], values[at]];
      if (isAscending(values)) continue;
    }
    return { values };
  }
}

export type CountTemplate = 'comparisons' | 'passes' | 'swaps' | 'partition';
const COUNT_TEMPLATES: readonly CountTemplate[] = ['comparisons', 'passes', 'swaps', 'partition'];

export interface CountSpec {
  template: CountTemplate;
  n: number;
}

export function countSpec(seed: number, difficulty: Difficulty): CountSpec {
  const rng = mulberry32(seed);
  const template = pick(rng, COUNT_TEMPLATES);
  const n = difficulty === 'easy' ? randInt(rng, 5, 6) : difficulty === 'normal' ? randInt(rng, 6, 10) : randInt(rng, 10, 30);
  return { template, n };
}

const CONCEPTS = [...SORT_WHICH.map((c) => ({ type: 'which' as const, c })), ...SORT_CHOICE.map((c) => ({ type: 'choice' as const, c }))];

export function conceptId(seed: number): string {
  return pick(mulberry32(seed), CONCEPTS).c.id;
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

const ARRAY_HINT = 'Type every value in order, separated by spaces or commas.';

function arrayBlock(values: readonly number[]): TerminalBlock {
  return { kind: 'pre', text: `[${formatList(values)}]`, label: 'Starting array' };
}

function traceRow(label: string, values: readonly number[], width: number, labelWidth: number, note = ''): string {
  const cells = values.map((v) => String(v).padStart(width)).join('  ');
  return `${label.padEnd(labelWidth)}  ${cells}${note ? `   ${note}` : ''}`.trimEnd();
}

function checkArray(input: string, n: number): { values: number[] } | { error: string } {
  const values = parseIntList(input);
  if (!values) return { error: 'Type the array as whole numbers separated by spaces or commas, for example 4 1 3.' };
  if (values.length !== n) return { error: `The array has ${n} values, but your answer has ${values.length}. Type all ${n}.` };
  return { values };
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

const SELECTION_RULE =
  'Selection sort, ascending. Each pass finds the smallest value in the unsorted part of the array and swaps it into the first unsorted place, even if it is already there.';
const SELECTION_REPEATS = 'If the smallest value appears more than once, the one furthest left is used.';

export function selectionItem(seed: number, difficulty: Difficulty): QuizItem {
  const { values, k } = selectionSpec(seed, difficulty);
  const passes = selectionSortPasses(values);
  const answer = passes[k - 1].array;
  const expected = formatList(answer);
  const fixed = answer.slice(0, k);
  const reason =
    k === 1
      ? `Pass 1 swaps the smallest value, ${fixed[0]}, into the first place.`
      : `Each pass fixes the next smallest value at the front, so after pass ${k} the values ${formatAnd(fixed)} are in their final places.`;
  const width = Math.max(...values.map((v) => String(v).length));
  const labelWidth = `pass ${k}`.length;
  const trace = [
    traceRow('start', values, width, labelWidth),
    ...passes.slice(0, k).map((p) =>
      traceRow(`pass ${p.pass}`, p.array, width, labelWidth, p.inPlace ? `${p.value} is already in place` : `${p.value} swaps with ${p.swappedWith}`),
    ),
  ].join('\n');
  const prompt: TerminalBlock[] = [
    { kind: 'text', text: SELECTION_RULE },
    ...(hasRepeats(values) ? [{ kind: 'text', text: SELECTION_REPEATS } as TerminalBlock] : []),
    arrayBlock(values),
    { kind: 'text', text: `What is the array after pass ${k}?`, tone: 'accent' },
    { kind: 'text', text: ARRAY_HINT, tone: 'muted' },
  ];
  return {
    id: 'gen-sort-selection',
    kk: SORT_KK,
    instance: `sort:selection:seed=${seed}:k=${k}:${difficulty}`,
    prompt,
    check(input) {
      const parsed = checkArray(input, values.length);
      if ('error' in parsed) return { correct: false, expected, reason: parsed.error, counted: false };
      const correct = sameList(parsed.values, answer);
      return { correct, expected, reason, followUp: correct ? undefined : [{ kind: 'pre', text: trace, label: 'Pass by pass' }] };
    },
  };
}

const QUICK_RULE =
  'Quick sort, ascending. The first partition uses the last value as the pivot (Lomuto partitioning). Scanning the other values from left to right, each value less than or equal to the pivot swaps into the next place on the left. Then the pivot swaps into the place just after those values.';

function partitionTrace(values: readonly number[]): string {
  const p = lomutoPartition(values);
  const width = Math.max(...values.map((v) => String(v).length));
  const lines: [string, readonly number[]][] = [];
  let before: readonly number[] = values;
  for (const step of p.steps) {
    const same = sameList(before, step.array);
    const note = step.moved ? `${step.value} <= ${p.pivot}: ${same ? 'already on the left' : 'swaps left'}` : `${step.value} > ${p.pivot}: stays`;
    lines.push([note, step.array]);
    before = step.array;
  }
  lines.push([`pivot ${p.pivot} swaps into place ${p.pivotIndex + 1}`, p.array]);
  const labelWidth = Math.max(...lines.map(([l]) => l.length));
  return [`pivot ${p.pivot}`, ...lines.map(([l, a]) => traceRow(l, a, width, labelWidth))].join('\n');
}

export function partitionItem(seed: number, difficulty: Difficulty): QuizItem {
  const { values } = partitionSpec(seed, difficulty);
  const p = lomutoPartition(values);
  const expected = formatList(p.array);
  const moved = p.left;
  const reason = moved.length
    ? `The pivot is ${p.pivot}. ${formatAnd(moved)} ${moved.length === 1 ? 'is' : 'are'} less than or equal to it and ${moved.length === 1 ? 'moves' : 'move'} left in the order found, then ${p.pivot} swaps into place ${p.pivotIndex + 1}.`
    : `The pivot is ${p.pivot}, and no other value is less than or equal to it, so it swaps into place 1.`;
  return {
    id: 'gen-sort-partition',
    kk: SORT_KK,
    instance: `sort:partition:seed=${seed}:n=${values.length}:${difficulty}`,
    prompt: [
      { kind: 'text', text: QUICK_RULE },
      arrayBlock(values),
      { kind: 'text', text: 'What is the array after the first partition?', tone: 'accent' },
      { kind: 'text', text: ARRAY_HINT, tone: 'muted' },
    ],
    check(input) {
      const parsed = checkArray(input, values.length);
      if ('error' in parsed) return { correct: false, expected, reason: parsed.error, counted: false };
      const correct = sameList(parsed.values, p.array);
      return { correct, expected, reason, followUp: correct ? undefined : [{ kind: 'pre', text: partitionTrace(values), label: 'Step by step' }] };
    },
  };
}

export function sublistsItem(seed: number, difficulty: Difficulty): QuizItem {
  const { values } = partitionSpec(seed, difficulty);
  const p = lomutoPartition(values);
  const expected = formatGroups([p.left, p.right]);
  const reason = `The first partition gives ${formatList(p.array)}. The pivot ${p.pivot} is in its final place, so the sub-lists are the values before it and the values after it.`;
  const unparsed = 'Type two sub-lists of whole numbers, each in brackets, for example [4, 1] [9, 7]. Use [] for an empty one.';
  return {
    id: 'gen-sort-sublists',
    kk: SORT_KK,
    instance: `sort:sublists:seed=${seed}:n=${values.length}:${difficulty}`,
    prompt: [
      { kind: 'text', text: QUICK_RULE },
      arrayBlock(values),
      { kind: 'text', text: 'After the first partition, which two sub-lists does quick sort sort next?', tone: 'accent' },
      {
        kind: 'text',
        text: 'Type each sub-list in brackets, in array order, left one first: for example [4, 1] [9, 7]. Leave out the pivot, and type [] for an empty sub-list.',
        tone: 'muted',
      },
    ],
    check(input) {
      const groups = parseIntGroups(input);
      if (!groups || groups.length !== 2) return { correct: false, expected, reason: unparsed, counted: false };
      const correct = sameList(groups[0], p.left) && sameList(groups[1], p.right);
      const followUp: TerminalBlock[] = [{ kind: 'pre', text: `${formatGroups([p.left])}  ${p.pivot}  ${formatGroups([p.right])}`, label: 'Sub-lists either side of the pivot' }];
      return { correct, expected, reason, followUp: correct ? undefined : followUp };
    },
  };
}

function sumText(n: number): string {
  const terms = Array.from({ length: n - 1 }, (_, i) => n - 1 - i);
  return n <= 7 ? terms.join(' + ') : `${n - 1} + ${n - 2} + ... + 1`;
}

export function countItem(seed: number, difficulty: Difficulty): QuizItem {
  const { template, n } = countSpec(seed, difficulty);
  let intro: string | null = null;
  let question: string;
  let answer: number;
  let reason: string;
  switch (template) {
    case 'comparisons':
      intro = 'Selection sort makes the same number of comparisons whatever order the values start in.';
      question = `How many comparisons does selection sort make to sort ${n} values?`;
      answer = selectionComparisons(n);
      reason = `Pass 1 compares ${n - 1} pairs, pass 2 compares ${n - 2}, and so on down to 1: ${sumText(n)} = ${n} × ${n - 1} / 2 = ${answer}.`;
      break;
    case 'passes':
      question = `How many passes does selection sort make to sort ${n} values?`;
      answer = n - 1;
      reason = `Each pass puts one value in its final place. After ${n - 1} passes, the last value is already in place.`;
      break;
    case 'swaps':
      question = `What is the largest number of swaps selection sort can make when sorting ${n} values?`;
      answer = n - 1;
      reason = `Selection sort makes at most one swap per pass, and it makes ${n - 1} passes.`;
      break;
    case 'partition':
      intro = 'Quick sort partitions a list of values around its last value, the pivot.';
      question = `How many comparisons with the pivot does the first partition of ${n} values make?`;
      answer = n - 1;
      reason = `Every value except the pivot is compared with it once: ${n - 1} comparisons.`;
      break;
  }
  return {
    id: 'gen-sort-count',
    kk: SORT_KK,
    instance: `sort:count:seed=${seed}:${template}-n=${n}:${difficulty}`,
    prompt: [
      ...(intro ? [{ kind: 'text', text: intro } as TerminalBlock] : []),
      { kind: 'text', text: question, tone: 'accent' },
      { kind: 'text', text: 'Type a whole number.', tone: 'muted' },
    ],
    check(input) {
      const value = parseCount(input);
      const expected = String(answer);
      if (value === null) return { correct: false, expected, reason: 'Type a whole number, such as 12.', counted: false };
      return { correct: value === answer, expected, reason };
    },
  };
}

export function conceptItem(seed: number, difficulty: Difficulty): QuizItem {
  const entry = pick(mulberry32(seed), CONCEPTS);
  const base = { itemId: 'gen-sort-concept', kk: SORT_KK, instance: `sort:concept:seed=${seed}:id=${entry.c.id}:${difficulty}` };
  return entry.type === 'which' ? whichItem(base, entry.c, SORT_ANSWERS) : choiceItem(base, entry.c);
}

const BUILDERS: Record<SortKind, (seed: number, difficulty: Difficulty) => QuizItem> = {
  selection: selectionItem,
  partition: partitionItem,
  sublists: sublistsItem,
  concept: conceptItem,
  count: countItem,
};

export function sortItem(spec: SortSpec, difficulty: Difficulty): QuizItem {
  return BUILDERS[spec.kind](spec.seed >>> 0, difficulty);
}

/** Weighted kind for a standalone item (the daily challenge). */
const STANDALONE_WEIGHTS: readonly [SortKind, number][] = [
  ['selection', 3],
  ['partition', 2],
  ['sublists', 1],
  ['concept', 3],
  ['count', 1],
];

export function standaloneKind(seed: number): SortKind {
  const rng = mulberry32(childSeed(seed, 'kind'));
  const total = STANDALONE_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [kind, w] of STANDALONE_WEIGHTS) {
    r -= w;
    if (r < 0) return kind;
  }
  return 'selection';
}

/** Game.generate: one self-contained item for a seed. */
export function generateSortItem(seed: number, difficulty: Difficulty): QuizItem {
  return sortItem({ kind: standaloneKind(seed), seed }, difficulty);
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromSortInstance(instance: string): QuizItem | null {
  const m = /^sort:([a-z]+):seed=(\d+):.*:(easy|normal|hard)$/.exec(instance);
  if (!m || !(SORT_KINDS as readonly string[]).includes(m[1]) || !DIFFICULTIES.includes(m[3] as Difficulty)) return null;
  return sortItem({ kind: m[1] as SortKind, seed: Number(m[2]) }, m[3] as Difficulty);
}

type Unit = 'selection' | 'quick' | 'concept' | 'count';
const ROUND_UNITS: readonly Unit[] = ['selection', 'selection', 'selection', 'quick', 'quick', 'concept', 'concept', 'count'];

/**
 * A round of `count` items: three selection passes, two quick sort pairs (the partition, then the
 * sub-lists of the same array), two concepts and one counting question, in a seeded order.
 * Concepts never repeat within a round.
 */
export function planSortRound(seed: number, count = 10): SortSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const specs: SortSpec[] = [];
  const usedConcepts = new Set<string>();
  for (let cycle = 0; specs.length < count; cycle++) {
    const units = shuffle(rng, ROUND_UNITS);
    units.forEach((unit, u) => {
      const unitSeed = childSeed(seed, `${cycle}:${u}`);
      if (unit === 'quick') {
        specs.push({ kind: 'partition', seed: unitSeed }, { kind: 'sublists', seed: unitSeed });
      } else if (unit === 'concept') {
        let s = unitSeed;
        for (let attempt = 1; attempt < 50 && usedConcepts.has(conceptId(s)); attempt++) s = childSeed(unitSeed, attempt);
        usedConcepts.add(conceptId(s));
        specs.push({ kind: 'concept', seed: s });
      } else {
        specs.push({ kind: unit, seed: unitSeed });
      }
    });
  }
  return specs.slice(0, count);
}
