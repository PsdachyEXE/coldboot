/**
 * Every sort generator is checked against reference implementations written differently from
 * ./algorithms.ts, over 500 seeds at each difficulty, through the item's own answer checker.
 */
import { describe, expect, it } from 'vitest';
import { SORT_ANSWERS, SORT_CHOICE, SORT_WHICH } from './concepts';
import game from './index';
import {
  countItem,
  countSpec,
  conceptItem,
  fromSortInstance,
  generateSortItem,
  partitionItem,
  partitionSpec,
  planSortRound,
  selectionItem,
  selectionSpec,
  sortValues,
  sublistsItem,
} from './items';
import { mulberry32 } from '../prng';
import type { Difficulty } from '../types';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 1);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

// ---------------------------------------------------------------------------
// Reference implementations (deliberately written another way)
// ---------------------------------------------------------------------------

/** Selection sort by slicing: Math.min over the unsorted part, first occurrence via indexOf. */
function refSelectionAfter(values: number[], k: number): number[] {
  const a = values.slice();
  for (let pass = 0; pass < k; pass++) {
    const rest = a.slice(pass);
    const where = pass + rest.indexOf(Math.min(...rest));
    const tmp = a[pass];
    a[pass] = a[where];
    a[where] = tmp;
  }
  return a;
}

/**
 * Lomuto partition as a queue model: values <= pivot keep their order on the left; each time one
 * is found, the first larger value seen so far rotates to the back; the final pivot swap rotates
 * the first larger value once more.
 */
function refPartition(values: number[]): { array: number[]; left: number[]; right: number[] } {
  const pivot = values[values.length - 1];
  const small: number[] = [];
  let large: number[] = [];
  for (const x of values.slice(0, -1)) {
    if (x <= pivot) {
      small.push(x);
      if (large.length) large = [...large.slice(1), large[0]];
    } else {
      large.push(x);
    }
  }
  const right = large.length ? [...large.slice(1), large[0]] : [];
  return { array: [...small, pivot, ...right], left: small, right };
}

/** Counts comparisons by instrumenting a straightforward selection sort. */
function refSelectionComparisons(n: number): { comparisons: number; passes: number } {
  const a = Array.from({ length: n }, (_, i) => (i * 37) % 101);
  let comparisons = 0;
  let passes = 0;
  for (let i = 0; i < n - 1; i++) {
    passes++;
    let m = i;
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      if (a[j] < a[m]) m = j;
    }
    [a[i], a[m]] = [a[m], a[i]];
  }
  return { comparisons, passes };
}

function refPartitionComparisons(n: number): number {
  const a = Array.from({ length: n }, (_, i) => (i * 53) % 97);
  let comparisons = 0;
  for (let j = 0; j < a.length - 1; j++) comparisons++;
  return comparisons;
}

const show = (xs: number[]) => xs.join(' ');

describe('sort generators against reference implementations', () => {
  it.each(LEVELS)('selection sort passes (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const { values, k } = selectionSpec(seed, level);
      const item = selectionItem(seed, level);
      const want = refSelectionAfter(values, k);
      const right = item.check(show(want));
      expect(right.correct, `seed ${seed}`).toBe(true);
      expect(right.expected).toBe(want.join(', '));
      // Any other ordering of the same values is wrong.
      const wrong = want.slice().reverse();
      if (wrong.join() !== want.join()) expect(item.check(`[${wrong.join(', ')}]`).correct).toBe(false);
      expect(item.instance).toBe(`sort:selection:seed=${seed}:k=${k}:${level}`);
    }
  });

  it.each(LEVELS)('quick sort first partition (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const { values } = partitionSpec(seed, level);
      const ref = refPartition(values);
      const item = partitionItem(seed, level);
      expect(item.check(ref.array.join(',')).correct, `seed ${seed}`).toBe(true);
      expect(item.check(show([...values].sort((a, b) => a - b))).correct === (show(ref.array) === show([...values].sort((a, b) => a - b)))).toBe(true);
    }
  });

  it.each(LEVELS)('quick sort sub-lists (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const { values } = partitionSpec(seed, level);
      const ref = refPartition(values);
      const item = sublistsItem(seed, level);
      const answer = `[${ref.left.join(', ')}] [${ref.right.join(' ')}]`;
      expect(item.check(answer).correct, `seed ${seed}: ${answer}`).toBe(true);
      expect(item.check(`[${ref.right.join(' ')}] [${ref.left.join(' ')}]`).correct).toBe(show(ref.left) === show(ref.right));
    }
  });

  it.each(LEVELS)('counting questions (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const { template, n } = countSpec(seed, level);
      const ref = refSelectionComparisons(n);
      const want = template === 'comparisons' ? ref.comparisons : template === 'passes' ? ref.passes : template === 'swaps' ? ref.passes : refPartitionComparisons(n);
      const item = countItem(seed, level);
      expect(item.check(String(want)).correct, `seed ${seed} ${template} n=${n}`).toBe(true);
      expect(item.check(`${want} ${template}`).correct).toBe(true);
      expect(item.check(String(want + 1)).correct).toBe(false);
    }
  });

  it('never repeats a pass beyond the array or asks about a sorted array', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const { values, k } = selectionSpec(seed, level);
        expect(k).toBeLessThan(values.length);
        expect(values.join()).not.toBe([...values].sort((a, b) => a - b).join());
      }
    }
  });
});

describe('sort values by difficulty', () => {
  it('uses 5, 6 to 7, and 8 values with a repeat', () => {
    for (const seed of SEEDS.slice(0, 200)) {
      const easy = sortValues(mulberry32(seed), 'easy');
      expect(easy).toHaveLength(5);
      expect(new Set(easy).size).toBe(5);
      const normal = sortValues(mulberry32(seed), 'normal');
      expect([6, 7]).toContain(normal.length);
      expect(new Set(normal).size).toBe(normal.length);
      const hard = sortValues(mulberry32(seed), 'hard');
      expect(hard).toHaveLength(8);
      expect(new Set(hard).size).toBe(7);
    }
  });

  it('keeps both easy sub-lists non-empty and sometimes makes the hard pivot a repeated value', () => {
    let pivotRepeats = 0;
    for (const seed of SEEDS) {
      const easy = refPartition(partitionSpec(seed, 'easy').values);
      expect(easy.left.length).toBeGreaterThan(0);
      expect(easy.right.length).toBeGreaterThan(0);
      const hard = partitionSpec(seed, 'hard').values;
      if (hard.indexOf(hard[hard.length - 1]) !== hard.length - 1) pivotRepeats++;
    }
    expect(pivotRepeats).toBeGreaterThan(100);
  });
});

describe('sort answer parsing', () => {
  const item = selectionItem(42, 'normal');
  const { values, k } = selectionSpec(42, 'normal');
  const want = refSelectionAfter(values, k);

  it('accepts commas, spaces and brackets', () => {
    expect(item.check(want.join(',')).correct).toBe(true);
    expect(item.check(`  ${want.join('   ')} `).correct).toBe(true);
    expect(item.check(`[${want.join(', ')}]`).correct).toBe(true);
  });

  it('re-prompts for a wrong count or non-numbers without counting', () => {
    const short = item.check(want.slice(1).join(' '));
    expect(short.counted).toBe(false);
    expect(short.reason).toContain(`has ${values.length} values`);
    expect(item.check('first pass').counted).toBe(false);
  });

  it('re-prompts sub-lists without two bracketed groups', () => {
    const sub = sublistsItem(42, 'normal');
    expect(sub.check('1 2 3').counted).toBe(false);
    expect(sub.check('[1] [2] [3]').counted).toBe(false);
  });

  it('shows a pass-by-pass trace after a wrong answer', () => {
    const wrong = item.check(values.join(' '));
    if (!wrong.correct) {
      expect(wrong.followUp?.[0]).toMatchObject({ kind: 'pre', label: 'Pass by pass' });
    }
  });
});

describe('sort concepts', () => {
  it('accepts the right named answer and rejects the other', () => {
    for (const c of SORT_WHICH) {
      const other = SORT_ANSWERS.find((a) => a.value !== c.answer)!;
      const right = SORT_ANSWERS.find((a) => a.value === c.answer)!;
      let seed = 1;
      while (conceptItem(seed, 'normal').instance !== `sort:concept:seed=${seed}:id=${c.id}:normal`) seed++;
      const item = conceptItem(seed, 'normal');
      expect(item.check(right.label).correct).toBe(true);
      expect(item.check(right.label.toUpperCase().replace(' ', '')).correct).toBe(true);
      expect(item.check(other.label).correct).toBe(false);
      expect(item.check('bubble sort').counted).toBe(false);
      expect(item.chips).toEqual(['selection sort', 'quick sort']);
    }
  });

  it('marks lettered concept questions', () => {
    for (const c of SORT_CHOICE) {
      let seed = 1;
      while (!conceptItem(seed, 'easy').instance!.includes(`id=${c.id}:`)) seed++;
      const item = conceptItem(seed, 'easy');
      expect(item.check('ABCD'[c.answer]).correct).toBe(true);
      expect(item.check(String(c.answer + 1)).correct).toBe(true);
      expect(item.check('ABCD'[(c.answer + 1) % 4]).correct).toBe(false);
      expect(item.check('maybe').counted).toBe(false);
    }
  });
});

describe('sort rounds and instances', () => {
  it('plans 10 items: 3 selection, 2 partition and sub-list pairs, 2 concepts, 1 count', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const plan = planSortRound(seed);
      expect(plan).toHaveLength(10);
      const kinds = plan.map((p) => p.kind);
      expect(kinds.filter((k) => k === 'selection')).toHaveLength(3);
      expect(kinds.filter((k) => k === 'partition')).toHaveLength(2);
      expect(kinds.filter((k) => k === 'sublists')).toHaveLength(2);
      expect(kinds.filter((k) => k === 'concept')).toHaveLength(2);
      expect(kinds.filter((k) => k === 'count')).toHaveLength(1);
      plan.forEach((p, i) => {
        if (p.kind === 'partition') expect(plan[i + 1]).toEqual({ kind: 'sublists', seed: p.seed });
      });
      const concepts = plan.filter((p) => p.kind === 'concept').map((p) => conceptItem(p.seed, 'normal').instance);
      expect(new Set(concepts.map((c) => c!.split(':id=')[1])).size).toBe(2);
    }
  });

  it('regenerates every item from its instance string', () => {
    for (const seed of SEEDS.slice(0, 200)) {
      for (const level of LEVELS) {
        const item = generateSortItem(seed, level);
        expect(item.id).toMatch(/^gen-sort-[a-z]+$/);
        expect(item.instance).toMatch(/^sort:[a-z]+:seed=\d+:.+:(easy|normal|hard)$/);
        const again = fromSortInstance(item.instance!);
        expect(again?.prompt).toEqual(item.prompt);
        expect(generateSortItem(seed, level).prompt).toEqual(item.prompt);
      }
    }
    expect(fromSortInstance('sort:bogus:seed=1:x:easy')).toBeNull();
    expect(fromSortInstance('search:binary:seed=1:x:easy')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };
    const session = game.start(ctx, { difficulty: level, seed: 99 });
    expect(session.progress).toEqual({ current: 1, total: 10 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      expect(session.prompt().length).toBeGreaterThan(1);
      const probe = session.answer('?');
      expect(probe.counted).toBe(false);
      const typed = /^[A-D]\. /.test(probe.expected) ? probe.expected[0] : probe.expected;
      expect(session.answer(typed).correct).toBe(true);
    }
    const summary = session.summary();
    expect(summary).toMatchObject({ gameId: 'sort', score: 10, total: 10 });
    expect(summary.perKk['U3O1-KK12']).toEqual({ correct: 10, total: 10 });
  });
});
