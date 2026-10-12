/**
 * A summary of the study content: how many standalone cards, MCQs and short answers each KK has,
 * and the size of each case study. The build computes it from the content files (the
 * `virtual:coldboot-content-summary` module, see vite.config.ts), so the Drill and Written setup
 * screens can paint their choices before any content chunk has downloaded. Once the content is
 * loaded, the screens summarise the loaded index instead. `summarise` is the only implementation,
 * used by both, and a test checks that the build's summary matches the loaded content.
 *
 * Type imports only, written with their extension: vite.config.ts imports this module while
 * loading the config, and Vite's native config loader resolves paths exactly as written.
 */
import type { Card, CaseStudy, KkId, Mcq, ShortAnswer } from './schema.ts';

export interface KkCounts {
  cards: number;
  mcq: number;
  short: number;
}

export interface CaseStudySummary {
  id: string;
  title: string;
  questions: number;
  totalMarks: number;
}

export interface ContentSummary {
  /** Standalone items per KK. An item tagged with two KKs counts under both; case study questions don't count. */
  kk: Partial<Record<KkId, KkCounts>>;
  /** Standalone items in all, each counted once. */
  total: KkCounts;
  /** In the order the loader gives them (by id). */
  caseStudies: CaseStudySummary[];
}

export interface SummaryInput {
  cards: readonly Pick<Card, 'kk'>[];
  mcq: readonly Pick<Mcq, 'kk'>[];
  short: readonly Pick<ShortAnswer, 'kk'>[];
  caseStudies: readonly Pick<CaseStudy, 'id' | 'title' | 'questions' | 'totalMarks'>[];
}

/** Counts as the content index does: `byKk` lists an item once for each KK it is tagged with. */
export function summarise(content: SummaryInput): ContentSummary {
  const kk: Partial<Record<KkId, KkCounts>> = {};
  const add = (kks: readonly KkId[], field: keyof KkCounts) => {
    for (const k of kks) (kk[k] ??= { cards: 0, mcq: 0, short: 0 })[field]++;
  };
  for (const c of content.cards) add(c.kk, 'cards');
  for (const m of content.mcq) add(m.kk, 'mcq');
  for (const s of content.short) add(s.kk, 'short');
  return {
    kk,
    total: { cards: content.cards.length, mcq: content.mcq.length, short: content.short.length },
    caseStudies: content.caseStudies.map((cs) => ({ id: cs.id, title: cs.title, questions: cs.questions.length, totalMarks: cs.totalMarks })),
  };
}

/** Standalone MCQs or short answers tagged with `kk`. */
export function countFor(summary: ContentSummary, kk: KkId, kind: 'mcq' | 'short'): number {
  return summary.kk[kk]?.[kind] ?? 0;
}
