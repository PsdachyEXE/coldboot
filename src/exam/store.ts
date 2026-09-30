/**
 * Exam store: the paper in progress (autosaved on every change) and a short history of marked
 * papers (summaries only). Persisted as `coldboot:v1:exam`. `src/state/exportImport.ts` imports this
 * module, so the store hydrates and registers for export, import and reset with the shell, even
 * when the exam route has never been opened.
 *
 * It ships with the shell, so it holds only the data, its schema, salvage and merge. The actions
 * that change a paper (actions.ts), the timer, paper assembly, marking and the screens live in the
 * lazily loaded exam chunk.
 *
 * Answers are the student's own text: render them only as React text.
 */
import { create } from 'zustand';
import { z } from '../lib/zodConfig';
import { isKkId, type KkId } from '../content/schema';
import { EXAM_READING_MS, EXAM_WRITING_MS, MAX_EPOCH_MS } from '../lib/time';
import { persistStore } from '../state/persist';
import type { TimerConfig } from './timer';

export type ExamMode = 'full' | 'mini';
export type SectionId = 'a' | 'b' | 'c';
export const SECTION_IDS: readonly SectionId[] = ['a', 'b', 'c'];

/** An MCQ answer is the chosen option's index; a written answer is the text. */
export type ExamAnswer = number | string;

export interface ExamPaper {
  /** `p-<startedAt base 36>-<seed base 36>`; also the history id once marked. */
  id: string;
  mode: ExamMode;
  /** The seed the paper was assembled from. */
  seed: number;
  /** Item ids per section, in the order they are sat. Section C holds case study question ids. */
  sections: Record<SectionId, string[]>;
  caseStudyId: string | null;
  /** Epoch ms when reading time began. */
  startedAt: number;
  /** Timing is stored with the paper, so a new build never changes a paper already under way. */
  readingMs: number;
  writingMs: number;
  answers: Record<string, ExamAnswer>;
  flags: string[];
  /** Marking points ticked per written answer, once the paper is submitted. */
  ticks: Record<string, number[]>;
  submittedAt: number | null;
  /** True when writing time ran out and the paper submitted itself. */
  autoSubmitted: boolean;
  /** Warning marks (minutes left) already given, so a reload doesn't repeat them. */
  warned: number[];
  /** Where the student is, so resuming returns to the same question. */
  at: { section: SectionId; index: number };
}

/** [marks earned, marks available]. */
export type Tally = [number, number];

/** A marked paper as kept in history: enough for its report, and nothing else. */
export interface ExamSummary {
  id: string;
  mode: ExamMode;
  caseStudyId: string | null;
  startedAt: number;
  submittedAt: number;
  markedAt: number;
  /** From the start of reading time to submission. */
  usedMs: number;
  /** Reading plus writing time allowed. */
  allowedMs: number;
  autoSubmitted: boolean;
  sections: Record<SectionId, Tally>;
  /** [KK, earned, available] per KK the paper touched. */
  kk: [KkId, number, number][];
}

export interface ExamData {
  paper: ExamPaper | null;
  /** Oldest first, at most HISTORY_MAX. */
  history: ExamSummary[];
}

export interface NewPaper {
  mode: ExamMode;
  seed: number;
  sections: Record<SectionId, string[]>;
  caseStudyId: string | null;
  timing: TimerConfig;
}

/** The store holds data only; exam/actions.ts changes it. */
export interface ExamState extends ExamData {
  replace(data: ExamData): void;
  reset(): void;
}

export const HISTORY_MAX = 20;
export const ANSWER_MAX = 20_000;
const MAX_ITEMS = { a: 40, b: 20, c: 30 } as const;

// C0 and C1 controls except tab and newline, DEL, bidi controls and zero-width characters.
// eslint-disable-next-line no-control-regex
export const ANSWER_UNSAFE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/;

export function paperTiming(paper: Pick<ExamPaper, 'readingMs' | 'writingMs'>): TimerConfig {
  return { readingMs: paper.readingMs, writingMs: paper.writingMs };
}

export function paperItemIds(paper: Pick<ExamPaper, 'sections'>): string[] {
  return SECTION_IDS.flatMap((s) => paper.sections[s]);
}

/** True when the answer is a chosen option or text with something in it. */
export function isAnswered(value: ExamAnswer | undefined): boolean {
  return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const ItemId = z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/);
const Epoch = z.number().int().positive().max(MAX_EPOCH_MS);
const Mode = z.enum(['full', 'mini']);
const Section = z.enum(['a', 'b', 'c']);
const CaseId = z.string().regex(/^cs-\d{2}$/);
const PaperId = z.string().regex(/^p-[a-z0-9]{1,12}-[a-z0-9]{1,8}$/);
const AnswerText = z
  .string()
  .max(ANSWER_MAX)
  .refine((s) => !ANSWER_UNSAFE.test(s), 'Answers are plain text');
const Answer = z.union([z.number().int().min(0).max(3), AnswerText]);
const Ticks = z
  .array(z.number().int().min(0).max(39))
  .max(40)
  .refine((t) => new Set(t).size === t.length, 'Duplicate tick');

export const PaperSchema = z
  .object({
    id: PaperId,
    mode: Mode,
    seed: z.number().int().min(0).max(0xffffffff),
    sections: z
      .object({ a: z.array(ItemId).max(MAX_ITEMS.a), b: z.array(ItemId).max(MAX_ITEMS.b), c: z.array(ItemId).max(MAX_ITEMS.c) })
      .strict(),
    caseStudyId: CaseId.nullable(),
    startedAt: Epoch,
    readingMs: z.number().int().min(0).max(EXAM_READING_MS),
    writingMs: z.number().int().min(60_000).max(EXAM_WRITING_MS),
    answers: z.record(ItemId, Answer),
    flags: z.array(ItemId).max(90),
    ticks: z.record(ItemId, Ticks),
    submittedAt: Epoch.nullable(),
    autoSubmitted: z.boolean(),
    warned: z.array(z.number().int().min(1).max(120)).max(8),
    at: z.object({ section: Section, index: z.number().int().min(0).max(39) }).strict(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const ids = paperItemIds(p);
    const known = new Set(ids);
    if (known.size !== ids.length) ctx.addIssue({ code: 'custom', message: 'An item appears twice on the paper', path: ['sections'] });
    const stray = [...Object.keys(p.answers), ...p.flags, ...Object.keys(p.ticks)].some((id) => !known.has(id));
    if (stray) ctx.addIssue({ code: 'custom', message: 'Answers, flags and ticks must name items on the paper', path: ['answers'] });
    if (p.submittedAt !== null && p.submittedAt < p.startedAt) ctx.addIssue({ code: 'custom', message: 'Submitted before it started', path: ['submittedAt'] });
  });

const Mark = z.number().int().min(0).max(200);
const TallySchema = z.tuple([Mark, Mark]).refine(([earned, available]) => earned <= available, 'More marks earned than available');

export const SummarySchema = z
  .object({
    id: PaperId,
    mode: Mode,
    caseStudyId: CaseId.nullable(),
    startedAt: Epoch,
    submittedAt: Epoch,
    markedAt: Epoch,
    usedMs: z.number().int().min(0).max(EXAM_READING_MS + EXAM_WRITING_MS),
    allowedMs: z.number().int().min(60_000).max(EXAM_READING_MS + EXAM_WRITING_MS),
    autoSubmitted: z.boolean(),
    sections: z.object({ a: TallySchema, b: TallySchema, c: TallySchema }).strict(),
    kk: z
      .array(z.tuple([z.custom<KkId>(isKkId), Mark, Mark]).refine(([, earned, available]) => earned <= available, 'More marks earned than available'))
      .max(80),
  })
  .strict();

export const ExamDataSchema = z
  .object({
    paper: PaperSchema.nullable(),
    history: z
      .array(SummarySchema)
      .max(HISTORY_MAX)
      .refine((h) => new Set(h.map((s) => s.id)).size === h.length, 'Duplicate paper in history'),
  })
  .strict();

export function defaultExam(): ExamData {
  return { paper: null, history: [] };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/** Oldest first, one entry per paper, capped at HISTORY_MAX. */
export function fileHistory(history: readonly ExamSummary[], add: readonly ExamSummary[]): ExamSummary[] {
  const byId = new Map<string, ExamSummary>();
  for (const s of [...history, ...add]) byId.set(s.id, s);
  return [...byId.values()].sort((a, b) => a.markedAt - b.markedAt || a.id.localeCompare(b.id)).slice(-HISTORY_MAX);
}

export const useExam = create<ExamState>()((set) => ({
  ...defaultExam(),
  replace: (data) => set({ paper: data.paper, history: data.history }),
  reset: () => set(defaultExam()),
}));

export function selectExamData(s: ExamData): ExamData {
  return { paper: s.paper, history: s.history };
}

// ---------------------------------------------------------------------------
// Salvage and cross-window merge
// ---------------------------------------------------------------------------

/** Keeps a damaged paper when only some answers, flags, ticks or warnings are bad. */
function salvagePaper(raw: unknown): { paper: ExamPaper | null; dropped: number } {
  if (raw === null || raw === undefined) return { paper: null, dropped: 0 };
  const whole = PaperSchema.safeParse(raw);
  if (whole.success) return { paper: whole.data, dropped: 0 };
  if (typeof raw !== 'object') return { paper: null, dropped: 1 };
  const r = raw as Record<string, unknown>;
  let dropped = 0;
  const keep = <T>(value: unknown, schema: z.ZodType<T>): Record<string, T> => {
    const out: Record<string, T> = {};
    if (typeof value !== 'object' || value === null) return out;
    for (const [k, v] of Object.entries(value)) {
      if (ItemId.safeParse(k).success && schema.safeParse(v).success) out[k] = v as T;
      else dropped++;
    }
    return out;
  };
  const list = <T>(value: unknown, schema: z.ZodType<T>): T[] => {
    if (!Array.isArray(value)) return [];
    const ok = value.filter((v): v is T => schema.safeParse(v).success);
    dropped += value.length - ok.length;
    return ok;
  };
  const candidate = {
    ...r,
    answers: keep(r.answers, Answer),
    ticks: keep(r.ticks, Ticks),
    flags: list(r.flags, ItemId),
    warned: list(r.warned, z.number().int().min(1).max(120)).slice(-8),
  };
  const sections = (typeof r.sections === 'object' && r.sections !== null ? r.sections : {}) as Record<string, unknown>;
  const known = new Set(SECTION_IDS.flatMap((s) => (Array.isArray(sections[s]) ? (sections[s] as unknown[]) : [])).filter((id) => typeof id === 'string'));
  const onPaperOnly = <T>(entries: [string, T][]) => {
    const kept = entries.filter(([k]) => known.has(k));
    dropped += entries.length - kept.length;
    return kept;
  };
  candidate.answers = Object.fromEntries(onPaperOnly(Object.entries(candidate.answers)));
  candidate.ticks = Object.fromEntries(onPaperOnly(Object.entries(candidate.ticks)));
  candidate.flags = onPaperOnly(candidate.flags.map((f): [string, null] => [f, null])).map(([f]) => f);
  const second = PaperSchema.safeParse(candidate);
  return second.success ? { paper: second.data, dropped: Math.max(1, dropped) } : { paper: null, dropped: 1 };
}

/** Keeps every valid history entry, and the paper in progress when it can be read. */
export function salvageExam(raw: unknown): { data: ExamData; dropped: number } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as { paper?: unknown; history?: unknown };
  const { paper, dropped: paperDropped } = salvagePaper(r.paper);
  let dropped = paperDropped;
  const history: ExamSummary[] = [];
  if (Array.isArray(r.history)) {
    for (const entry of r.history) {
      const parsed = SummarySchema.safeParse(entry);
      if (parsed.success) history.push(parsed.data as ExamSummary);
      else dropped++;
    }
  } else if (r.history !== undefined) dropped++;
  const filed = fileHistory([], history);
  dropped += history.length - filed.length;
  return { data: { paper, history: filed }, dropped };
}

/**
 * Cross-window merge. History is the union of both. For the paper: a paper the other window has
 * marked is gone; otherwise the more recently started paper wins; when both windows hold the same
 * paper, this window's unsaved answers, flags and position win and the earlier submission stands.
 */
export function mergeExam(local: ExamData, incoming: ExamData): ExamData {
  const history = fileHistory(incoming.history, local.history);
  const marked = new Set(history.map((h) => h.id));
  const mine = local.paper && !marked.has(local.paper.id) ? local.paper : null;
  const theirs = incoming.paper && !marked.has(incoming.paper.id) ? incoming.paper : null;
  let paper: ExamPaper | null;
  if (!mine || !theirs) paper = incoming.paper === null ? null : (theirs ?? mine);
  else if (mine.id !== theirs.id) paper = mine.startedAt > theirs.startedAt ? mine : theirs;
  else {
    const submittedAt = [mine.submittedAt, theirs.submittedAt].filter((t): t is number => t !== null).sort((a, b) => a - b)[0] ?? null;
    paper = {
      ...mine,
      answers: { ...theirs.answers, ...mine.answers },
      ticks: { ...theirs.ticks, ...mine.ticks },
      submittedAt,
      autoSubmitted: submittedAt === mine.submittedAt ? mine.autoSubmitted : theirs.autoSubmitted,
      warned: [...new Set([...theirs.warned, ...mine.warned])].slice(-8),
    };
  }
  return { paper, history };
}

export const examPersistence = persistStore(useExam, {
  name: 'exam',
  version: 1,
  schema: ExamDataSchema as z.ZodType<ExamData>,
  select: selectExamData,
  hydrate: (data) => data,
  defaults: defaultExam,
  salvage: salvageExam,
  merge: mergeExam,
  debounceMs: 400,
});
