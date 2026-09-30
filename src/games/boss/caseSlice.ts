/**
 * The boss round's case study slice: three short-answer questions from one case study, the figures
 * each one uses, and the self-marking that scores them.
 *
 * The whole insert is shown, not a cut-down excerpt: a question can rest on any part of it (a
 * validation question on the proposed solution's hours range, an ethics question on one line of
 * the development environment), and no rule for dropping sections was both safe and short.
 */
import { markScore } from '../../app/study/written';
import type { CaseShort, CaseStudy, Figure } from '../../content/schema';
import { normaliseAnswer } from '../../lib/text';
import { childSeed, mulberry32, pick } from '../prng';

export const SLICE_QUESTIONS = 3;
/** A slice is worth 9 to 15 marks when it can be; otherwise the three closest to 12. */
export const SLICE_MARKS = { min: 9, max: 15, ideal: 12 } as const;

export interface CaseSlice {
  caseStudy: CaseStudy;
  /** Three short answers, in the case study's order. */
  questions: CaseShort[];
}

export function isCaseShort(q: CaseStudy['questions'][number]): q is CaseShort {
  return 'points' in q;
}

function triples(n: number): number[][] {
  const out: number[][] = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) out.push([a, b, c]);
  return out;
}

/**
 * Chooses one case study with at least three short answers (by seed, in id order), then three of
 * its short answers worth 9 to 15 marks together, kept in the case study's order. Null when no
 * case study qualifies.
 */
export function pickCaseSlice(caseStudies: readonly CaseStudy[], seed: number): CaseSlice | null {
  const rng = mulberry32(childSeed(seed, 'boss-case'));
  const eligible = [...caseStudies].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).filter((cs) => cs.questions.filter(isCaseShort).length >= SLICE_QUESTIONS);
  if (!eligible.length) return null;
  const caseStudy = pick(rng, eligible);
  const shorts = caseStudy.questions.filter(isCaseShort);
  const all = triples(shorts.length);
  const marks = (t: number[]) => t.reduce((sum, i) => sum + shorts[i].marks, 0);
  const fits = all.filter((t) => marks(t) >= SLICE_MARKS.min && marks(t) <= SLICE_MARKS.max);
  let chosen: number[];
  if (fits.length) chosen = pick(rng, fits);
  else {
    const gap = (t: number[]) => Math.abs(marks(t) - SLICE_MARKS.ideal);
    const best = Math.min(...all.map(gap));
    chosen = pick(rng, all.filter((t) => gap(t) === best));
  }
  return { caseStudy, questions: chosen.map((i) => shorts[i]) };
}

/** The figures a question shows: its own, then the insert's figures it refers to, in the insert's order. */
export function questionFigures(caseStudy: CaseStudy, q: CaseShort): Figure[] {
  const refs = new Set(q.figureRefs ?? []);
  return [...(q.figures ?? []), ...caseStudy.figures.filter((f) => refs.has(f.id))];
}

/**
 * The marking points a student says they earned: "1 3", "1, 3", "1 and 3", "points 1 and 3", "1-3"
 * (a range), "13" (when no point number has two digits), "none" or "0", and "all". Returns the
 * 0-based indexes in ascending order, or null when the input isn't a list of point numbers from 1
 * to `count`. "2/3" is refused rather than read as points 2 and 3, since it looks like a mark.
 */
export function parseMarkedPoints(input: string, count: number): number[] | null {
  const s = normaliseAnswer(input)
    .replace(/^(points?|numbers?)\s+/, '')
    .replace(/\band\b/g, ' ')
    .replace(/(\d)\s*[-–]\s*(\d)/g, '$1-$2')
    .trim();
  if (!s) return null;
  if (/^(none|nothing|no|nil|zero|0)$/.test(s)) return [];
  if (/^(all|all of them|every one|everything)$/.test(s)) return Array.from({ length: count }, (_, i) => i);
  const picked = new Set<number>();
  const add = (n: number) => {
    if (!Number.isInteger(n) || n < 1 || n > count) return false;
    picked.add(n - 1);
    return true;
  };
  for (const token of s.split(/[\s,;&+]+/).filter(Boolean)) {
    const range = /^(\d+)-(\d+)$/.exec(token);
    if (range) {
      const [from, to] = [Number(range[1]), Number(range[2])];
      if (from > to) return null;
      for (let n = from; n <= to; n++) if (!add(n)) return null;
      continue;
    }
    if (!/^\d+$/.test(token)) return null;
    // "13" is points 1 and 3 when no point number has two digits.
    const numbers = count <= 9 && token.length > 1 ? [...token].map(Number) : [Number(token)];
    for (const n of numbers) if (!add(n)) return null;
  }
  return picked.size ? [...picked].sort((a, b) => a - b) : null;
}

/** Marks earned for the ticked points (0-based), capped at the marks the question is worth: the Written screen's rule. */
export function markedScore(q: Pick<CaseShort, 'marks' | 'points'>, ticked: readonly number[]): { earned: number; score: number } {
  return markScore(q, new Set(ticked));
}
