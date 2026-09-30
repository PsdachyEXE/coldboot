/**
 * Everything that changes a paper: start, answer, flag, move, submit, tick and finish. Part of the
 * lazily loaded exam chunk, so the shell carries only the store's data (store.ts).
 */
import { submitTimer, timerState } from './timer';
import {
  ANSWER_MAX,
  ANSWER_UNSAFE,
  PaperSchema,
  SECTION_IDS,
  SummarySchema,
  fileHistory,
  paperItemIds,
  paperTiming,
  useExam,
  type ExamAnswer,
  type ExamPaper,
  type ExamSummary,
  type NewPaper,
  type SectionId,
} from './store';

/** Strips characters a written answer never needs and caps its length. Keeps spaces and line breaks. */
export function cleanAnswer(text: string): string {
  return Array.from(text.replace(new RegExp(ANSWER_UNSAFE.source, 'g'), '')).slice(0, ANSWER_MAX).join('');
}

function paperId(startedAt: number, seed: number): string {
  return `p-${startedAt.toString(36)}-${(seed >>> 0).toString(36)}`;
}

function onPaper(paper: ExamPaper, itemId: string): boolean {
  return paperItemIds(paper).includes(itemId);
}

function phaseOf(paper: ExamPaper, now: number) {
  return timerState(paper, paperTiming(paper), now).phase;
}

/** Applies `change` to the paper when there is one. */
function update(change: (paper: ExamPaper) => ExamPaper): void {
  useExam.setState((s) => {
    if (!s.paper) return s;
    const next = change(s.paper);
    return next === s.paper ? s : { paper: next };
  });
}

export interface ExamActions {
  /** Starts a paper now. Refused (false) while another paper is in progress. */
  start(paper: NewPaper, now?: number): boolean;
  /** Saves an answer. Ignored outside writing time and for items not on the paper. */
  answer(itemId: string, value: ExamAnswer, now?: number): void;
  clearAnswer(itemId: string, now?: number): void;
  /** Flags or unflags a question for review, until the paper is submitted. */
  toggleFlag(itemId: string): void;
  goTo(section: SectionId, index: number): void;
  noteWarned(marks: readonly number[]): void;
  /** Submits during writing time, or stores the automatic submission once writing time is over. */
  submit(now?: number): void;
  /** Sets the ticked marking points for a written answer after submission. */
  setTicks(itemId: string, ticked: readonly number[]): void;
  /** Files the summary in history and clears the paper. */
  finish(summary: ExamSummary): void;
  discard(): void;
}

export const examActions: ExamActions = {
  start: (p, now = Date.now()) => {
    if (useExam.getState().paper) return false;
    const sections = { a: [...p.sections.a], b: [...p.sections.b], c: [...p.sections.c] };
    const first = SECTION_IDS.find((s) => sections[s].length > 0) ?? 'a';
    const paper: ExamPaper = {
      id: paperId(now, p.seed),
      mode: p.mode,
      seed: p.seed >>> 0,
      sections,
      caseStudyId: p.caseStudyId,
      startedAt: now,
      readingMs: p.timing.readingMs,
      writingMs: p.timing.writingMs,
      answers: {},
      flags: [],
      ticks: {},
      submittedAt: null,
      autoSubmitted: false,
      warned: [],
      at: { section: first, index: 0 },
    };
    if (!PaperSchema.safeParse(paper).success) return false;
    useExam.setState({ paper });
    return true;
  },
  answer: (itemId, value, now = Date.now()) =>
    update((paper) => {
      if (!onPaper(paper, itemId) || phaseOf(paper, now) !== 'writing') return paper;
      const clean = typeof value === 'string' ? cleanAnswer(value) : value;
      if (typeof clean === 'number' && !(Number.isInteger(clean) && clean >= 0 && clean <= 3)) return paper;
      if (paper.answers[itemId] === clean) return paper;
      return { ...paper, answers: { ...paper.answers, [itemId]: clean } };
    }),
  clearAnswer: (itemId, now = Date.now()) =>
    update((paper) => {
      if (!(itemId in paper.answers) || phaseOf(paper, now) !== 'writing') return paper;
      const answers = { ...paper.answers };
      delete answers[itemId];
      return { ...paper, answers };
    }),
  toggleFlag: (itemId) =>
    update((paper) => {
      if (!onPaper(paper, itemId) || paper.submittedAt !== null) return paper;
      const flags = paper.flags.includes(itemId) ? paper.flags.filter((f) => f !== itemId) : [...paper.flags, itemId];
      return { ...paper, flags };
    }),
  goTo: (section, index) =>
    update((paper) => {
      const i = Math.max(0, Math.min(index, paper.sections[section].length - 1));
      if (paper.sections[section].length === 0 || (paper.at.section === section && paper.at.index === i)) return paper;
      return { ...paper, at: { section, index: i } };
    }),
  noteWarned: (marks) =>
    update((paper) => {
      const add = marks.filter((m) => Number.isInteger(m) && m >= 1 && m <= 120 && !paper.warned.includes(m));
      return add.length ? { ...paper, warned: [...paper.warned, ...add].slice(-8) } : paper;
    }),
  submit: (now = Date.now()) =>
    update((paper) => {
      if (paper.submittedAt !== null) return paper;
      const timing = paperTiming(paper);
      const expired = timerState(paper, timing, now).expired;
      const { submittedAt } = submitTimer(paper, timing, now);
      if (submittedAt === null) return paper;
      // Marking starts from the beginning of the paper.
      const first = SECTION_IDS.find((s) => paper.sections[s].length > 0) ?? 'a';
      return { ...paper, submittedAt, autoSubmitted: expired, at: { section: first, index: 0 } };
    }),
  setTicks: (itemId, ticked) =>
    update((paper) => {
      if (paper.submittedAt === null || !onPaper(paper, itemId)) return paper;
      const clean = [...new Set(ticked.filter((t) => Number.isInteger(t) && t >= 0 && t < 40))].sort((a, b) => a - b);
      return { ...paper, ticks: { ...paper.ticks, [itemId]: clean } };
    }),
  finish: (summary) => {
    if (!SummarySchema.safeParse(summary).success) return;
    useExam.setState((s) => ({ paper: s.paper?.id === summary.id ? null : s.paper, history: fileHistory(s.history, [summary]) }));
  },
  discard: () => useExam.setState({ paper: null }),
};

