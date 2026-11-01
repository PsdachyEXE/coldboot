/**
 * Learn's topics (docs/LEARN.md): the page order, titles and status lines. Kept apart from
 * notes.ts, which pulls in the games registry, so Home and the map can use these with the shell.
 */
import { AREA_IDS, isKkId, type KkId } from '../../content/schema';
import { ALL_KK_IDS, kkById, kksByArea, studyDesign } from '../../content/studyDesign';
import type { MasteryMap } from '../../srs/mastery';
import { lastPractised } from '../study/format';

/** The pages in reading order: every key knowledge point by area, then the Terms, then the PSM. */
export const LEARN_ORDER: readonly KkId[] = [...AREA_IDS.flatMap((a) => kksByArea[a].map((k) => k.id as KkId)), 'TERMS', 'PSM'];

/** The pages either side of `kk` in reading order. */
export function neighbours(kk: KkId): { prev: KkId | null; next: KkId | null } {
  const i = LEARN_ORDER.indexOf(kk);
  if (i < 0) return { prev: null, next: null };
  return { prev: LEARN_ORDER[i - 1] ?? null, next: LEARN_ORDER[i + 1] ?? null };
}

/** True when `value` names a Learn page: one of the 52 points, TERMS or PSM. */
export function isLearnKk(value: unknown): value is KkId {
  return typeof value === 'string' && isKkId(value) && ALL_KK_IDS.includes(value);
}

/** "Data types", or the group's title for TERMS and PSM. */
export function topicTitle(kk: KkId): string {
  if (kk === 'TERMS' || kk === 'PSM') return studyDesign.groups.find((g) => g.id === kk)?.title ?? kk;
  return kkById.get(kk)?.title ?? kk;
}

/** "62% mastery" or "Not practised yet". */
export function masteryText(mastery: MasteryMap, kk: KkId): string {
  const m = mastery.get(kk);
  return m ? `${Math.round(m.value)}% mastery` : 'Not practised yet';
}

/** "Read today", "Read 3 days ago" or "Not read yet". */
export function readText(at: number | undefined, now: number): string {
  if (!at) return 'Not read yet';
  const when = lastPractised(at, now, true);
  return `Read ${when.charAt(0).toLowerCase()}${when.slice(1)}`;
}

/** The first of `kks` that has a Learn page and has been neither practised nor read; null when there is none. */
export function firstUnmet(kks: readonly KkId[], mastery: MasteryMap, read: Partial<Record<KkId, number>>): KkId | null {
  return kks.find((kk) => isLearnKk(kk) && !mastery.has(kk) && !read[kk]) ?? null;
}

/** The first topic, in reading order, that has been neither practised nor read; null when there is none. */
export function firstUnstarted(mastery: MasteryMap, read: Partial<Record<KkId, number>>): KkId | null {
  return firstUnmet(LEARN_ORDER, mastery, read);
}
