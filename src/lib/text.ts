/** Answer normalisation and fuzzy matching shared by the terminal and the games. */

/** Lowercase, trim, collapse internal whitespace, drop a trailing full stop and wrapping quotes. */
export function normaliseAnswer(input: string): string {
  return input
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
    .toLowerCase();
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

/** Strips control characters and trims; used for display names and imported strings. */
export function cleanPlainText(input: string, maxLength: number): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}
