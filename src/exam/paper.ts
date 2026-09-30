/**
 * Paper assembly (Section 6.6). Pure and seeded: the same content, mode and seed always give the
 * same paper. Each section draws from its own child seed, so changing one section's rules never
 * reshuffles another.
 *
 * - Section A: standalone MCQs spread across the four areas and the PSM in line with how many KKs
 *   each has (every area or group with questions gets at least one), across KKs within an area,
 *   and never two questions from one near-identical group.
 * - Section B: standalone short answers totalling exactly 20 marks (five or six questions), found
 *   with a subset sum over marks and drawn from the areas in turn.
 * - Section C: one whole case study, rotated by seed (skipping recently sat ones when possible).
 * - Mini: 10 MCQs, 1 short answer and a slice of one case study (2 to 4 questions, 10 to 15 marks).
 *
 * Thin content never throws: a section takes what exists and the paper says it is short.
 */
import { AREA_IDS, isMcq, type AreaId, type CaseStudy, type KkId, type Mcq, type ShortAnswer } from '../content/schema';
import { ALL_KK_IDS, studyDesign } from '../content/studyDesign';
import { childSeed, mulberry32, shuffle, type Rng } from '../games/prng';
import type { ExamMode, SectionId } from './store';

export interface PaperContent {
  /** Standalone MCQs (case study questions excluded). */
  mcq: readonly Mcq[];
  /** Standalone short answers (case study questions excluded). */
  short: readonly ShortAnswer[];
  caseStudies: readonly CaseStudy[];
}

export interface Blueprint {
  /** Section A questions. */
  mcq: number;
  /** Section B marks to hit exactly, or null for a fixed count of questions. */
  shortMarks: number | null;
  /**
   * Section B questions: the exact count for a fixed count; when hitting a mark total, the seed
   * prefers this many or one more (five or six), so the marks per question vary between papers.
   */
  shortCount: number;
  /** Section C: a whole case study, or a slice of one. */
  caseStudy: 'whole' | 'slice';
}

export const BLUEPRINTS: Readonly<Record<ExamMode, Blueprint>> = {
  full: { mcq: 20, shortMarks: 20, shortCount: 5, caseStudy: 'whole' },
  mini: { mcq: 10, shortMarks: null, shortCount: 1, caseStudy: 'slice' },
};

/** The mini paper's case study slice. */
export const SLICE = { minQuestions: 2, maxQuestions: 4, minMarks: 10, maxMarks: 15, idealMarks: 12 } as const;

/** Section B never takes more than this many questions, whatever the marks. */
const MAX_SHORTS = 10;

export interface AssembledPaper {
  mode: ExamMode;
  seed: number;
  sections: Record<SectionId, string[]>;
  caseStudyId: string | null;
}

export interface AssembleOptions {
  /** Case studies to skip when another is available (e.g. the one sat last time). */
  avoidCaseStudies?: readonly string[];
}

export function assemblePaper(content: PaperContent, mode: ExamMode, seed: number, opts: AssembleOptions = {}): AssembledPaper {
  const blueprint = BLUEPRINTS[mode];
  const s = seed >>> 0;
  const a = pickSectionA(content.mcq, blueprint.mcq, mulberry32(childSeed(s, 'a'))).map((m) => m.id);
  const rngB = mulberry32(childSeed(s, 'b'));
  const b = (
    blueprint.shortMarks === null
      ? pickFixedShorts(orderShorts(content.short, rngB), blueprint.shortCount)
      : pickSectionB(content.short, blueprint.shortMarks, blueprint.shortCount + (rngB() < 0.5 ? 0 : 1), rngB)
  ).map((q) => q.id);
  const cs = chooseCaseStudy(content.caseStudies, s, opts.avoidCaseStudies ?? []);
  const c = !cs ? [] : blueprint.caseStudy === 'whole' ? cs.questions.map((q) => q.id) : sliceCaseStudy(cs, mulberry32(childSeed(s, 'c')));
  return { mode, seed: s, sections: { a, b, c }, caseStudyId: cs && c.length ? cs.id : null };
}

// ---------------------------------------------------------------------------
// Buckets: the four areas plus the PSM (and the glossary, should MCQs ever target it)
// ---------------------------------------------------------------------------

export type Bucket = AreaId | 'PSM' | 'TERMS';

function isArea(kk: KkId): boolean {
  return kk !== 'PSM' && kk !== 'TERMS';
}

/** An item's bucket: its primary KK's area, or PSM; glossary items count toward their first area. */
export function bucketOf(kk: readonly KkId[]): Bucket {
  const primary = kk[0];
  if (primary === 'PSM') return 'PSM';
  if (primary === 'TERMS') {
    const area = kk.find(isArea);
    return area ? (area.slice(0, 4) as AreaId) : 'TERMS';
  }
  return primary.slice(0, 4) as AreaId;
}

/** Weight per bucket: its number of KKs (the PSM and the glossary are one group each). */
export function bucketWeights(): Record<Bucket, number> {
  const w = { U3O1: 0, U3O2: 0, U4O1: 0, U4O2: 0, PSM: 1, TERMS: 1 } as Record<Bucket, number>;
  for (const kk of studyDesign.kks) w[kk.area] += 1;
  return w;
}

const BUCKETS: readonly Bucket[] = [...AREA_IDS, 'PSM', 'TERMS'];

/**
 * Shares `total` slots between buckets: one for every bucket that has items (the heaviest first,
 * when there are fewer slots than buckets), then each further slot to the bucket furthest below its
 * weighted share, never more than a bucket has.
 */
export function apportion(total: number, available: Readonly<Record<Bucket, number>>, weights = bucketWeights()): Record<Bucket, number> {
  const counts = Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<Bucket, number>;
  const open = BUCKETS.filter((b) => available[b] > 0);
  let left = Math.min(total, open.reduce((n, b) => n + available[b], 0));
  const byWeight = [...open].sort((x, y) => weights[y] - weights[x] || BUCKETS.indexOf(x) - BUCKETS.indexOf(y));
  for (const b of byWeight) {
    if (left <= 0) break;
    counts[b] = 1;
    left--;
  }
  const weightSum = open.reduce((n, b) => n + Math.max(weights[b], 0), 0) || 1;
  while (left > 0) {
    const candidates = open.filter((b) => counts[b] < available[b]);
    if (!candidates.length) break;
    const deficit = (b: Bucket) => (total * Math.max(weights[b], 0)) / weightSum - counts[b];
    candidates.sort((x, y) => deficit(y) - deficit(x) || weights[y] - weights[x] || BUCKETS.indexOf(x) - BUCKETS.indexOf(y));
    counts[candidates[0]]++;
    left--;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Near-identical MCQs
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set(
  'the a an and or of to in on at for from by with as is are be was were it its this that these those which what who why how when does do best most main following statement shown'.split(' '),
);

/** Content words of a stem: lowercase, punctuation and Markdown stripped, short and common words dropped. */
export function stemWords(stem: string): Set<string> {
  return new Set(
    stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (!a.size && !b.size) return 1;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
}

const normOption = (o: string) => o.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Two MCQs are near-identical when their stems share most of their content words (Jaccard 0.6 or
 * more), or when they share a KK and at least three of their four options: the same question with
 * a different scenario, or two framings of one fact.
 */
export function nearIdentical(a: Mcq, b: Mcq, words = new Map<string, Set<string>>()): boolean {
  const wa = words.get(a.id) ?? stemWords(a.stem);
  const wb = words.get(b.id) ?? stemWords(b.stem);
  if (jaccard(wa, wb) >= 0.6) return true;
  if (!a.kk.some((k) => b.kk.includes(k))) return false;
  const opts = new Set(a.options.map(normOption));
  return b.options.filter((o) => opts.has(normOption(o))).length >= 3;
}

/** Near-identical groups (connected pairs) as a group number per MCQ id. */
export function nearIdenticalGroups(items: readonly Mcq[]): Map<string, number> {
  const parent = items.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const words = new Map(items.map((m) => [m.id, stemWords(m.stem)]));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (find(i) !== find(j) && nearIdentical(items[i], items[j], words)) parent[find(j)] = find(i);
    }
  }
  return new Map(items.map((m, i) => [m.id, find(i)]));
}

// ---------------------------------------------------------------------------
// Section A
// ---------------------------------------------------------------------------

/** Items in round-robin order across their primary KKs (KK order and item order shuffled). */
function spreadByKk<T extends { id: string; kk: KkId[] }>(items: readonly T[], rng: Rng): T[] {
  const byKk = new Map<KkId, T[]>();
  for (const item of items) {
    const list = byKk.get(item.kk[0]) ?? [];
    list.push(item);
    byKk.set(item.kk[0], list);
  }
  const order = [...byKk.keys()].sort((x, y) => ALL_KK_IDS.indexOf(x) - ALL_KK_IDS.indexOf(y));
  const lanes = shuffle(rng, order).map((kk) => shuffle(rng, byKk.get(kk)!));
  const out: T[] = [];
  for (let round = 0; lanes.some((l) => round < l.length); round++) {
    for (const lane of lanes) if (round < lane.length) out.push(lane[round]);
  }
  return out;
}

/**
 * Section A: `count` MCQs, apportioned between buckets by KK count, spread across KKs within each
 * bucket, with no two from one near-identical group. When groups or a thin bucket leave the
 * section short, it tops up from the rest of the pool, and only then relaxes the group rule.
 */
export function pickSectionA(pool: readonly Mcq[], count: number, rng: Rng): Mcq[] {
  const unique = [...new Map(pool.map((m) => [m.id, m])).values()].sort((x, y) => x.id.localeCompare(y.id));
  const groups = nearIdenticalGroups(unique);
  const byBucket = new Map<Bucket, Mcq[]>(BUCKETS.map((b) => [b, []]));
  for (const m of unique) byBucket.get(bucketOf(m.kk))!.push(m);
  const available = Object.fromEntries(BUCKETS.map((b) => [b, byBucket.get(b)!.length])) as Record<Bucket, number>;
  const quota = apportion(count, available);

  const chosen: Mcq[] = [];
  const ids = new Set<string>();
  const usedGroups = new Set<number>();
  const take = (m: Mcq, strict: boolean): boolean => {
    const g = groups.get(m.id)!;
    if (ids.has(m.id) || (strict && usedGroups.has(g))) return false;
    chosen.push(m);
    ids.add(m.id);
    usedGroups.add(g);
    return true;
  };

  const orders = new Map(BUCKETS.map((b) => [b, spreadByKk(byBucket.get(b)!, rng)]));
  for (const b of BUCKETS) {
    let n = 0;
    for (const m of orders.get(b)!) {
      if (n >= quota[b]) break;
      if (take(m, true)) n++;
    }
  }
  const rest = spreadByKk(unique, rng);
  for (const strict of [true, false]) {
    for (const m of rest) {
      if (chosen.length >= count) break;
      take(m, strict);
    }
  }
  return shuffle(rng, chosen.slice(0, count));
}

// ---------------------------------------------------------------------------
// Section B
// ---------------------------------------------------------------------------

export interface ShortLanes {
  /** Area items, one lane per area (area order shuffled; items shuffled and spread across KKs). */
  lanes: ShortAnswer[][];
  /** PSM and glossary items, used only when the areas can't fill the section. */
  tail: ShortAnswer[];
}

export function shortLanes(pool: readonly ShortAnswer[], rng: Rng): ShortLanes {
  const unique = [...new Map(pool.map((q) => [q.id, q])).values()].sort((x, y) => x.id.localeCompare(y.id));
  const lanes = shuffle(
    rng,
    AREA_IDS.map((area) => unique.filter((q) => bucketOf(q.kk) === area)),
  )
    .filter((l) => l.length)
    .map((l) => spreadByKk(l, rng));
  const tail = spreadByKk(
    unique.filter((q) => !(AREA_IDS as readonly string[]).includes(bucketOf(q.kk))),
    rng,
  );
  return { lanes, tail };
}

/** Short answers in the order Section B considers them: one from each area in turn, then the rest. */
export function interleave({ lanes, tail }: ShortLanes): ShortAnswer[] {
  const out: ShortAnswer[] = [];
  for (let round = 0; lanes.some((l) => round < l.length); round++) {
    for (const lane of lanes) if (round < lane.length) out.push(lane[round]);
  }
  return [...out, ...tail];
}

export function orderShorts(pool: readonly ShortAnswer[], rng: Rng): ShortAnswer[] {
  return interleave(shortLanes(pool, rng));
}

/** Counts to try, nearest the preferred count first: 5, 4, 6, 3, 7, ... */
function countPreference(prefer: number, max: number): number[] {
  const out: number[] = [];
  for (let d = 0; out.length < max; d++) {
    for (const c of d === 0 ? [prefer] : [prefer - d, prefer + d]) if (c >= 1 && c <= max && !out.includes(c)) out.push(c);
    if (d > max + prefer) break;
  }
  return out;
}

/**
 * `count` short answers totalling exactly `target`, taking one from each area in turn, so five
 * questions cover all four areas. A table of the totals the remaining slots can still make (one
 * question per slot, from that slot's area) keeps every pick completable. Null when the areas
 * can't make the total this way.
 */
export function pickAcrossAreas(lanes: readonly (readonly ShortAnswer[])[], target: number, count: number): ShortAnswer[] | null {
  if (!lanes.length || count < 1) return null;
  const slots = Array.from({ length: count }, (_, j) => lanes[j % lanes.length]);
  const can: boolean[][] = new Array(count + 1);
  can[count] = Array.from({ length: target + 1 }, (_, t) => t === 0);
  for (let j = count - 1; j >= 0; j--) {
    const marks = [...new Set(slots[j].map((q) => q.marks))];
    can[j] = Array.from({ length: target + 1 }, (_, t) => marks.some((m) => m <= t && can[j + 1][t - m]));
  }
  if (!can[0][target]) return null;
  const used = new Set<string>();
  const out: ShortAnswer[] = [];
  let left = target;
  for (let j = 0; j < count; j++) {
    const q = slots[j].find((c) => !used.has(c.id) && c.marks <= left && can[j + 1][left - c.marks]);
    if (!q) return null;
    used.add(q.id);
    out.push(q);
    left -= q.marks;
  }
  return left === 0 ? out : null;
}

interface SubsetTable {
  /** reach[i][k * width + t]: items i..n-1 can make k questions totalling t. */
  reach: Uint8Array[];
  width: number;
  maxCount: number;
}

/** The suffix subset-sum table over marks, up to MAX_SHORTS questions and `target` marks. */
function subsetTable(ordered: readonly ShortAnswer[], target: number): SubsetTable {
  const n = ordered.length;
  const maxCount = Math.min(MAX_SHORTS, n);
  const width = target + 1;
  const reach: Uint8Array[] = new Array(n + 1);
  reach[n] = new Uint8Array((maxCount + 1) * width);
  reach[n][0] = 1;
  for (let i = n - 1; i >= 0; i--) {
    const next = reach[i + 1];
    const here = next.slice();
    const m = ordered[i].marks;
    for (let k = 0; k < maxCount; k++) {
      for (let t = 0; t + m <= target; t++) if (next[k * width + t]) here[(k + 1) * width + t + m] = 1;
    }
    reach[i] = here;
  }
  return { reach, width, maxCount };
}

/** Takes items in order whenever the rest can still complete k questions totalling t. */
function takeInOrder(ordered: readonly ShortAnswer[], table: SubsetTable, k: number, t: number): ShortAnswer[] {
  const out: ShortAnswer[] = [];
  let need = k;
  let left = t;
  for (let i = 0; i < ordered.length && need > 0; i++) {
    const m = ordered[i].marks;
    if (m <= left && table.reach[i + 1][(need - 1) * table.width + left - m]) {
      out.push(ordered[i]);
      need--;
      left -= m;
    }
  }
  return out;
}

/**
 * Picks items (in the given order of preference) whose marks total exactly `target`, preferring
 * about `prefer` questions. A suffix subset-sum table says, for each position, which (count, total)
 * pairs the remaining items can still make, so a greedy pass in order takes an item whenever the
 * paper can still be completed with it. If no subset makes `target`, the nearest total below it is
 * used.
 */
export function pickShortMarks(ordered: readonly ShortAnswer[], target: number, prefer: number): ShortAnswer[] {
  if (!ordered.length || target <= 0) return [];
  const table = subsetTable(ordered, target);
  const counts = countPreference(prefer, table.maxCount);
  for (let t = target; t > 0; t--) {
    const k = counts.find((c) => table.reach[0][c * table.width + t]);
    if (k !== undefined) return takeInOrder(ordered, table, k, t);
  }
  return [];
}

/**
 * Section B: short answers totalling exactly `target` marks. For each question count, nearest
 * `prefer` first, it tries one question from each area in turn, then any subset that makes the
 * total; with neither possible at any count, the nearest total below.
 */
export function pickSectionB(pool: readonly ShortAnswer[], target: number, prefer: number, rng: Rng): ShortAnswer[] {
  const l = shortLanes(pool, rng);
  const ordered = interleave(l);
  if (!ordered.length || target <= 0) return [];
  const table = subsetTable(ordered, target);
  for (const k of countPreference(prefer, table.maxCount)) {
    const spread = pickAcrossAreas(l.lanes, target, k);
    if (spread) return spread;
    if (table.reach[0][k * table.width + target]) return takeInOrder(ordered, table, k, target);
  }
  return pickShortMarks(ordered, target, prefer);
}

/** The mini paper's single short answer: the first worth 3 or 4 marks, else the first there is. */
export function pickFixedShorts(ordered: readonly ShortAnswer[], count: number): ShortAnswer[] {
  const preferred = ordered.filter((q) => q.marks >= 3 && q.marks <= 4);
  const rest = ordered.filter((q) => !preferred.includes(q));
  return [...preferred, ...rest].slice(0, count);
}

// ---------------------------------------------------------------------------
// Section C
// ---------------------------------------------------------------------------

/** The case study for a seed: rotates through them in id order, skipping avoided ones if it can. */
export function chooseCaseStudy(caseStudies: readonly CaseStudy[], seed: number, avoid: readonly string[] = []): CaseStudy | null {
  const sorted = [...caseStudies].filter((c) => c.questions.length > 0).sort((x, y) => x.id.localeCompare(y.id));
  if (!sorted.length) return null;
  const start = (seed >>> 0) % sorted.length;
  for (let k = 0; k < sorted.length; k++) {
    const cs = sorted[(start + k) % sorted.length];
    if (!avoid.includes(cs.id)) return cs;
  }
  return sorted[start];
}

function questionMarks(q: CaseStudy['questions'][number]): number {
  return isMcq(q) ? 1 : q.marks;
}

/** Index subsets of 0..n-1 with between `min` and `max` members, in order. */
function subsets(n: number, min: number, max: number): number[][] {
  const out: number[][] = [];
  const walk = (start: number, current: number[]) => {
    if (current.length >= min) out.push([...current]);
    if (current.length === max) return;
    for (let i = start; i < n; i++) {
      current.push(i);
      walk(i + 1, current);
      current.pop();
    }
  };
  walk(0, []);
  return out;
}

/**
 * The mini paper's slice: 2 to 4 questions (kept in insert order) worth 10 to 15 marks, chosen by
 * seed from every slice that fits. When none fits, the slice of 1 to 4 questions closest to 12 marks.
 */
export function sliceCaseStudy(cs: CaseStudy, rng: Rng): string[] {
  const qs = cs.questions;
  if (!qs.length) return [];
  const total = (idx: number[]) => idx.reduce((sum, i) => sum + questionMarks(qs[i]), 0);
  const fits = subsets(qs.length, SLICE.minQuestions, SLICE.maxQuestions).filter((idx) => {
    const t = total(idx);
    return t >= SLICE.minMarks && t <= SLICE.maxMarks;
  });
  let chosen: number[];
  if (fits.length) chosen = fits[Math.floor(rng() * fits.length)];
  else {
    const all = subsets(qs.length, 1, SLICE.maxQuestions);
    const gap = (idx: number[]) => Math.abs(total(idx) - SLICE.idealMarks);
    const best = Math.min(...all.map(gap));
    const ties = all.filter((idx) => gap(idx) === best);
    chosen = ties[Math.floor(rng() * ties.length)];
  }
  return chosen.map((i) => qs[i].id);
}
