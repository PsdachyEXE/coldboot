/** Answer normalisation and fuzzy matching shared by the terminal and the games. */

/**
 * Lowercase, trim, collapse internal whitespace, and peel off trailing full stops and wrapping
 * quotes in any order: '"Logic".' and "'runtime'." both normalise cleanly.
 */
export function normaliseAnswer(input: string): string {
  let s = input.trim().replace(/\s+/g, ' ');
  for (;;) {
    const next = s.replace(/\.+$/, '').replace(/^["'`\u2018\u2019\u201c\u201d]+|["'`\u2018\u2019\u201c\u201d]+$/g, '').trim();
    if (next === s) break;
    s = next;
  }
  return s.toLowerCase();
}

/** Levenshtein distance (insert, delete, substitute each cost 1). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** The closest candidate within `maxDistance`, or null. Ties go to the earlier candidate. */
export function nearest(input: string, candidates: readonly string[], maxDistance = 2): string | null {
  const needle = input.toLowerCase();
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const c of candidates) {
    const d = editDistance(needle, c.toLowerCase());
    if (d < bestDistance) {
      best = c;
      bestDistance = d;
    }
  }
  return bestDistance <= maxDistance ? best : null;
}

/**
 * Splits a typed list leniently: commas and/or whitespace separate values, and surrounding
 * brackets are ignored. "[3, 1 ,2]" and "3 1 2" both give ["3", "1", "2"].
 */
export function parseList(input: string): string[] {
  return input
    .trim()
    .replace(/^[[({]|[\])}]$/g, '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** parseList, then every value must be a finite number; otherwise null. */
export function parseNumberList(input: string): number[] | null {
  const parts = parseList(input);
  if (!parts.length) return null;
  const nums = parts.map(Number);
  return nums.every(Number.isFinite) ? nums : null;
}

/** Case-insensitive, whitespace-tolerant equality. */
export function sameAnswer(a: string, b: string): boolean {
  return normaliseAnswer(a) === normaliseAnswer(b);
}

// C0 and C1 controls, DEL, bidi embeddings/overrides/isolates and marks, zero-width characters and BOM.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;

/**
 * Strips control, bidi-override and zero-width characters, trims, and caps the length in code
 * points (never splitting a surrogate pair). Used for display names, history and imported strings.
 */
export function cleanPlainText(input: string, maxLength: number): string {
  return Array.from(input.replace(UNSAFE_CHARS, '').trim()).slice(0, maxLength).join('').trim();
}

/** True when `input` is already clean (used to validate imported strings without changing them). */
export function isCleanPlainText(input: string, maxLength: number): boolean {
  return cleanPlainText(input, maxLength) === input;
}

/**
 * Splits bracketed groups: "[1, 2] [4, 5]" gives [["1","2"],["4","5"]]. Text outside brackets is
 * treated as one group, so "3 1 2" gives [["3","1","2"]]. Empty groups are kept ("[] [4]").
 */
export function parseGroups(input: string): string[][] {
  const groups = [...input.matchAll(/[[({]([^\])}]*)[\])}]/g)].map((m) => parseList(m[1]));
  if (groups.length) return groups;
  const flat = parseList(input);
  return flat.length ? [flat] : [];
}
