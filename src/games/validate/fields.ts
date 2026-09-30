/**
 * Field specifications and the validator for `validate`. A field has one data kind (whole number,
 * decimal, date written as text, or text with a length limit), is required or optional, and has a
 * range. Checks run in a fixed order, stated in every question: existence, then type, then range.
 * The first check that fails rejects the input; an input that passes all three is valid.
 *
 * Every expected answer comes from `firstFailedCheck`, never from how an input was made. Inputs
 * are generated so that exactly one reading is possible: whole-number fields never see negative
 * numbers, decimal fields never see whole numbers or extra decimal places, date fields only see
 * real dates in the stated format or text that is plainly not a date, and nothing is blank but
 * for spaces.
 */
import { pick, randInt, shuffle, type Rng } from '../prng';
import type { Difficulty } from '../types';

export type FieldKind = 'whole' | 'decimal' | 'date' | 'text';
export type CheckName = 'existence' | 'type' | 'range';
export type Verdict = CheckName | 'valid';

export interface FieldSpec {
  kind: FieldKind;
  label: string;
  required: boolean;
  /** Whole and decimal: the value. Date: a day number (see dayNumber). Text: the length in characters. */
  min: number;
  max: number;
  /** Decimal places for decimal fields (1 or 2); 0 otherwise. */
  places: 0 | 1 | 2;
}

export const CHECK_ORDER: readonly CheckName[] = ['existence', 'type', 'range'];

// ---------------------------------------------------------------------------
// Dates as day numbers
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

export function dayNumber(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

/** DD/MM/YYYY. */
export function formatDate(day: number): string {
  const t = new Date(day * DAY_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(t.getUTCDate())}/${pad(t.getUTCMonth() + 1)}/${t.getUTCFullYear()}`;
}

/** A real calendar date written D/M/YYYY or DD/MM/YYYY, as a day number; null otherwise. */
export function parseDate(text: string, strict = false): number | null {
  const m = (strict ? /^(\d{2})\/(\d{2})\/(\d{4})$/ : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/).exec(text.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const day = dayNumber(y, mo, d);
  const back = new Date(day * DAY_MS);
  return back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d ? day : null;
}

// ---------------------------------------------------------------------------
// Formatting and validation
// ---------------------------------------------------------------------------

export function formatBound(spec: FieldSpec, v: number): string {
  if (spec.kind === 'decimal') return v.toFixed(spec.places);
  if (spec.kind === 'date') return formatDate(v);
  return String(v);
}

/** "Age in years: required, whole number, 16 to 120." */
export function specText(spec: FieldSpec): string {
  const need = spec.required ? 'required' : 'optional';
  const range = `${formatBound(spec, spec.min)} to ${formatBound(spec, spec.max)}`;
  switch (spec.kind) {
    case 'whole':
      return `${spec.label}: ${need}, whole number, ${range}.`;
    case 'decimal':
      return `${spec.label}: ${need}, number to ${spec.places === 1 ? 'one decimal place' : 'two decimal places'}, ${range}.`;
    case 'date':
      return `${spec.label}: ${need}, date written DD/MM/YYYY, ${range}.`;
    case 'text':
      return `${spec.label}: ${need}, text, ${spec.min === spec.max ? `exactly ${spec.min}` : range} characters long.`;
  }
}

/** The numeric value an input stands for, or null when it fails the type check. */
export function typedValue(spec: FieldSpec, input: string): number | null {
  switch (spec.kind) {
    case 'whole':
      return /^\d+$/.test(input) ? Number(input) : null;
    case 'decimal':
      return /^\d+(\.\d+)?$/.test(input) ? Number(input) : null;
    case 'date':
      return parseDate(input, true);
    case 'text':
      return Array.from(input).length;
  }
}

/** Runs existence, type and range in that order and returns the first that fails, or 'valid'. */
export function firstFailedCheck(spec: FieldSpec, input: string): Verdict {
  if (input === '') return spec.required ? 'existence' : 'valid';
  const v = typedValue(spec, input);
  if (v === null) return 'type';
  return v < spec.min || v > spec.max ? 'range' : 'valid';
}

/** One line on why an input gets its verdict. */
export function explain(spec: FieldSpec, input: string): string {
  const verdict = firstFailedCheck(spec, input);
  const shown = `"${input}"`;
  const range = `${formatBound(spec, spec.min)} to ${formatBound(spec, spec.max)}`;
  switch (verdict) {
    case 'existence':
      return 'Nothing was entered and the field is required, so the existence check rejects it.';
    case 'type': {
      const what = spec.kind === 'whole' ? 'a whole number' : spec.kind === 'decimal' ? 'a number' : 'a real date written DD/MM/YYYY';
      return `${shown} isn't ${what}, so the type check rejects it.`;
    }
    case 'range': {
      if (spec.kind === 'text') return `${shown} has ${typedValue(spec, input)} characters, outside ${range}, so the range check rejects it.`;
      const side = typedValue(spec, input)! < spec.min ? (spec.kind === 'date' ? 'before' : 'below') : spec.kind === 'date' ? 'after' : 'above';
      return `${shown} passes the type check but is ${side} the range ${range}, so the range check rejects it.`;
    }
    case 'valid':
      return input === '' ? 'Nothing was entered, but the field is optional, so it is valid.' : `${shown} passes the existence, type and range checks, so it is valid.`;
  }
}

// ---------------------------------------------------------------------------
// The bank of fields
// ---------------------------------------------------------------------------

type Maker = (rng: Rng) => FieldSpec;

const WHOLE: readonly Maker[] = [
  (rng) => ({ kind: 'whole', label: 'Age in years', required: true, min: randInt(rng, 12, 18), max: pick(rng, [99, 110, 120]), places: 0 }),
  (rng) => ({ kind: 'whole', label: 'Tickets in one booking', required: true, min: 1, max: randInt(rng, 6, 12), places: 0 }),
  () => ({ kind: 'whole', label: 'Year level', required: true, min: 7, max: 12, places: 0 }),
  () => ({ kind: 'whole', label: 'Delivery postcode', required: true, min: 3000, max: 3999, places: 0 }),
  () => ({ kind: 'whole', label: 'Phone extension', required: false, min: 100, max: 999, places: 0 }),
  (rng) => ({ kind: 'whole', label: 'Number of guests', required: false, min: 1, max: randInt(rng, 4, 10), places: 0 }),
  (rng) => ({ kind: 'whole', label: 'Quantity ordered', required: true, min: 1, max: pick(rng, [20, 50, 99]), places: 0 }),
];

const DECIMAL: readonly Maker[] = [
  (rng) => ({ kind: 'decimal', label: 'Parcel weight in kilograms', required: true, min: 0.5, max: pick(rng, [20, 25, 30]), places: 1 }),
  (rng) => ({ kind: 'decimal', label: 'Hours worked in a shift', required: true, min: 0.5, max: pick(rng, [8, 10, 12]), places: 1 }),
  () => ({ kind: 'decimal', label: 'Body temperature in degrees Celsius', required: true, min: 34, max: 42, places: 1 }),
  (rng) => ({ kind: 'decimal', label: 'Donation in dollars', required: false, min: 2, max: pick(rng, [200, 500]), places: 2 }),
  () => ({ kind: 'decimal', label: 'Price in dollars', required: true, min: 0.5, max: 999.99, places: 2 }),
];

const DATE: readonly Maker[] = [
  (rng) => {
    const month = randInt(rng, 1, 12);
    const year = pick(rng, [2026, 2027]);
    return { kind: 'date', label: 'Booking date', required: true, min: dayNumber(year, month, 1), max: dayNumber(year, month + 1, 0), places: 0 };
  },
  (rng) => {
    const start = dayNumber(2026, randInt(rng, 1, 12), randInt(rng, 1, 28));
    return { kind: 'date', label: 'Holiday start date', required: false, min: start, max: start + randInt(rng, 60, 180), places: 0 };
  },
  (rng) => {
    const year = randInt(rng, 2007, 2011);
    return { kind: 'date', label: 'Date of birth', required: true, min: dayNumber(year, 1, 1), max: dayNumber(year + 1, 12, 31), places: 0 };
  },
];

const TEXT: readonly Maker[] = [
  (rng) => ({ kind: 'text', label: 'Username', required: true, min: 4, max: pick(rng, [12, 15]), places: 0 }),
  () => ({ kind: 'text', label: 'Discount code', required: false, min: 8, max: 8, places: 0 }),
  () => ({ kind: 'text', label: 'Product code', required: true, min: 6, max: 8, places: 0 }),
  () => ({ kind: 'text', label: 'Middle name', required: false, min: 2, max: 20, places: 0 }),
  (rng) => ({ kind: 'text', label: 'Team name', required: true, min: 3, max: pick(rng, [16, 20]), places: 0 }),
];

const KINDS_BY_LEVEL: Record<Difficulty, readonly FieldKind[]> = {
  easy: ['whole', 'whole', 'text', 'decimal'],
  normal: ['whole', 'decimal', 'date', 'text'],
  hard: ['whole', 'decimal', 'date', 'date', 'text'],
};

const BANK: Record<FieldKind, readonly Maker[]> = { whole: WHOLE, decimal: DECIMAL, date: DATE, text: TEXT };

export function fieldFor(rng: Rng, difficulty: Difficulty, kind?: FieldKind): FieldSpec {
  return pick(rng, BANK[kind ?? pick(rng, KINDS_BY_LEVEL[difficulty])])(rng);
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

const NOT_WHOLE = ['sixteen', 'ten', 'twelve', 'n/a', 'lots'];
const NOT_NUMBER = ['heavy', 'twelve', 'n/a', 'a few'];
const NOT_DATE = ['next Friday', 'TBA', 'March', 'soon', 'tomorrow', 'the 5th'];
const TEXT_PARTS = ['wattle', 'creek', 'koala', 'reef', 'emu', 'gum', 'tram', 'swift', 'harbour', 'comet', 'river', 'quokka', 'banksia', 'dune', 'kiri', 'sam'];

/** Plausible text of exactly n characters: words run together, sometimes ending in a digit. */
function textOfLength(rng: Rng, n: number): string {
  let s = pick(rng, TEXT_PARTS);
  while (s.length < n) s += rng() < 0.3 ? String(randInt(rng, 1, 9)) : pick(rng, TEXT_PARTS);
  return s.slice(0, n);
}

function between(rng: Rng, spec: FieldSpec, lo: number, hi: number): number {
  if (spec.kind !== 'decimal') return randInt(rng, Math.ceil(lo), Math.floor(hi));
  const scale = 10 ** spec.places;
  return randInt(rng, Math.ceil(lo * scale), Math.floor(hi * scale)) / scale;
}

/** An input that should get `want`. The validator, not this function, decides the answer. */
export function inputFor(rng: Rng, spec: FieldSpec, want: Verdict): string {
  const step = spec.kind === 'decimal' ? 10 ** -spec.places : 1;
  switch (want) {
    case 'existence':
      return '';
    case 'type':
      if (spec.kind === 'whole') {
        const mid = between(rng, spec, spec.min, spec.max);
        return pick(rng, [...NOT_WHOLE, `${mid}.5`, `${mid}a`]);
      }
      if (spec.kind === 'decimal') return pick(rng, [...NOT_NUMBER, `${Math.round(spec.max / 2)}kg`]);
      return pick(rng, NOT_DATE);
    case 'range': {
      const below = spec.min - step >= (spec.kind === 'text' ? 1 : 0);
      const low = below && rng() < 0.5;
      const near = rng() < 0.6;
      if (spec.kind === 'text') {
        const len = low ? (near ? spec.min - 1 : randInt(rng, 1, spec.min - 1)) : near ? spec.max + 1 : spec.max + randInt(rng, 2, 6);
        return textOfLength(rng, len);
      }
      const far = spec.kind === 'date' ? randInt(rng, 2, 40) : spec.kind === 'decimal' ? between(rng, spec, step * 2, Math.max(step * 2, spec.min / 2)) : randInt(rng, 2, 20);
      if (low) return formatBound(spec, near ? spec.min - step : Math.max(0, spec.min - far));
      return formatBound(spec, near ? spec.max + step : spec.max + far);
    }
    case 'valid': {
      if (spec.kind === 'text') return textOfLength(rng, randInt(rng, spec.min, spec.max));
      const r = rng();
      return formatBound(spec, r < 0.25 ? spec.min : r < 0.5 ? spec.max : between(rng, spec, spec.min, spec.max));
    }
  }
}

/**
 * A batch of test inputs for one field: at least one valid input and one caught by each check
 * that can fail for this field (text always passes the type check; an optional field's blank is
 * valid), then extra inputs, all distinct and shuffled.
 */
export function batchFor(rng: Rng, spec: FieldSpec, size: number): string[] {
  const inputs: string[] = [];
  const add = (want: Verdict) => {
    for (let tries = 0; tries < 20; tries++) {
      const input = inputFor(rng, spec, want);
      if (!inputs.includes(input)) {
        inputs.push(input);
        return;
      }
    }
  };
  add('valid');
  add('range');
  if (spec.kind !== 'text') add('type');
  // A blank: the existence check rejects it when the field is required; otherwise it is valid.
  inputs.push('');
  const extra: Verdict[] = spec.kind === 'text' ? ['valid', 'range'] : ['valid', 'range', 'type'];
  for (let guard = 0; inputs.length < size && guard < 100; guard++) add(pick(rng, extra));
  return shuffle(rng, inputs);
}
