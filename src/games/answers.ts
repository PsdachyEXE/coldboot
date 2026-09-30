/**
 * Answer parsing shared by the games. Parsing is lenient where the brief says so (case, extra
 * whitespace, commas or spaces between values, optional brackets) and strict about the values
 * themselves: a whole-number answer never accepts 15.5, and a list never drops a value.
 */
import { normaliseAnswer, parseGroups, parseNumberList } from '../lib/text';

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/**
 * A lettered or numbered choice: "b", "B", "(b)", "b)", "B.", "option b" or "2" give 1.
 * Returns the 0-based index, or null when the input isn't one of the `count` choices.
 */
export function parseChoice(input: string, count = 4): number | null {
  const s = normaliseAnswer(input).replace(/^option\s+/, '');
  const m = /^[([]?\s*([a-z]|\d{1,2})\s*[)\]:]?$/.exec(s);
  if (!m) return null;
  const token = m[1];
  const index = /^\d+$/.test(token) ? Number(token) - 1 : token.charCodeAt(0) - 97;
  return index >= 0 && index < count ? index : null;
}

/** Whole numbers typed leniently ("3, 1 2", "[3 1 2]"). Null when empty or any value isn't whole. */
export function parseIntList(input: string): number[] | null {
  const nums = parseNumberList(input);
  return nums && nums.every(Number.isInteger) ? nums : null;
}

/**
 * Bracketed groups of whole numbers: "[3, 1] [9 8]" or "(3 1) ()" give [[3, 1], [9, 8]] and
 * [[3, 1], []]. Null when a value isn't a whole number.
 */
export function parseIntGroups(input: string): number[][] | null {
  const groups = parseGroups(input);
  const out: number[][] = [];
  for (const g of groups) {
    const nums = g.map(Number);
    if (!nums.every(Number.isInteger)) return null;
    out.push(nums);
  }
  return out;
}

/**
 * One whole number, optionally followed by words: "15", " 15 ", "15 comparisons". Null for
 * anything else, including "15.5" and "about 15".
 */
export function parseCount(input: string): number | null {
  const m = /^(-?\d+)(?:\s+[a-z][a-z\s]*)?$/.exec(normaliseAnswer(input));
  return m ? Number(m[1]) : null;
}

function squash(s: string): string {
  return normaliseAnswer(s).replace(/[\s_-]+/g, '');
}

/**
 * Matches a typed word answer against named options, ignoring case, spaces and hyphens:
 * "Quick sort", "quicksort" and "quick-sort" all match an option that accepts "quick sort".
 */
export function matchOption<T extends string>(input: string, options: readonly { value: T; accept: readonly string[] }[]): T | null {
  const key = squash(input);
  if (!key) return null;
  for (const o of options) {
    if (o.accept.some((a) => squash(a) === key)) return o.value;
  }
  return null;
}

/** "3, 1, 2" for display. */
export function formatList(values: readonly (number | string)[]): string {
  return values.join(', ');
}

/** "[3, 1] [9, 8]" for display, with [] for an empty group. */
export function formatGroups(groups: readonly (readonly number[])[]): string {
  return groups.map((g) => `[${g.join(', ')}]`).join(' ');
}

/** "3", "3 and 5", "3, 5 and 8" for prose. */
export function formatAnd(values: readonly (number | string)[]): string {
  if (values.length <= 1) return values.join('');
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

export function sameList(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
