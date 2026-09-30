/** The KK map is small and needed at boot, so it is bundled with the shell rather than lazy-loaded. */
import raw from '../../content/study-design.json';
import { AREA_IDS, type AreaEntry, type AreaId, type KkEntry, type KkId, type StudyDesign } from './schema';

export const studyDesign = raw as StudyDesign;

export const kkById: ReadonlyMap<string, KkEntry> = new Map(studyDesign.kks.map((k) => [k.id, k]));

export const areaById: ReadonlyMap<AreaId, AreaEntry> = new Map(studyDesign.areas.map((a) => [a.id, a]));

/** KK ids in study-design order, grouped by area. */
export const kksByArea: Readonly<Record<AreaId, KkEntry[]>> = Object.fromEntries(
  AREA_IDS.map((area) => [area, studyDesign.kks.filter((k) => k.area === area)]),
) as Record<AreaId, KkEntry[]>;

/** Every KK id plus TERMS and PSM, in display order. */
export const ALL_KK_IDS: readonly KkId[] = [...studyDesign.kks.map((k) => k.id as KkId), 'TERMS', 'PSM'];

/** Human label for any KK id, e.g. "U3O1-KK04 Data types" or "Terms used in this study". */
export function kkLabel(id: KkId): string {
  if (id === 'TERMS' || id === 'PSM') return studyDesign.groups.find((g) => g.id === id)?.title ?? id;
  const kk = kkById.get(id);
  return kk ? `${id} ${kk.title}` : id;
}
