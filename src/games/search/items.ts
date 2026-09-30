/**
 * `search` question generators. Every item is built from a seed and a difficulty, and its `instance`
 * string (e.g. "search:binary:seed=77:base=1:n=12:normal") regenerates it through fromSearchInstance.
 * Expected answers come from ./algorithms.ts, never from template arithmetic.
 */
import type { TerminalBlock } from '../../terminal/blocks';
import { formatAnd, formatList, parseCount, parseIntList, sameList } from '../answers';
import { choiceItem, whichItem } from '../concepts';
import { childSeed, mulberry32, pick, randInt, sample, shuffle, type Rng } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { binarySearchTrace, binaryWorstCase, halvingChain, linearSearchTrace, type IndexBase } from './algorithms';
import { SEARCH_ANSWERS, SEARCH_CHOICE, SEARCH_WHICH } from './concepts';
import { SEARCH_KK } from './meta';

export const SEARCH_KINDS = ['binary', 'binary-miss', 'linear', 'linear-count', 'scenario', 'max'] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export interface SearchSpec {
  kind: SearchKind;
  seed: number;
}

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function sizeFor(rng: Rng, difficulty: Difficulty): number {
  return difficulty === 'easy' ? randInt(rng, 7, 9) : difficulty === 'normal' ? randInt(rng, 10, 13) : randInt(rng, 14, 18);
}

function baseFor(rng: Rng): IndexBase {
  return rng() < 0.5 ? 0 : 1;
}

/** A value inside the array's range (or just outside it) that isn't in the array. */
function missingValue(rng: Rng, values: readonly number[]): number {
  const have = new Set(values);
  const lo = Math.max(1, Math.min(...values) - 3);
  const hi = Math.max(...values) + 3;
  const gaps = range(lo, hi).filter((v) => !have.has(v));
  return pick(rng, gaps);
}

// ---------------------------------------------------------------------------
// Specs: the data behind each item, exposed so tests can check it independently.
// ---------------------------------------------------------------------------

export interface BinarySpec {
  values: number[];
  target: number;
  base: IndexBase;
}

/** `present` false forces a target that is not in the array. */
export function binarySpec(seed: number, difficulty: Difficulty, present: boolean): BinarySpec {
  const rng = mulberry32(seed);
  const base = baseFor(rng);
  const n = sizeFor(rng, difficulty);
  const values = sample(rng, range(1, difficulty === 'hard' ? 150 : 99), n).sort((a, b) => a - b);
  let target = present ? pick(rng, values) : missingValue(rng, values);
  // Past easy, avoid targets found on the very first inspection.
  for (let tries = 0; present && difficulty !== 'easy' && tries < 20 && binarySearchTrace(values, target, base).steps.length < 2; tries++) {
    target = pick(rng, values);
  }
  return { values, target, base };
}

export interface LinearSpec {
  values: number[];
  target: number;
  base: IndexBase;
}

export function linearSpec(seed: number, difficulty: Difficulty): LinearSpec {
  const rng = mulberry32(seed);
  const base = baseFor(rng);
  const n = difficulty === 'easy' ? randInt(rng, 6, 7) : difficulty === 'normal' ? randInt(rng, 8, 10) : randInt(rng, 10, 12);
  const values = sample(rng, range(1, 99), n);
  const present = rng() < (difficulty === 'hard' ? 0.6 : 0.75);
  let target = present ? values[randInt(rng, 1, n - 1)] : missingValue(rng, values);
  if (difficulty === 'hard' && present && rng() < 0.5) {
    // Repeat the target later in the array: the search still stops at the first match.
    const first = values.indexOf(target);
    if (first < n - 1) values[randInt(rng, first + 1, n - 1)] = target;
    else target = values[randInt(rng, 1, n - 2)];
  }
  return { values, target, base };
}

export type MaxTemplate = 'binary' | 'linear';

export interface MaxSpec {
  template: MaxTemplate;
  n: number;
}

export function maxSpec(seed: number, difficulty: Difficulty): MaxSpec {
  const rng = mulberry32(seed);
  const template: MaxTemplate = rng() < 0.75 ? 'binary' : 'linear';
  const n =
    difficulty === 'easy' ? pick(rng, [7, 8, 15, 16, 31, 32]) : difficulty === 'normal' ? randInt(rng, 20, 1000) : randInt(rng, 1000, 2_000_000);
  return { template, n };
}

const CONCEPTS = [...SEARCH_WHICH.map((c) => ({ type: 'which' as const, c })), ...SEARCH_CHOICE.map((c) => ({ type: 'choice' as const, c }))];

export function scenarioId(seed: number): string {
  return pick(mulberry32(seed), CONCEPTS).c.id;
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

function arrayTable(values: readonly number[], base: IndexBase): TerminalBlock {
  return {
    kind: 'table',
    caption: `Array (indexes start at ${base})`,
    columns: ['Index', ...values.map((_, i) => String(i + base))],
    rows: [['Value', ...values.map(String)]],
  };
}

const INDEX_HINT = 'Type the indexes in order, separated by spaces or commas.';
const INDEX_UNPARSED = 'Type the indexes as whole numbers separated by spaces or commas, for example 5 8 6.';

function commas(n: number): string {
  return n.toLocaleString('en-AU');
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

function binaryItem(seed: number, difficulty: Difficulty, present: boolean): QuizItem {
  const kind: SearchKind = present ? 'binary' : 'binary-miss';
  const { values, target, base } = binarySpec(seed, difficulty, present);
  const trace = binarySearchTrace(values, target, base);
  const answer = trace.steps.map((s) => s.mid);
  const expected = formatList(answer);
  const described = trace.steps.map((s) => `${s.mid} (${s.value}, ${s.outcome === 'found' ? 'found' : s.outcome === 'less' ? 'too small' : 'too large'})`);
  const reason = trace.found
    ? `It inspects ${formatAnd(described)}.`
    : `It inspects ${formatAnd(described)}. Then low (${trace.low}) is greater than high (${trace.high}), so ${target} is not in the array.`;
  const last = values.length - 1 + base;
  const rows = trace.steps.map((s) => {
    const action = s.outcome === 'found' ? 'found' : s.outcome === 'less' ? `${s.value} < ${target}, so low = ${s.mid + 1}` : `${s.value} > ${target}, so high = ${s.mid - 1}`;
    return [String(s.low), String(s.high), String(s.mid), String(s.value), action];
  });
  if (!trace.found) rows.push([String(trace.low), String(trace.high), '', '', 'low > high: not found']);
  const followUp: TerminalBlock[] = [{ kind: 'table', caption: 'Step by step', columns: ['low', 'high', 'mid', 'value', 'then'], rows }];
  return {
    id: 'gen-search-binary',
    kk: SEARCH_KK,
    instance: `search:${kind}:seed=${seed}:base=${base}:n=${values.length}:${difficulty}`,
    prompt: [
      { kind: 'text', text: `Binary search on this sorted array. Indexes start at ${base}.` },
      arrayTable(values, base),
      {
        kind: 'text',
        text: `low starts at ${base} and high at ${last}. Each step inspects index mid = (low + high) DIV 2, which rounds down. If the value there is less than the target, low becomes mid + 1; if it is greater, high becomes mid - 1. The search stops when it finds the target or when low is greater than high.`,
      },
      { kind: 'text', text: `Searching for ${target}: which indexes are inspected, in order?`, tone: 'accent' },
      { kind: 'text', text: INDEX_HINT, tone: 'muted' },
    ],
    check(input) {
      const typed = parseIntList(input);
      if (!typed) return { correct: false, expected, reason: INDEX_UNPARSED, counted: false };
      const correct = sameList(typed, answer);
      return { correct, expected, reason, followUp: correct ? undefined : followUp };
    },
  };
}

function linearItem(seed: number, difficulty: Difficulty, ask: 'indexes' | 'count'): QuizItem {
  const kind: SearchKind = ask === 'indexes' ? 'linear' : 'linear-count';
  const { values, target, base } = linearSpec(seed, difficulty);
  const trace = linearSearchTrace(values, target, base);
  const comparisons = trace.inspected.length;
  const expected = ask === 'indexes' ? formatList(trace.inspected) : String(comparisons);
  const reason = trace.found
    ? `It checks from index ${base} and stops at the first ${target}, at index ${trace.inspected.at(-1)}: ${comparisons} ${comparisons === 1 ? 'comparison' : 'comparisons'}.`
    : `${target} is not in the array, so all ${values.length} values are compared.`;
  const question =
    ask === 'indexes' ? `Searching for ${target}: which indexes are inspected, in order?` : `Searching for ${target}: how many values are compared with the target?`;
  return {
    id: 'gen-search-linear',
    kk: SEARCH_KK,
    instance: `search:${kind}:seed=${seed}:base=${base}:n=${values.length}:${difficulty}`,
    prompt: [
      { kind: 'text', text: `Linear search on this array. Indexes start at ${base}. The search checks each value in turn from the first index and stops at the first match.` },
      arrayTable(values, base),
      { kind: 'text', text: question, tone: 'accent' },
      { kind: 'text', text: ask === 'indexes' ? INDEX_HINT : 'Type a whole number.', tone: 'muted' },
    ],
    check(input) {
      if (ask === 'count') {
        const n = parseCount(input);
        if (n === null) return { correct: false, expected, reason: 'Type a whole number, such as 4.', counted: false };
        return { correct: n === comparisons, expected, reason };
      }
      const typed = parseIntList(input);
      if (!typed) return { correct: false, expected, reason: INDEX_UNPARSED, counted: false };
      return { correct: sameList(typed, trace.inspected), expected, reason };
    },
  };
}

function maxItem(seed: number, difficulty: Difficulty): QuizItem {
  const { template, n } = maxSpec(seed, difficulty);
  const answer = template === 'binary' ? binaryWorstCase(n) : n;
  let reason: string;
  if (template === 'binary') {
    const chain = halvingChain(n);
    reason =
      chain.length <= 10
        ? `Each miss leaves at most half of the values in range: ${chain.map(commas).join(', ')}. That is ${answer} inspections at most.`
        : `Each miss leaves at most half of the values in range, rounding down. ${commas(n)} halves ${answer - 1} times before 1 value is left, so at most ${answer} inspections.`;
  } else {
    reason = `When the target is last or missing, linear search compares every one of the ${commas(n)} values.`;
  }
  const question =
    template === 'binary'
      ? `What is the largest number of values binary search inspects in a sorted array of ${commas(n)} values?`
      : `What is the largest number of comparisons linear search makes in an array of ${commas(n)} values?`;
  return {
    id: 'gen-search-count',
    kk: SEARCH_KK,
    instance: `search:max:seed=${seed}:${template}-n=${n}:${difficulty}`,
    prompt: [
      { kind: 'text', text: question, tone: 'accent' },
      { kind: 'text', text: 'Type a whole number.', tone: 'muted' },
    ],
    check(input) {
      const typed = parseCount(input.replace(/(\d),(?=\d{3}\b)/g, '$1'));
      const expected = String(answer);
      if (typed === null) return { correct: false, expected, reason: 'Type a whole number, such as 12.', counted: false };
      return { correct: typed === answer, expected, reason };
    },
  };
}

function scenarioItem(seed: number, difficulty: Difficulty): QuizItem {
  const entry = pick(mulberry32(seed), CONCEPTS);
  const base = { itemId: 'gen-search-scenario', kk: SEARCH_KK, instance: `search:scenario:seed=${seed}:id=${entry.c.id}:${difficulty}` };
  return entry.type === 'which' ? whichItem(base, entry.c, SEARCH_ANSWERS) : choiceItem(base, entry.c);
}

const BUILDERS: Record<SearchKind, (seed: number, difficulty: Difficulty) => QuizItem> = {
  binary: (s, d) => binaryItem(s, d, true),
  'binary-miss': (s, d) => binaryItem(s, d, false),
  linear: (s, d) => linearItem(s, d, 'indexes'),
  'linear-count': (s, d) => linearItem(s, d, 'count'),
  scenario: scenarioItem,
  max: maxItem,
};

export function searchItem(spec: SearchSpec, difficulty: Difficulty): QuizItem {
  return BUILDERS[spec.kind](spec.seed >>> 0, difficulty);
}

const STANDALONE_WEIGHTS: readonly [SearchKind, number][] = [
  ['binary', 3],
  ['binary-miss', 1],
  ['linear', 1],
  ['linear-count', 1],
  ['scenario', 3],
  ['max', 1],
];

export function standaloneKind(seed: number): SearchKind {
  const rng = mulberry32(childSeed(seed, 'kind'));
  const total = STANDALONE_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [kind, w] of STANDALONE_WEIGHTS) {
    r -= w;
    if (r < 0) return kind;
  }
  return 'binary';
}

/** Game.generate: one self-contained item for a seed. */
export function generateSearchItem(seed: number, difficulty: Difficulty): QuizItem {
  return searchItem({ kind: standaloneKind(seed), seed }, difficulty);
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromSearchInstance(instance: string): QuizItem | null {
  const m = /^search:([a-z-]+):seed=(\d+):.*:(easy|normal|hard)$/.exec(instance);
  if (!m || !(SEARCH_KINDS as readonly string[]).includes(m[1]) || !DIFFICULTIES.includes(m[3] as Difficulty)) return null;
  return searchItem({ kind: m[1] as SearchKind, seed: Number(m[2]) }, m[3] as Difficulty);
}

const ROUND: readonly SearchKind[] = ['binary', 'binary', 'binary', 'binary-miss', 'linear', 'linear-count', 'scenario', 'scenario', 'scenario', 'max'];

/**
 * A round of `count` items: four binary searches (at least one for a missing target), a linear
 * search trace and count, three scenarios and one counting question, in a seeded order. Scenarios
 * never repeat within a round.
 */
export function planSearchRound(seed: number, count = 10): SearchSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const specs: SearchSpec[] = [];
  const used = new Set<string>();
  for (let cycle = 0; specs.length < count; cycle++) {
    shuffle(rng, ROUND).forEach((kind, i) => {
      let s = childSeed(seed, `${cycle}:${i}`);
      if (kind === 'scenario') {
        const unitSeed = s;
        for (let attempt = 1; attempt < 50 && used.has(scenarioId(s)); attempt++) s = childSeed(unitSeed, attempt);
        used.add(scenarioId(s));
      }
      specs.push({ kind, seed: s });
    });
  }
  return specs.slice(0, count);
}
