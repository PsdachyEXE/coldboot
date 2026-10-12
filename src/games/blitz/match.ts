/**
 * How `blitz` decides whether a typed term matches a glossary term. The rule, precisely:
 *
 * 1. Both sides are normalised: lower case, hyphens, underscores and slashes become spaces, other
 *    punctuation and wrapping quotes are dropped, runs of spaces become one, and a leading "a",
 *    "an" or "the" is removed.
 * 2. An exact match with the term or one of its aliases is correct.
 * 3. An exact match with a different glossary term or alias is incorrect, however close the
 *    spelling ("validation" is never accepted for "verification").
 * 4. Otherwise the answer is correct when its edit distance to the term or an alias is within
 *    that spelling's tolerance, unless it is strictly closer to a different glossary term or alias
 *    than to this term ("functional requirements" is never accepted for "non-functional
 *    requirement"). A slip as close to this term as to another one still counts. Edit distance
 *    counts insertions, deletions, substitutions and swaps of two neighbouring letters, one each
 *    (optimal string alignment).
 * 4a. A slip of two or more edits that is itself a word or phrase from the course content is a
 *    different word, not a misspelling ("constant" is never accepted for "constraint", nor "code"
 *    for "scope"). The plural of the term or an alias (+s, +es, y to ies) is exempt. A one-edit
 *    slip is always treated as a typo, even when it happens to be a word.
 * 5. Tolerance, from the normalised spelling's length n (spaces count):
 *      n ≤ 4:        1
 *      5 ≤ n ≤ 14:   2
 *      n ≥ 15:       floor(n / 5), that is 20% of n rounded down
 *    The brief's "2 or less" is tightened to 1 for spellings of four characters or fewer, because
 *    two edits turn one short acronym into another (XML and HTML are two edits apart).
 */

/** Rule 1 without the article: lower case, separators to spaces, other punctuation dropped. */
export function normaliseText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normaliseTerm(input: string): string {
  return normaliseText(input).replace(/^(a|an|the) /, '');
}

/**
 * Builds the test for rule 4a: does this normalised phrase appear, as whole words, in any of
 * `texts`? Each text is normalised on its own and the texts are kept apart, so a phrase never
 * spans two of them.
 */
export function phraseIndex(texts: Iterable<string>): (phrase: string) => boolean {
  const corpus = ` ${Array.from(texts, normaliseText).join(' | ')} `;
  return (phrase) => phrase.length > 0 && corpus.includes(` ${phrase} `);
}

function plurals(spelling: string): string[] {
  const out = [`${spelling}s`, `${spelling}es`];
  if (spelling.endsWith('y')) out.push(`${spelling.slice(0, -1)}ies`);
  return out;
}

/** Optimal string alignment distance: Levenshtein plus adjacent transpositions, each costing 1. */
export function typoDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

/** Edits allowed for a normalised spelling of this length. */
export function tolerance(normalisedLength: number): number {
  if (normalisedLength <= 4) return 1;
  if (normalisedLength <= 14) return 2;
  return Math.floor(normalisedLength / 5);
}

export type TermMatch = 'exact' | 'close' | 'other-term' | 'other-word' | 'wrong';

/**
 * Matches a typed answer against a term and its aliases. `otherTerms` is every other glossary
 * term and alias (raw spellings); an exact match with one of them, or a slip strictly closer to
 * one of them than to this term, is 'other-term'. `isCourseText` (see phraseIndex) says whether a
 * normalised phrase appears in the course content; a match it rules out is 'other-word'.
 */
export function matchTerm(
  input: string,
  term: string,
  aliases: readonly string[],
  otherTerms: readonly string[],
  isCourseText: (phrase: string) => boolean = () => false,
): TermMatch {
  const typed = normaliseTerm(input);
  if (!typed) return 'wrong';
  const accepted = [term, ...aliases].map(normaliseTerm).filter(Boolean);
  if (accepted.includes(typed)) return 'exact';
  const others = otherTerms.map(normaliseTerm).filter(Boolean);
  if (others.includes(typed)) return 'other-term';
  if (!accepted.some((a) => typoDistance(typed, a) <= tolerance(a.length))) return 'wrong';
  const nearest = Math.min(...accepted.map((a) => typoDistance(typed, a)));
  if (others.some((o) => typoDistance(typed, o) < nearest)) return 'other-term';
  if (nearest >= 2 && isCourseText(typed) && !accepted.some((a) => plurals(a).includes(typed))) return 'other-word';
  return 'close';
}
