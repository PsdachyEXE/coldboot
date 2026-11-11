/** The cram list (content/cram.json) as pairs for the matching game: one per entry. */
import { cramAreas } from '../../content/cram';
import type { CramArea, CramAreaId } from '../../content/schema';
import type { MatchPair } from './match';

/** An area's entries as pairs. Ids are the area and the entry's place in it, so they are unique across areas. */
export function cramPairs(area: CramArea): MatchPair[] {
  return area.entries.map((e, i) => ({ id: `${area.id}-${i + 1}`, term: e.term, definition: e.definition }));
}

export const cramPairsByArea = Object.fromEntries(cramAreas.map((a) => [a.id, cramPairs(a)])) as Readonly<Record<CramAreaId, MatchPair[]>>;

/** Every area's pairs, for the mixed game. */
export const allCramPairs: readonly MatchPair[] = cramAreas.flatMap((a) => cramPairsByArea[a.id]);
