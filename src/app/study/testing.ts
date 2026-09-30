/**
 * Test fixtures for the study screens: small content items that pass the content schemas, and
 * helpers that put a content index into the shared store and reset every store. Imported by tests
 * only.
 */
import { buildIndex, type AreaContent, type ContentIndex } from '../../content/loader';
import type { Card, CaseStudy, KkId, Mcq, PsmFile, ShortAnswer } from '../../content/schema';
import { useContent } from '../../content/store';
import { useAttempts } from '../../state/attempts';
import { useSession } from '../../state/session';
import { useSettings } from '../../state/settings';
import { useSrs } from '../../state/srs';
import { useReportDialog } from '../../ui/report';
import { useAnnouncer } from '../../ui/announce';

export function fxCard(id: string, kk: KkId[], opts: Partial<Card> = {}): Card {
  return { id, kk, type: 'basic', front: `Question for ${id}`, back: `Answer for ${id}`, difficulty: 1, source: 'textbook', ...opts };
}

export function fxMcq(id: string, kk: KkId[], opts: Partial<Mcq> = {}): Mcq {
  return {
    id,
    kk,
    stem: `Which option is right for ${id}?`,
    options: ['Option one', 'Option two', 'Option three', 'Option four'],
    answer: 2,
    explanation: 'Option three is right because of **reasons**.',
    whyWrong: ['One is too narrow.', 'Two confuses the terms.', '', 'Four describes something else.'],
    difficulty: 1,
    source: 'textbook',
    ...opts,
  };
}

export function fxShort(id: string, kk: KkId[], opts: Partial<ShortAnswer> = {}): ShortAnswer {
  return {
    id,
    kk,
    commandTerm: 'explain',
    marks: 3,
    prompt: `Explain the idea behind ${id}.`,
    points: [
      { text: 'States the idea', marks: 1 },
      { text: 'Gives a reason', marks: 1 },
      { text: 'Links it to the scenario', marks: 1 },
      { text: 'Alternative: an example', marks: 1 },
    ],
    model: 'A full-mark answer.',
    mistake: 'Students often describe instead of explaining.',
    source: 'textbook',
    ...opts,
  };
}

export function fxCaseStudy(id = 'cs-01'): CaseStudy {
  return {
    id,
    title: 'Riverbend Freight',
    insert: 'Riverbend Freight is a Geelong freight company.\n\nIts team is building a booking system.',
    figures: [
      { id: 'fig-bookings', kind: 'table', title: 'Bookings table', columns: ['Field', 'Type'], rows: [['bookingId', 'Integer']] },
      { id: 'fig-code', kind: 'pseudocode', title: 'Booking check', code: 'BEGIN\n    DISPLAY "ok"\nEND' },
    ],
    questions: [
      { ...fxMcq(`${id}-q01`, ['U3O1-KK04']), figureRefs: ['fig-bookings'] },
      { ...fxShort(`${id}-q02`, ['U3O2-KK05'], { marks: 2 }), figureRefs: ['fig-code'] },
    ],
    totalMarks: 3,
  };
}

const EMPTY_PSM = { stages: [], specifications: [], cards: [], mcq: [], short: [] } as unknown as PsmFile;

export interface FixtureParts {
  cards?: Card[];
  mcq?: Mcq[];
  short?: ShortAnswer[];
  caseStudies?: CaseStudy[];
}

/** An index over the given items (all placed in one area file; the index doesn't mind). */
export function fixtureIndex(parts: FixtureParts = {}): ContentIndex {
  const area: AreaContent = { cards: parts.cards ?? [], mcq: parts.mcq ?? [], short: parts.short ?? [] };
  const empty: AreaContent = { cards: [], mcq: [], short: [] };
  return buildIndex({ areas: [area, empty, empty, empty], terms: [], psm: EMPTY_PSM, caseStudies: parts.caseStudies ?? [] });
}

/** Puts a loaded index into the shared content store, so screens render without loading. */
export function provideContent(index: ContentIndex): ContentIndex {
  useContent.setState({ index, status: 'ready', error: null });
  return index;
}

const originalLoad = useContent.getState().load;

export function resetStudyStores(): void {
  useContent.setState({ index: null, status: 'idle', error: null, load: originalLoad });
  useSrs.getState().reset();
  useAttempts.getState().reset();
  useSession.getState().reset();
  useSettings.getState().reset();
  useReportDialog.setState({ request: null });
  useAnnouncer.setState({ polite: '', assertive: '', seq: 0, politeSeq: 0, assertiveSeq: 0 });
}
