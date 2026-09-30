/**
 * Every search generator is checked against reference implementations written differently from
 * ./algorithms.ts, over 500 seeds at each difficulty, through the item's own answer checker.
 */
import { describe, expect, it } from 'vitest';
import { binaryWorstCase, halvingChain } from './algorithms';
import { SEARCH_ANSWERS, SEARCH_CHOICE, SEARCH_WHICH } from './concepts';
import game from './index';
import { binarySpec, fromSearchInstance, generateSearchItem, linearSpec, maxSpec, planSearchRound, scenarioId, searchItem } from './items';
import type { Difficulty } from '../types';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 6007 + 3);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

// ---------------------------------------------------------------------------
// Reference implementations (deliberately written another way)
// ---------------------------------------------------------------------------

/** Recursive binary search over 0-based positions; indexes shift by the base only at the end. */
function refBinary(values: number[], target: number, base: 0 | 1): number[] {
  const visit = (lo: number, hi: number): number[] => {
    if (lo > hi) return [];
    // (low + high) DIV 2 in the stated base equals the 0-based midpoint plus the base.
    const mid = (lo + hi) >> 1;
    if (values[mid] === target) return [mid];
    return [mid, ...(values[mid] < target ? visit(mid + 1, hi) : visit(lo, mid - 1))];
  };
  return visit(0, values.length - 1).map((i) => i + base);
}

/** Linear search via indexOf. */
function refLinear(values: number[], target: number, base: 0 | 1): number[] {
  const at = values.indexOf(target);
  const upTo = at === -1 ? values.length : at + 1;
  return Array.from({ length: upTo }, (_, i) => i + base);
}

/** Worst case by bit length: floor(log2 n) + 1. */
function refWorst(n: number): number {
  return n.toString(2).length;
}

/** Worst case by brute force: the longest binary search over every present and absent target. */
function bruteWorst(n: number): number {
  const values = Array.from({ length: n }, (_, i) => 2 * i + 1);
  let worst = 0;
  for (let t = 0; t <= 2 * n; t++) worst = Math.max(worst, refBinary(values, t, 0).length);
  return worst;
}

describe('search generators against reference implementations', () => {
  it.each(LEVELS)('binary search index sequences for present targets (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const { values, target, base } = binarySpec(seed, level, true);
      expect(values).toContain(target);
      const want = refBinary(values, target, base);
      const item = searchItem({ kind: 'binary', seed }, level);
      expect(item.check(want.join(' ')).correct, `seed ${seed}`).toBe(true);
      expect(item.check(want.map((i) => i + 1).join(', ')).correct).toBe(false);
      expect(item.instance).toBe(`search:binary:seed=${seed}:base=${base}:n=${values.length}:${level}`);
      if (level !== 'easy') expect(want.length).toBeGreaterThanOrEqual(2);
    }
  });

  it.each(LEVELS)('binary search index sequences for missing targets (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const { values, target, base } = binarySpec(seed, level, false);
      expect(values).not.toContain(target);
      const want = refBinary(values, target, base);
      const item = searchItem({ kind: 'binary-miss', seed }, level);
      const r = item.check(`[${want.join(',')}]`);
      expect(r.correct, `seed ${seed}`).toBe(true);
      expect(r.reason).toContain('is not in the array');
      expect(item.check(want.slice(0, -1).join(' ') || '99').correct).toBe(false);
    }
  });

  it.each(LEVELS)('linear search indexes and comparisons (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const { values, target, base } = linearSpec(seed, level);
      const want = refLinear(values, target, base);
      const seq = searchItem({ kind: 'linear', seed }, level);
      expect(seq.check(want.join(', ')).correct, `seed ${seed}`).toBe(true);
      const count = searchItem({ kind: 'linear-count', seed }, level);
      expect(count.check(String(want.length)).correct, `seed ${seed}`).toBe(true);
      expect(count.check(`${want.length} comparisons`).correct).toBe(true);
      expect(count.check(String(want.length + 1)).correct).toBe(false);
    }
  });

  it.each(LEVELS)('most inspections and comparisons (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const { template, n } = maxSpec(seed, level);
      const want = template === 'binary' ? refWorst(n) : n;
      const item = searchItem({ kind: 'max', seed }, level);
      expect(item.check(String(want)).correct, `seed ${seed} ${template} n=${n}`).toBe(true);
      expect(item.check(want.toLocaleString('en-AU')).correct).toBe(true);
      expect(item.check(String(want - 1)).correct).toBe(false);
    }
  });

  it('matches a brute-force worst case for every size up to 300', () => {
    for (let n = 1; n <= 300; n++) {
      expect(binaryWorstCase(n), `n=${n}`).toBe(bruteWorst(n));
      expect(halvingChain(n)).toHaveLength(binaryWorstCase(n));
    }
  });

  it('varies the index base and the hard linear searches repeat the target', () => {
    const bases = new Set(SEEDS.map((s) => binarySpec(s, 'normal', true).base));
    expect(bases).toEqual(new Set([0, 1]));
    let repeats = 0;
    for (const seed of SEEDS) {
      const { values, target } = linearSpec(seed, 'hard');
      if (values.filter((v) => v === target).length > 1) repeats++;
    }
    expect(repeats).toBeGreaterThan(50);
  });

  it('sizes arrays by difficulty', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      expect(binarySpec(seed, 'easy', true).values.length).toBeGreaterThanOrEqual(7);
      expect(binarySpec(seed, 'easy', true).values.length).toBeLessThanOrEqual(9);
      expect(binarySpec(seed, 'hard', true).values.length).toBeGreaterThanOrEqual(14);
      const v = binarySpec(seed, 'normal', false).values;
      expect(v).toEqual([...v].sort((a, b) => a - b));
      expect(new Set(v).size).toBe(v.length);
    }
  });
});

describe('search answer parsing', () => {
  const { values, target, base } = binarySpec(11, 'normal', true);
  const want = refBinary(values, target, base);
  const item = searchItem({ kind: 'binary', seed: 11 }, 'normal');

  it('accepts commas, spaces and brackets', () => {
    expect(item.check(want.join(',')).correct).toBe(true);
    expect(item.check(` ${want.join('  ')} `).correct).toBe(true);
    expect(item.check(`[${want.join(', ')}]`).correct).toBe(true);
  });

  it('re-prompts for text that is not a list of whole numbers', () => {
    expect(item.check('the middle one').counted).toBe(false);
    expect(item.check('4.5 6').counted).toBe(false);
  });

  it('shows the low, high and mid trace after a wrong answer', () => {
    const wrong = item.check('0');
    expect(wrong.correct).toBe(false);
    expect(wrong.followUp?.[0]).toMatchObject({ kind: 'table', columns: ['low', 'high', 'mid', 'value', 'then'] });
  });

  it('states the index base and the rounding in the question', () => {
    const text = item.prompt.map((b) => ('text' in b ? b.text : '')).join(' ');
    expect(text).toContain(`Indexes start at ${base}`);
    expect(text).toContain('mid = (low + high) DIV 2, which rounds down');
  });
});

describe('search scenarios', () => {
  it('accepts the right named answer, synonyms included', () => {
    for (const c of SEARCH_WHICH) {
      let seed = 1;
      while (scenarioId(seed) !== c.id) seed++;
      const item = searchItem({ kind: 'scenario', seed }, 'normal');
      const right = SEARCH_ANSWERS.find((a) => a.value === c.answer)!;
      const other = SEARCH_ANSWERS.find((a) => a.value !== c.answer)!;
      expect(item.check(right.label).correct).toBe(true);
      expect(item.check(right.value.toUpperCase()).correct).toBe(true);
      expect(item.check(other.label).correct).toBe(false);
      expect(item.check('hash table').counted).toBe(false);
    }
    let seed = 1;
    while (scenarioId(seed) !== 'wrong-key') seed++;
    expect(searchItem({ kind: 'scenario', seed }, 'easy').check('sequential search').correct).toBe(true);
  });

  it('marks lettered concept questions', () => {
    for (const c of SEARCH_CHOICE) {
      let seed = 1;
      while (scenarioId(seed) !== c.id) seed++;
      const item = searchItem({ kind: 'scenario', seed }, 'hard');
      expect(item.check('abcd'[c.answer]).correct).toBe(true);
      expect(item.check('abcd'[(c.answer + 2) % 4]).correct).toBe(false);
    }
  });
});

describe('search rounds and instances', () => {
  it('plans 10 items with four binary searches, two linear, three distinct scenarios and one count', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const plan = planSearchRound(seed);
      const kinds = plan.map((p) => p.kind);
      expect(kinds.filter((k) => k === 'binary' || k === 'binary-miss')).toHaveLength(4);
      expect(kinds).toContain('binary-miss');
      expect(kinds.filter((k) => k === 'linear' || k === 'linear-count')).toHaveLength(2);
      expect(kinds.filter((k) => k === 'max')).toHaveLength(1);
      const scenarios = plan.filter((p) => p.kind === 'scenario').map((p) => scenarioId(p.seed));
      expect(new Set(scenarios).size).toBe(3);
    }
  });

  it('regenerates every item from its instance string', () => {
    for (const seed of SEEDS.slice(0, 200)) {
      for (const level of LEVELS) {
        const item = generateSearchItem(seed, level);
        expect(item.id).toMatch(/^gen-search-[a-z]+$/);
        expect(fromSearchInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
    expect(fromSearchInstance('search:nope:seed=1:x:easy')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const ctx = { playerName: '', now: () => 5_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };
    const session = game.start(ctx, { difficulty: level, seed: 2026 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const probe = session.answer('?');
      expect(probe.counted).toBe(false);
      const typed = /^[A-D]\. /.test(probe.expected) ? probe.expected[0] : probe.expected;
      expect(session.answer(typed).correct).toBe(true);
    }
    expect(session.summary()).toMatchObject({ gameId: 'search', score: 10, total: 10 });
  });
});
