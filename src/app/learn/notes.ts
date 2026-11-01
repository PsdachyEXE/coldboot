/**
 * Learn's study notes (docs/LEARN.md, notes mode): each page assembled from content that has
 * already been checked against the sources, so it needs no new writing. A key knowledge point's
 * notes are its study design summary and examples, its flashcards as reading (definitions, then
 * comparisons, then key points), the official terms tagged with it, the misconceptions its cards
 * warn about, and the terminal games that drill it. The Terms and the problem-solving methodology
 * get their own pages from terms.json and psm.json.
 *
 * Multiple-choice explanations and short-answer models are never used: they would give away the
 * questions they belong to. Pure functions only; the Learn screen renders what they return.
 */
import type { ContentIndex } from '../../content/loader';
import { AREA_IDS, isKkId, type AreaId, type Card, type KkId, type PsmFile } from '../../content/schema';
import { kkById, studyDesign } from '../../content/studyDesign';
import { GAMES } from '../../games/registry';

export { firstUnmet, firstUnstarted, isLearnKk, LEARN_ORDER, masteryText, neighbours, readText, topicTitle } from './topics';

/** A point's own cards come first; with fewer than this, cards that also support it are added. */
export const MIN_NOTE_CARDS = 6;

export interface NoteGame {
  id: string;
  title: string;
  summary: string;
}

export interface KkNotes {
  kk: KkId;
  title: string;
  area: AreaId | null;
  summary: string;
  examples: readonly string[];
  /** Reverse cards: a term and its definition. */
  definitions: Card[];
  /** Compare cards: "A versus B" and the contrast. */
  comparisons: Card[];
  /** Basic and cloze cards: a question or statement and its answer. */
  points: Card[];
  /** Official Terms cards tagged with this point. */
  terms: Card[];
  /** Misconceptions from the cards above, each once. */
  traps: string[];
  games: NoteGame[];
  /** Questions there are to practise this point with. */
  practice: { cards: number; mcq: number; short: number };
}

const byDifficultyThenId = (a: Card, b: Card) => a.difficulty - b.difficulty || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function unique(texts: Iterable<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of texts) {
    const key = t?.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function gamesFor(kk: KkId): NoteGame[] {
  return GAMES.filter((g) => g.kk.includes(kk)).map((g) => ({
    id: g.id,
    title: g.title,
    summary: g.summary,
  }));
}

function practiceFor(content: ContentIndex, kk: KkId): KkNotes['practice'] {
  const items = content.byKk.get(kk);
  return {
    cards: items?.cards.length ?? 0,
    mcq: items?.mcq.length ?? 0,
    short: items?.short.length ?? 0,
  };
}

/** The notes for one of the 52 key knowledge points. Null for an id the map doesn't have. */
export function assembleNotes(kk: KkId, content: ContentIndex): KkNotes | null {
  const entry = kkById.get(kk);
  if (!entry) return null;
  const studyCards = content.cards.filter((c) => !c.kk.includes('TERMS') && !c.kk.includes('PSM'));
  const own = studyCards.filter((c) => c.kk[0] === kk).sort(byDifficultyThenId);
  const supporting = own.length < MIN_NOTE_CARDS ? studyCards.filter((c) => c.kk[0] !== kk && c.kk.includes(kk)).sort(byDifficultyThenId) : [];
  const cards = [...own, ...supporting];
  const terms = content.terms.filter((t) => t.kk.includes(kk));
  return {
    kk,
    title: entry.title,
    area: entry.area,
    summary: entry.summary,
    examples: entry.examples,
    definitions: cards.filter((c) => c.type === 'reverse'),
    comparisons: cards.filter((c) => c.type === 'compare'),
    points: cards.filter((c) => c.type === 'basic' || c.type === 'cloze'),
    terms,
    traps: unique([...cards, ...terms].map((c) => c.mistake)),
    games: gamesFor(kk),
    practice: practiceFor(content, kk),
  };
}

export interface TermGroup {
  /** The area the group's terms support, or null for terms not tied to one key knowledge point. */
  area: AreaId | null;
  heading: string;
  terms: Card[];
}

/** The glossary as reading, grouped by the area each term supports, untied terms last. */
export function termsByArea(content: ContentIndex): TermGroup[] {
  const areaOfTerm = (t: Card): AreaId | null => {
    const kk = t.kk.find((k) => k !== 'TERMS' && isKkId(k) && kkById.has(k));
    return kk ? (kk.slice(0, 4) as AreaId) : null;
  };
  const byFront = (a: Card, b: Card) => a.front.localeCompare(b.front, 'en-AU');
  const groups: TermGroup[] = AREA_IDS.map((area) => ({
    area,
    heading: `${area} ${studyDesign.areas.find((a) => a.id === area)?.title ?? ''}`.trim(),
    terms: content.terms.filter((t) => areaOfTerm(t) === area).sort(byFront),
  }));
  groups.push({
    area: null,
    heading: 'Not tied to one key knowledge point',
    terms: content.terms.filter((t) => areaOfTerm(t) === null).sort(byFront),
  });
  return groups.filter((g) => g.terms.length > 0);
}

export interface PsmStageNotes {
  id: string;
  name: string;
  summary: string;
  activities: PsmFile['stages'][number]['activities'];
  /** Specification notes for this stage, without their "Stage:" prefix. */
  specifications: string[];
}

/** The problem-solving methodology as reading: each stage, its activities and its specifications. */
export function psmNotes(psm: PsmFile): PsmStageNotes[] {
  return psm.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    summary: stage.summary,
    activities: stage.activities,
    specifications: psm.specifications
      .filter((note) => note.toLowerCase().startsWith(`${stage.name.toLowerCase()}:`))
      .map((note) => note.slice(stage.name.length + 1).trim())
      .map((note) => note.charAt(0).toUpperCase() + note.slice(1)),
  }));
}

/** Misconceptions from the PSM's cards, each once. */
export function psmTraps(psm: PsmFile): string[] {
  return unique(psm.cards.map((c) => c.mistake));
}

/** Misconceptions from the glossary's cards, each once. */
export function termTraps(content: ContentIndex): string[] {
  return unique(content.terms.map((t) => t.mistake));
}

/** A cloze card's sentence with its gaps shown in bold, for reading. */
export function revealCloze(front: string): string {
  return front.replace(/\{\{([^{}]+)\}\}/g, (_m, gap: string) => `**${gap}**`);
}

