/**
 * Marking arithmetic (pure). Section A and any case study MCQs are auto-marked; written answers
 * score the ticked marking points, capped at the marks available (the same rule as Written).
 * Scores roll up by section and by KK: an item tagged with two KKs counts toward both.
 */
import { markScore } from '../app/study/written';
import type { ContentIndex } from '../content/loader';
import { isMcq, type CaseStudy, type KkId, type Mcq, type ShortAnswer } from '../content/schema';
import { ALL_KK_IDS } from '../content/studyDesign';
import type { Attempt } from '../state/attempts';
import { SECTION_IDS, isAnswered, paperTiming, type ExamAnswer, type ExamPaper, type ExamSummary, type SectionId, type Tally } from './store';
import { timerState, totalMs } from './timer';

export type PaperItem = Mcq | ShortAnswer;

export interface ResolvedPaper {
  /** The paper's items that are still in the content, in the order they are sat. */
  sections: Record<SectionId, PaperItem[]>;
  caseStudy: CaseStudy | null;
  /** Items that have left the content since the paper was set (skipped, never marked). */
  missing: string[];
}

/** Looks up a paper's items in the content. Items that have since left the content are skipped. */
export function resolvePaper(paper: Pick<ExamPaper, 'sections' | 'caseStudyId'>, content: Pick<ContentIndex, 'byId' | 'caseStudies'>): ResolvedPaper {
  const missing: string[] = [];
  const sections = { a: [], b: [], c: [] } as Record<SectionId, PaperItem[]>;
  for (const s of SECTION_IDS) {
    for (const id of paper.sections[s]) {
      const entry = content.byId.get(id);
      if (entry && (entry.kind === 'mcq' || entry.kind === 'short')) sections[s].push(entry.item);
      else missing.push(id);
    }
  }
  const caseStudy = paper.caseStudyId ? (content.caseStudies.find((c) => c.id === paper.caseStudyId) ?? null) : null;
  return { sections, caseStudy, missing };
}

export function marksAvailable(item: PaperItem): number {
  return isMcq(item) ? 1 : item.marks;
}

export interface ItemMark {
  itemId: string;
  section: SectionId;
  kk: KkId[];
  kind: 'mcq' | 'short';
  answered: boolean;
  earned: number;
  available: number;
}

/** Marks one item: an MCQ is 1 or 0; a written answer is its ticked points, capped (0 when blank). */
export function markItem(item: PaperItem, section: SectionId, answer: ExamAnswer | undefined, ticked: readonly number[] = []): ItemMark {
  const answered = isAnswered(answer);
  const base = { itemId: item.id, section, kk: [...item.kk], answered, available: marksAvailable(item) };
  if (isMcq(item)) return { ...base, kind: 'mcq', earned: answer === item.answer ? 1 : 0 };
  return { ...base, kind: 'short', earned: answered ? markScore(item, new Set(ticked)).earned : 0 };
}

export interface KkTally {
  kk: KkId;
  earned: number;
  available: number;
}

export interface PaperMarks {
  items: ItemMark[];
  sections: Record<SectionId, Tally>;
  total: Tally;
  /** Weakest first: by share of marks earned, then more marks at stake, then study design order. */
  byKk: KkTally[];
}

const KK_ORDER = new Map(ALL_KK_IDS.map((kk, i) => [kk, i]));

/** Sorts KK tallies weakest first. */
export function sortKkTallies(list: readonly KkTally[]): KkTally[] {
  const ratio = (t: KkTally) => (t.available ? t.earned / t.available : 1);
  return [...list].sort(
    (a, b) => ratio(a) - ratio(b) || b.available - a.available || (KK_ORDER.get(a.kk) ?? 999) - (KK_ORDER.get(b.kk) ?? 999),
  );
}

export function tallyByKk(items: readonly ItemMark[]): KkTally[] {
  const byKk = new Map<KkId, KkTally>();
  for (const m of items) {
    for (const kk of new Set(m.kk)) {
      const t = byKk.get(kk) ?? { kk, earned: 0, available: 0 };
      t.earned += m.earned;
      t.available += m.available;
      byKk.set(kk, t);
    }
  }
  return sortKkTallies([...byKk.values()]);
}

export function markPaper(paper: Pick<ExamPaper, 'answers' | 'ticks'>, resolved: ResolvedPaper): PaperMarks {
  const items = SECTION_IDS.flatMap((s) => resolved.sections[s].map((item) => markItem(item, s, paper.answers[item.id], paper.ticks[item.id])));
  const sections = { a: [0, 0], b: [0, 0], c: [0, 0] } as Record<SectionId, Tally>;
  for (const m of items) {
    sections[m.section][0] += m.earned;
    sections[m.section][1] += m.available;
  }
  const total: Tally = [items.reduce((n, m) => n + m.earned, 0), items.reduce((n, m) => n + m.available, 0)];
  return { items, sections, total, byKk: tallyByKk(items) };
}

/** Up to `n` KKs that dropped marks, weakest first. */
export function weakestKks(byKk: readonly KkTally[], n = 3): KkTally[] {
  return sortKkTallies(byKk.filter((t) => t.earned < t.available)).slice(0, n);
}

/** The history entry for a marked paper. */
export function summarise(paper: ExamPaper, marks: PaperMarks, markedAt: number): ExamSummary {
  const timing = paperTiming(paper);
  const state = timerState(paper, timing, markedAt);
  const submittedAt = state.submittedAt ?? markedAt;
  return {
    id: paper.id,
    mode: paper.mode,
    caseStudyId: paper.caseStudyId,
    startedAt: paper.startedAt,
    submittedAt,
    markedAt: Math.max(markedAt, submittedAt),
    usedMs: Math.max(0, Math.min(state.usedMs, totalMs(timing))),
    allowedMs: totalMs(timing),
    autoSubmitted: paper.autoSubmitted || state.expired,
    sections: { a: [...marks.sections.a], b: [...marks.sections.b], c: [...marks.sections.c] },
    kk: marks.byKk.map((t): [KkId, number, number] => [t.kk, t.earned, t.available]),
  };
}

/**
 * The attempts to record when marking is finished: every answered item, MCQs 0 or 1 and written
 * answers marks earned over marks available. Unanswered items score 0 on the paper but aren't
 * logged (an unanswered question says nothing about what the student knows; see DECISIONS D-070).
 * The time used is shared between the items in proportion to their marks.
 */
export function attemptsFor(marks: PaperMarks, usedMs: number, now: number): Attempt[] {
  const available = marks.total[1] || 1;
  return marks.items
    .filter((m) => m.answered)
    .map((m) => ({
      itemId: m.itemId,
      kk: m.kk,
      score: m.available ? m.earned / m.available : 0,
      timestamp: now,
      ms: Math.round((Math.max(0, usedMs) * m.available) / available),
    }));
}
