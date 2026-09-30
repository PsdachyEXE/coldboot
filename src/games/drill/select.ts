/**
 * Picks content MCQs for the terminal's Section A drill: by KK, by area of study, or from the
 * weakest KKs. Pure, so the `drill` command can check there is something to drill before starting.
 */
import type { ContentIndex } from '../../content/loader';
import { AREA_IDS, isMcq, type AreaId, type KkId, type Mcq } from '../../content/schema';
import { ALL_KK_IDS, kksByArea } from '../../content/studyDesign';
import { shuffle, type Rng } from '../prng';

/** Mastery below this counts as weak when choosing what to drill (the "shaky" band starts at 40). */
export const WEAK_BELOW = 65;

export function mcqsForKk(content: ContentIndex, kk: KkId): Mcq[] {
  const ids = content.byKk.get(kk)?.mcq ?? [];
  const out: Mcq[] = [];
  for (const id of ids) {
    const entry = content.byId.get(id);
    if (entry?.kind === 'mcq' && isMcq(entry.item)) out.push(entry.item);
  }
  return out;
}

export function isAreaId(value: string): value is AreaId {
  return (AREA_IDS as readonly string[]).includes(value);
}

/** KKs of an area in study design order. */
export function kksInArea(area: AreaId): KkId[] {
  return kksByArea[area].map((k) => k.id as KkId);
}

/**
 * KKs that have MCQs, weakest first: seen KKs below WEAK_BELOW (lowest first), then unseen KKs in
 * study design order (coverage), then the remaining seen KKs (lowest first).
 */
export function weakestKks(content: ContentIndex, mastery: (kk: KkId) => number | null): KkId[] {
  const withItems = ALL_KK_IDS.filter((kk) => mcqsForKk(content, kk).length > 0);
  const scored = withItems.map((kk, order) => ({ kk, order, value: mastery(kk) }));
  const weak = scored.filter((s) => s.value !== null && s.value < WEAK_BELOW).sort((a, b) => a.value! - b.value! || a.order - b.order);
  const unseen = scored.filter((s) => s.value === null);
  const rest = scored.filter((s) => s.value !== null && s.value >= WEAK_BELOW).sort((a, b) => a.value! - b.value! || a.order - b.order);
  return [...weak, ...unseen, ...rest].map((s) => s.kk);
}

/**
 * The fewest weakest KKs (at least three when available) whose MCQs fill a round of `count`.
 */
export function weakestDrillKks(content: ContentIndex, mastery: (kk: KkId) => number | null, count = 10): KkId[] {
  const order = weakestKks(content, mastery);
  const chosen: KkId[] = [];
  const ids = new Set<string>();
  for (const kk of order) {
    if (chosen.length >= 3 && ids.size >= count) break;
    chosen.push(kk);
    for (const m of mcqsForKk(content, kk)) ids.add(m.id);
  }
  return chosen;
}

/** Up to `count` distinct MCQs, taken round-robin across the KKs in order, each KK's pool shuffled. */
export function selectDrillMcqs(content: ContentIndex, kks: readonly KkId[], rng: Rng, count = 10): Mcq[] {
  const pools = kks.map((kk) => shuffle(rng, mcqsForKk(content, kk)));
  const out: Mcq[] = [];
  const seen = new Set<string>();
  while (out.length < count && pools.some((p) => p.length)) {
    for (const pool of pools) {
      if (out.length >= count) break;
      while (pool.length) {
        const m = pool.shift()!;
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        out.push(m);
        break;
      }
    }
  }
  return out;
}
