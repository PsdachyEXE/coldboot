/**
 * Choosing what to study: MCQs for Drill and Today's run, short answers for Written. Pure, seeded,
 * and built on the content index, so the screens can check there is something to practise first.
 *
 * "Weakest" (Drill and Written): the lowest-mastery seen KKs that have items, topped up with unseen
 * KKs (study-design order) when fewer than three have been seen, and with more KKs from the same
 * ranking until the round is full.
 */
import type { ContentIndex } from '../../content/loader';
import { AREA_IDS, isMcq, isShortAnswer, type AreaId, type KkId, type Mcq, type ShortAnswer } from '../../content/schema';
import { ALL_KK_IDS, areaById, kkLabel, kksByArea } from '../../content/studyDesign';
import { shuffle, type Rng } from '../../games/prng';
import type { MasteryMap } from '../../srs/mastery';

export type StudyScope = { mode: 'kk'; kk: KkId } | { mode: 'area'; area: AreaId } | { mode: 'weak' } | { mode: 'random' };

export const DRILL_ROUND = 10;
export const TIMED_ROUND = 20;
/** Section A pace: 20 questions in 24 minutes (1.2 minutes a mark). */
export const TIMED_MS = 24 * 60_000;
export const WRITTEN_ROUND = 5;

/** Time allowed for a timed round of `n` questions at Section A pace (24 minutes for 20). */
export function timedAllowance(n: number): number {
  return Math.round((TIMED_MS / TIMED_ROUND) * n);
}
/** At least this many KKs make up a "weakest" set when enough have items. */
export const WEAKEST_MIN_KKS = 3;

const KK_ORDER = new Map(ALL_KK_IDS.map((kk, i) => [kk, i]));
const orderOf = (kk: KkId) => KK_ORDER.get(kk) ?? Number.MAX_SAFE_INTEGER;

export function isKnownKk(value: string | null): value is KkId {
  return value !== null && KK_ORDER.has(value as KkId);
}

export function isAreaId(value: string | null): value is AreaId {
  return value !== null && (AREA_IDS as readonly string[]).includes(value);
}

/**
 * Reads `kk`, `area` or `mode` from a drill or written URL. `invalid` is true when the URL names
 * something COLDBOOT doesn't know, so the screen can say so instead of silently ignoring it.
 */
export function scopeFromParams(params: URLSearchParams): { scope: StudyScope | null; invalid: boolean } {
  const kk = params.get('kk');
  const area = params.get('area');
  const mode = params.get('mode');
  if (kk !== null) return isKnownKk(kk) ? { scope: { mode: 'kk', kk }, invalid: false } : { scope: null, invalid: true };
  if (area !== null) return isAreaId(area) ? { scope: { mode: 'area', area }, invalid: false } : { scope: null, invalid: true };
  if (mode !== null) return mode === 'weak' || mode === 'random' ? { scope: { mode }, invalid: false } : { scope: null, invalid: true };
  return { scope: null, invalid: false };
}

/** "U3O1-KK04 Data types", "U3O2 Software development: analysis and design", "Your weakest key knowledge". */
export function scopeTitle(scope: StudyScope): string {
  switch (scope.mode) {
    case 'kk':
      return kkLabel(scope.kk);
    case 'area':
      return `${scope.area} ${areaById.get(scope.area)?.title ?? ''}`.trim();
    case 'weak':
      return 'Your weakest key knowledge';
    case 'random':
      return 'Questions from across the course';
  }
}

export function mcqsFor(content: ContentIndex, kk: KkId): Mcq[] {
  const out: Mcq[] = [];
  for (const id of content.byKk.get(kk)?.mcq ?? []) {
    const entry = content.byId.get(id);
    if (entry?.kind === 'mcq' && isMcq(entry.item) && !entry.caseStudyId) out.push(entry.item);
  }
  return out;
}

export function shortsFor(content: ContentIndex, kk: KkId): ShortAnswer[] {
  const out: ShortAnswer[] = [];
  for (const id of content.byKk.get(kk)?.short ?? []) {
    const entry = content.byId.get(id);
    if (entry?.kind === 'short' && isShortAnswer(entry.item) && !entry.caseStudyId) out.push(entry.item);
  }
  return out;
}

export type ItemKind = 'mcq' | 'short';

function poolFor(content: ContentIndex, kind: ItemKind): (kk: KkId) => (Mcq | ShortAnswer)[] {
  return kind === 'mcq' ? (kk) => mcqsFor(content, kk) : (kk) => shortsFor(content, kk);
}

/** Every KK (study-design order) with at least one item of this kind. */
export function kksWithItems(content: ContentIndex, kind: ItemKind): KkId[] {
  const pool = poolFor(content, kind);
  return ALL_KK_IDS.filter((kk) => pool(kk).length > 0);
}

/** KKs weakest first: seen KKs by mastery ascending, then unseen KKs, study-design order breaking ties. */
export function rankWeakest(kks: readonly KkId[], mastery: MasteryMap): KkId[] {
  const seen = kks.filter((kk) => mastery.has(kk));
  const unseen = kks.filter((kk) => !mastery.has(kk));
  seen.sort((a, b) => mastery.get(a)!.value - mastery.get(b)!.value || orderOf(a) - orderOf(b));
  unseen.sort((a, b) => orderOf(a) - orderOf(b));
  return [...seen, ...unseen];
}

/** The fewest weakest KKs (at least WEAKEST_MIN_KKS when available) whose items fill `count`. */
export function weakestKks(content: ContentIndex, kind: ItemKind, mastery: MasteryMap, count: number): KkId[] {
  const pool = poolFor(content, kind);
  const chosen: KkId[] = [];
  const ids = new Set<string>();
  for (const kk of rankWeakest(kksWithItems(content, kind), mastery)) {
    if (chosen.length >= WEAKEST_MIN_KKS && ids.size >= count) break;
    chosen.push(kk);
    for (const item of pool(kk)) ids.add(item.id);
  }
  return chosen;
}

/** Up to `count` distinct items, one from each pool in turn. */
export function roundRobin<T extends { id: string }>(pools: readonly (readonly T[])[], count: number): T[] {
  const lanes = pools.map((p) => [...p]);
  const out: T[] = [];
  const seen = new Set<string>();
  while (out.length < count && lanes.some((l) => l.length)) {
    for (const lane of lanes) {
      if (out.length >= count) break;
      while (lane.length) {
        const item = lane.shift()!;
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        out.push(item);
        break;
      }
    }
  }
  return out;
}

export interface Picked<T> {
  items: T[];
  /** The KKs the items were drawn from. */
  kks: KkId[];
}

function pick<T extends Mcq | ShortAnswer>(
  content: ContentIndex,
  kind: ItemKind,
  scope: StudyScope,
  mastery: MasteryMap,
  rng: Rng,
  count: number,
): Picked<T> {
  const pool = poolFor(content, kind) as (kk: KkId) => T[];
  switch (scope.mode) {
    case 'kk':
      return { items: shuffle(rng, pool(scope.kk)).slice(0, count), kks: [scope.kk] };
    case 'area': {
      // Shuffle the KK order too, or a 10-question round of a 14-KK area would never reach KK11.
      const kks = shuffle(
        rng,
        kksByArea[scope.area].map((k) => k.id as KkId).filter((kk) => pool(kk).length > 0),
      );
      return { items: roundRobin(kks.map((kk) => shuffle(rng, pool(kk))), count), kks };
    }
    case 'weak': {
      const kks = weakestKks(content, kind, mastery, count);
      return { items: roundRobin(kks.map((kk) => shuffle(rng, pool(kk))), count), kks };
    }
    case 'random': {
      const all = kind === 'mcq' ? content.mcq : content.short;
      const items = shuffle(rng, all as T[]).slice(0, count);
      return { items, kks: [...new Set(items.flatMap((i) => i.kk))] };
    }
  }
}

export function pickMcqs(content: ContentIndex, scope: StudyScope, mastery: MasteryMap, rng: Rng, count = DRILL_ROUND): Picked<Mcq> {
  return pick<Mcq>(content, 'mcq', scope, mastery, rng, count);
}

export function pickShorts(content: ContentIndex, scope: StudyScope, mastery: MasteryMap, rng: Rng, count = WRITTEN_ROUND): Picked<ShortAnswer> {
  return pick<ShortAnswer>(content, 'short', scope, mastery, rng, count);
}

/**
 * Today's run, step 2: a drill on the single weakest KK. Its questions come first; most KKs have
 * only a few, so the round tops up from the next weakest KKs until it has `count`.
 */
export function pickRunDrill(content: ContentIndex, mastery: MasteryMap, rng: Rng, count = DRILL_ROUND): Picked<Mcq> {
  const out: Mcq[] = [];
  const kks: KkId[] = [];
  const seen = new Set<string>();
  for (const kk of rankWeakest(kksWithItems(content, 'mcq'), mastery)) {
    if (out.length >= count) break;
    kks.push(kk);
    for (const m of shuffle(rng, mcqsFor(content, kk))) {
      if (out.length >= count) break;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
  }
  return { items: out, kks };
}
