/**
 * Content loading. Each outcome's JSON is its own chunk (dynamic import through import.meta.glob),
 * so the shell boots without study content and outcomes load on demand. Bundled content is
 * validated in CI (content:check and the content tests), so the runtime trusts its shape.
 */
import { AREA_IDS, isMcq, type AreaId, type Card, type CaseStudy, type KkId, type Mcq, type PsmFile, type ShortAnswer } from './schema';
import { studyDesign } from './studyDesign';

export interface AreaContent {
  cards: Card[];
  mcq: Mcq[];
  short: ShortAnswer[];
}

export type IndexedItem =
  | { kind: 'card'; item: Card }
  | { kind: 'mcq'; item: Mcq; caseStudyId?: string }
  | { kind: 'short'; item: ShortAnswer; caseStudyId?: string };

export interface KkItems {
  cards: string[];
  mcq: string[];
  short: string[];
}

export interface CaseQuestionRef {
  caseStudyId: string;
  questionId: string;
}

export interface ContentIndex {
  /** Every card, including glossary (TERMS) and PSM cards. */
  cards: Card[];
  /** Every standalone MCQ, including PSM. Case study questions are excluded. */
  mcq: Mcq[];
  /** Every standalone short answer, including PSM. Case study questions are excluded. */
  short: ShortAnswer[];
  terms: Card[];
  psm: PsmFile;
  caseStudies: CaseStudy[];
  /** Every item by id, including case study questions. */
  byId: Map<string, IndexedItem>;
  /** Standalone item ids per KK (an item tagged with two KKs appears under both). */
  byKk: Map<KkId, KkItems>;
  /** Case study questions per KK, for Section C practice in Written and the exam's mini mode. */
  caseByKk: Map<KkId, CaseQuestionRef[]>;
  /** Every card id, for pruning SRS records whose card has left the content. */
  cardIds: ReadonlySet<string>;
}

const outcomeFiles = import.meta.glob<unknown>('../../content/u[34]o[12]/*.json', { import: 'default' });
const termsFile = import.meta.glob<unknown>('../../content/terms.json', { import: 'default' });
const psmFile = import.meta.glob<unknown>('../../content/psm.json', { import: 'default' });
const caseStudyFiles = import.meta.glob<unknown>('../../content/case-studies/*.json', { import: 'default' });

async function loadJson<T>(files: Record<string, () => Promise<unknown>>, key: string, fallback: T): Promise<T> {
  const load = files[key];
  return load ? ((await load()) as T) : fallback;
}

const areaCache = new Map<AreaId, Promise<AreaContent>>();

/** Loads one outcome's cards, MCQs and short answers. Missing files load as empty lists. */
export function loadArea(area: AreaId): Promise<AreaContent> {
  let pending = areaCache.get(area);
  if (!pending) {
    const dir = `../../content/${area.toLowerCase()}`;
    pending = Promise.all([
      loadJson<Card[]>(outcomeFiles, `${dir}/cards.json`, []),
      loadJson<Mcq[]>(outcomeFiles, `${dir}/mcq.json`, []),
      loadJson<ShortAnswer[]>(outcomeFiles, `${dir}/short.json`, []),
    ]).then(([cards, mcq, short]) => ({ cards, mcq, short }));
    // A failed chunk fetch (offline, stale deploy) must not be cached: the next call retries.
    pending.catch(() => areaCache.delete(area));
    areaCache.set(area, pending);
  }
  return pending;
}

const EMPTY_PSM: PsmFile = { stages: [] as unknown as PsmFile['stages'], specifications: [], cards: [], mcq: [], short: [] };

export function loadTerms(): Promise<Card[]> {
  return loadJson<Card[]>(termsFile, '../../content/terms.json', []);
}

export function loadPsm(): Promise<PsmFile> {
  return loadJson<PsmFile>(psmFile, '../../content/psm.json', EMPTY_PSM);
}

export async function loadCaseStudies(): Promise<CaseStudy[]> {
  const keys = Object.keys(caseStudyFiles).sort();
  return Promise.all(keys.map((k) => caseStudyFiles[k]() as Promise<CaseStudy>));
}

/** Builds the lookup maps over already-loaded content. Pure; used by tests too. */
export function buildIndex(parts: { areas: AreaContent[]; terms: Card[]; psm: PsmFile; caseStudies: CaseStudy[] }): ContentIndex {
  const cards = [...parts.areas.flatMap((a) => a.cards), ...parts.terms, ...parts.psm.cards];
  const mcq = [...parts.areas.flatMap((a) => a.mcq), ...parts.psm.mcq];
  const short = [...parts.areas.flatMap((a) => a.short), ...parts.psm.short];

  const byId = new Map<string, IndexedItem>();
  const byKk = new Map<KkId, KkItems>();
  const slot = (kk: KkId): KkItems => {
    let s = byKk.get(kk);
    if (!s) {
      s = { cards: [], mcq: [], short: [] };
      byKk.set(kk, s);
    }
    return s;
  };
  for (const kk of studyDesign.kks) slot(kk.id as KkId);
  slot('TERMS');
  slot('PSM');

  for (const c of cards) {
    byId.set(c.id, { kind: 'card', item: c });
    for (const kk of c.kk) slot(kk).cards.push(c.id);
  }
  for (const m of mcq) {
    byId.set(m.id, { kind: 'mcq', item: m });
    for (const kk of m.kk) slot(kk).mcq.push(m.id);
  }
  for (const s of short) {
    byId.set(s.id, { kind: 'short', item: s });
    for (const kk of s.kk) slot(kk).short.push(s.id);
  }
  const caseByKk = new Map<KkId, CaseQuestionRef[]>();
  for (const cs of parts.caseStudies) {
    for (const q of cs.questions) {
      byId.set(q.id, isMcq(q) ? { kind: 'mcq', item: q, caseStudyId: cs.id } : { kind: 'short', item: q, caseStudyId: cs.id });
      for (const kk of q.kk) {
        const list = caseByKk.get(kk) ?? [];
        list.push({ caseStudyId: cs.id, questionId: q.id });
        caseByKk.set(kk, list);
      }
    }
  }
  const cardIds = new Set(cards.map((c) => c.id));
  return { cards, mcq, short, terms: parts.terms, psm: parts.psm, caseStudies: parts.caseStudies, byId, byKk, caseByKk, cardIds };
}

let allPending: Promise<ContentIndex> | null = null;

/** Loads every outcome, the glossary, the PSM and the case studies, then indexes them. Cached. */
export function loadAllContent(): Promise<ContentIndex> {
  if (!allPending) {
    const pending = Promise.all([Promise.all(AREA_IDS.map(loadArea)), loadTerms(), loadPsm(), loadCaseStudies()]).then(
      ([areas, terms, psm, caseStudies]) => buildIndex({ areas, terms, psm, caseStudies }),
    );
    pending.catch(() => {
      if (allPending === pending) allPending = null;
    });
    allPending = pending;
  }
  return allPending;
}
