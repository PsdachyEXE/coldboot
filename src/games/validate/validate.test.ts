/**
 * `validate` over 500 field seeds at each difficulty. A reference validator, written separately and
 * working only from the printed specification and inputs, decides every answer; the items must
 * accept it and reject the other checks. Boundary answers are checked with the same reference.
 */
import { describe, expect, it } from 'vitest';
import type { TerminalBlock } from '../../terminal/blocks';
import type { Difficulty, QuizItem } from '../types';
import { formatDate, parseDate } from './fields';
import game from './index';
import {
  BATCH_SIZE,
  boundaryItem,
  boundarySpec,
  checkItem,
  fieldAndBatch,
  fromValidateInstance,
  generateValidateItem,
  parseVerdict,
  planValidateRound,
  validateItem,
  VERDICT_CHIPS,
} from './items';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 1);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

// ---------------------------------------------------------------------------
// Reference: reads the printed specification line and judges inputs with its own rules.
// ---------------------------------------------------------------------------

interface Printed {
  required: boolean;
  kind: 'whole' | 'decimal' | 'date' | 'text';
  places: number;
  lo: number;
  hi: number;
}

function toDay(ddmmyyyy: string): number | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(ddmmyyyy);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12);
  if (d.getDate() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1) return null;
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

function readSpec(item: QuizItem): Printed {
  const block = item.prompt.find((b): b is Extract<TerminalBlock, { kind: 'pre' }> => b.kind === 'pre' && b.label === 'Field specification');
  if (!block) throw new Error('no specification');
  const [, rest] = block.text.split(': ');
  const [need, what, bounds] = rest.replace(/\.$/, '').split(', ');
  const required = need === 'required';
  if (what === 'whole number') {
    const [lo, hi] = bounds.split(' to ').map(Number);
    return { required, kind: 'whole', places: 0, lo, hi };
  }
  if (what.startsWith('number to ')) {
    const [lo, hi] = bounds.split(' to ').map(Number);
    return { required, kind: 'decimal', places: what.includes('one') ? 1 : 2, lo, hi };
  }
  if (what === 'date written DD/MM/YYYY') {
    const [lo, hi] = bounds.split(' to ').map((d) => toDay(d)!);
    return { required, kind: 'date', places: 0, lo, hi };
  }
  const exactly = /^exactly (\d+) characters long$/.exec(bounds);
  if (exactly) return { required, kind: 'text', places: 0, lo: Number(exactly[1]), hi: Number(exactly[1]) };
  const m = /^(\d+) to (\d+) characters long$/.exec(bounds)!;
  return { required, kind: 'text', places: 0, lo: Number(m[1]), hi: Number(m[2]) };
}

function reference(p: Printed, input: string): 'existence' | 'type' | 'range' | 'valid' {
  if (input.length === 0) return p.required ? 'existence' : 'valid';
  let value: number | null;
  if (p.kind === 'text') value = [...input].length;
  else if (p.kind === 'date') value = /^\d\d\/\d\d\/\d{4}$/.test(input) ? toDay(input) : null;
  else {
    const n = input.trim() === input && input !== '' ? Number(input) : NaN;
    const ok = Number.isFinite(n) && /^[0-9.]+$/.test(input) && (p.kind === 'decimal' || Number.isInteger(n)) && !input.startsWith('.');
    value = ok ? n : null;
  }
  if (value === null) return 'type';
  return value < p.lo || value > p.hi ? 'range' : 'valid';
}

function enteredInputs(item: QuizItem): string[] {
  const table = item.prompt.find((b): b is Extract<TerminalBlock, { kind: 'table' }> => b.kind === 'table')!;
  return table.rows.map((r) => (r[1] === '(nothing entered)' ? '' : r[1].slice(1, -1)));
}

describe('validate checks against a reference validator', () => {
  it.each(LEVELS)('names the first failing check for every input (%s, 500 fields)', (level) => {
    for (const seed of SEEDS) {
      const { spec, inputs } = fieldAndBatch(seed, level);
      expect(inputs).toHaveLength(BATCH_SIZE);
      expect(new Set(inputs).size, `seed ${seed}`).toBe(BATCH_SIZE);
      const verdicts: string[] = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        const item = checkItem(seed, i, level);
        const printed = readSpec(item);
        const shownInputs = enteredInputs(item);
        expect(shownInputs, `seed ${seed}`).toEqual(inputs);
        const want = reference(printed, inputs[i]);
        verdicts.push(want);
        const label = `${level} seed ${seed} input ${JSON.stringify(inputs[i])} for ${spec.label}`;
        expect(item.check(want).correct, label).toBe(true);
        for (const other of VERDICT_CHIPS.filter((c) => c !== want)) expect(item.check(other).correct, `${label} not ${other}`).toBe(false);
        expect(item.check('maybe').counted).toBe(false);
        // Rows already answered show their result; the current row shows a question mark.
        const table = item.prompt.find((b) => b.kind === 'table');
        if (table?.kind === 'table') {
          expect(table.rows[i][2]).toBe('?');
          table.rows.slice(0, i).forEach((r, j) => expect(r[2]).toBe(verdicts[j] === 'valid' ? 'valid' : `${verdicts[j]} check`));
          table.rows.slice(i + 1).forEach((r) => expect(r[2]).toBe(''));
        }
        expect(fromValidateInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
      // Each batch has a valid input, a range failure, a type failure where one is possible, and a blank.
      expect(verdicts, `seed ${seed}`).toContain('valid');
      expect(verdicts, `seed ${seed}`).toContain('range');
      if (spec.kind !== 'text') expect(verdicts, `seed ${seed}`).toContain('type');
      expect(inputs).toContain('');
      if (spec.required) expect(verdicts).toContain('existence');
      else expect(verdicts).not.toContain('existence');
    }
  });

  it('keeps every input to one reading', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const { spec, inputs } = fieldAndBatch(seed, level);
        for (const input of inputs) {
          expect(input, `seed ${seed}`).toBe(input.trim());
          if (spec.kind === 'whole' || spec.kind === 'decimal') expect(input).not.toMatch(/^-/);
          if (spec.kind === 'decimal' && /^\d+(\.\d+)?$/.test(input)) {
            // Numbers in a decimal field always carry exactly the stated decimal places.
            expect(input.split('.')[1]?.length, `${spec.label} ${input}`).toBe(spec.places);
          }
          if (spec.kind === 'date' && input) {
            const isDate = /^\d\d\/\d\d\/\d{4}$/.test(input) && parseDate(input, true) !== null;
            expect(isDate || /[a-z]/i.test(input), `${spec.label} ${input}`).toBe(true);
          }
        }
      }
    }
  });
});

describe('validate boundary values', () => {
  it.each(LEVELS)('accepts the boundary values in any order and rejects near misses (%s, 500 fields)', (level) => {
    for (const seed of SEEDS) {
      const item = boundaryItem(seed, level);
      const printed = readSpec(item);
      const { ask, values } = boundarySpec(seed, level);
      const step = printed.kind === 'decimal' ? 10 ** -printed.places : 1;
      const fmt = (v: number) => (printed.kind === 'date' ? formatDate(v) : printed.kind === 'decimal' ? v.toFixed(printed.places) : String(v));
      // Reference boundaries: the ends are valid and one step beyond them is a range failure.
      const lowest = printed.lo;
      const highest = printed.hi;
      const below = Number((printed.lo - step).toFixed(printed.places));
      const above = Number((printed.hi + step).toFixed(printed.places));
      const asText = (v: number) => (printed.kind === 'text' ? 'x'.repeat(v) : fmt(v));
      if (printed.kind !== 'text' || lowest > 0) expect(reference(printed, asText(lowest))).toBe('valid');
      expect(reference(printed, asText(highest))).toBe('valid');
      if (below > 0 || printed.kind !== 'text') expect(reference(printed, asText(below))).toBe(printed.kind === 'text' && below === 0 ? 'existence' : 'range');
      expect(reference(printed, asText(above))).toBe('range');
      const want = ask === 'valid-ends' ? [lowest, highest] : ask === 'outside' ? [below, above] : [lowest, highest, below, above];
      expect(values.map(fmt), `seed ${seed}`).toEqual(want.map(fmt));
      const label = `${level} seed ${seed} ${ask}`;
      expect(item.check(want.map(fmt).join(', ')).correct, label).toBe(true);
      expect(item.check([...want].reverse().map(fmt).join(' ')).correct, label).toBe(true);
      const nudged = [...want];
      nudged[0] = printed.kind === 'date' ? nudged[0] + 1 : Number((nudged[0] + step).toFixed(printed.places));
      const miss = item.check(nudged.map(fmt).join(' '));
      if (fmt(nudged[0]) !== fmt(want[1])) {
        expect(miss.correct, label).toBe(false);
        expect(miss.reason).toContain('Missing:');
      }
      expect(item.check(want.slice(1).map(fmt).join(' ')).counted).toBe(false);
      expect(item.check('the lowest').counted).toBe(false);
      expect(fromValidateInstance(item.instance!)?.prompt).toEqual(item.prompt);
    }
  });

  it('accepts dates with or without leading zeros, and decimals with trailing zeros', () => {
    let seed = 1;
    while (boundarySpec(seed, 'hard').spec.kind !== 'date') seed++;
    const { values } = boundarySpec(seed, 'hard');
    const loose = values.map((v) => formatDate(v).replace(/^0/, '').replace(/\/0/, '/')).join(' ');
    expect(boundaryItem(seed, 'hard').check(loose).correct).toBe(true);
    seed = 1;
    while (boundarySpec(seed, 'normal').spec.kind !== 'decimal') seed++;
    const dec = boundarySpec(seed, 'normal');
    expect(boundaryItem(seed, 'normal').check(dec.values.map((v) => `${v.toFixed(dec.spec.places)}0`).join(' ')).correct).toBe(true);
  });
});

describe('validate answers and rounds', () => {
  it('parses check names leniently', () => {
    expect(parseVerdict('Range')).toBe('range');
    expect(parseVerdict('range check')).toBe('range');
    expect(parseVerdict('the existence check')).toBe('existence');
    expect(parseVerdict('t')).toBe('type');
    expect(parseVerdict('Valid.')).toBe('valid');
    expect(parseVerdict('presence')).toBeNull();
    expect(parseVerdict('type range')).toBeNull();
  });

  it('plans two fields of four inputs and a boundary question each', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS.slice(0, 200)) {
        const plan = planValidateRound(seed, level);
        expect(plan.map((p) => p.kind)).toEqual(['check', 'check', 'check', 'check', 'boundary', 'check', 'check', 'check', 'check', 'boundary']);
        expect(plan.slice(0, 4).map((p) => p.index)).toEqual([0, 1, 2, 3]);
        expect(new Set(plan.slice(0, 5).map((p) => p.seed)).size).toBe(1);
        expect(plan[0].seed).not.toBe(plan[5].seed);
        const kinds = [plan[0], plan[5]].map((p) => fieldAndBatch(p.seed, level).spec.kind);
        expect(kinds[0]).not.toBe(kinds[1]);
      }
    }
  });

  it('generates standalone items deterministically', () => {
    const ids = new Set<string>();
    for (const seed of SEEDS.slice(0, 200)) {
      for (const level of LEVELS) {
        const item = generateValidateItem(seed, level);
        ids.add(item.id);
        expect(generateValidateItem(seed, level).prompt).toEqual(item.prompt);
        expect(fromValidateInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
    expect([...ids].sort()).toEqual(['gen-validate-boundary', 'gen-validate-check']);
    expect(fromValidateInstance('validate:check:seed=1:easy')).toBeNull();
    expect(validateItem({ kind: 'boundary', seed: 3 }, 'easy').id).toBe('gen-validate-boundary');
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };
    const session = game.start(ctx, { difficulty: level, seed: 8 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('???').expected;
      expect(session.answer(expected).correct).toBe(true);
    }
    expect(session.summary()).toMatchObject({ gameId: 'validate', score: 10, total: 10 });
  });
});
