/**
 * The shared quiz-loop engine (Section 7.2). Most games are question, answer and feedback loops,
 * so a game is an item source (a fixed list of QuizItems or a seeded generator) plus the blocks each
 * item renders. The engine handles progress, scoring, per-KK tallies, timed rounds, re-prompts for
 * answers that weren't attempts, and the round summary. It is pure: no stores, no timers, no DOM.
 */
import type { KkId } from '../content/schema';
import { kkLabel } from '../content/studyDesign';
import type { TerminalBlock } from '../terminal/blocks';
import type { AnswerResult, GameSession, GameSummary, KkTally, QuizItem } from './types';

export const DEFAULT_ROUND = 10;

export interface QuizSessionOptions {
  gameId: string;
  /** Clock (GameContext.now), used for timing and timed rounds. */
  now: () => number;
  /** A fixed list of items: content MCQs or the daily set. */
  items?: readonly QuizItem[];
  /** Or a generator: builds item `index` (0-based). Called lazily, once per index. */
  generate?: (index: number) => QuizItem;
  /**
   * Items in the round. Defaults to 10 for a generator and to the list length for items (capped at
   * the list length). Pass Infinity for a timed round that runs until its deadline.
   */
  count?: number;
  /** Epoch ms at which a timed round ends. */
  deadline?: number;
  /** Publish the round's item ids up front (the daily challenge). Needs `items`. */
  exposeItemIds?: boolean;
  /** Progress line label. Default "Question". */
  progressLabel?: string;
  /** First line of the summary. Default "Round complete" ("Time's up" once a deadline passes). */
  summaryTitle?: string;
  /** Extra summary blocks, e.g. a next-step hint. */
  summaryExtra?: (summary: Omit<GameSummary, 'blocks'>) => TerminalBlock[];
  /** Share line for games that have one (daily). */
  shareText?: (summary: Omit<GameSummary, 'blocks' | 'shareText'>) => string | undefined;
}

export interface QuizResult {
  itemId: string;
  kk: KkId[];
  correct: boolean;
  score: number;
}

export interface QuizSession extends GameSession {
  /** Results of the counted answers so far, in order. */
  readonly results: readonly QuizResult[];
}

/** "3 min 12 s", "45 s", "1 h 2 min". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min ${s} s`;
  return `${s} s`;
}

/** Whole scores print as integers; summed partial scores keep one decimal place. */
export function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

export function createQuizSession(opts: QuizSessionOptions): QuizSession {
  if (!opts.items && !opts.generate) throw new Error('createQuizSession needs items or generate');
  const items = opts.items ? [...opts.items] : null;
  const total = items ? Math.min(items.length, opts.count ?? items.length) : (opts.count ?? DEFAULT_ROUND);
  const generated = new Map<number, QuizItem>();
  const results: QuizResult[] = [];
  const perKk: Partial<Record<KkId, KkTally>> = {};
  const startedAt = opts.now();
  let lastAnswerAt = startedAt;
  let index = 0;

  const expired = () => opts.deadline !== undefined && opts.now() >= opts.deadline;
  const isDone = () => index >= total || expired();

  const itemAt = (i: number): QuizItem => {
    if (items) return items[i];
    let item = generated.get(i);
    if (!item) {
      item = opts.generate!(i);
      generated.set(i, item);
    }
    return item;
  };

  const progress = () => (Number.isFinite(total) ? { current: Math.min(index + 1, total), total } : undefined);

  const baseSummary = () => {
    const score = results.reduce((sum, r) => sum + r.score, 0);
    return { gameId: opts.gameId, score, total: results.length, ms: lastAnswerAt - startedAt, perKk: { ...perKk } };
  };

  const summaryBlocks = (s: Omit<GameSummary, 'blocks'>): TerminalBlock[] => {
    const title = opts.summaryTitle ?? (expired() && index < total ? "Time's up" : 'Round complete');
    const blocks: TerminalBlock[] = [
      { kind: 'rule' },
      { kind: 'text', text: `${title}: ${formatScore(s.score)} of ${s.total} correct.`, tone: 'accent' },
    ];
    if (s.total) blocks.push({ kind: 'text', text: `Time: ${formatDuration(s.ms)}.`, tone: 'muted' });
    const kks = Object.entries(s.perKk) as [KkId, KkTally][];
    if (kks.length > 1) {
      blocks.push({
        kind: 'table',
        caption: 'Results by key knowledge',
        columns: ['Key knowledge', 'Correct'],
        rows: kks.map(([kk, t]) => [kkLabel(kk), `${formatScore(t.correct)} of ${t.total}`]),
      });
    } else if (kks.length === 1) {
      const [kk, t] = kks[0];
      blocks.push({ kind: 'text', text: `${kkLabel(kk)}: ${formatScore(t.correct)} of ${t.total}.`, tone: 'muted' });
    }
    return blocks;
  };

  const session: QuizSession = {
    get done() {
      return isDone();
    },
    get deadline() {
      return opts.deadline;
    },
    get progress() {
      return progress();
    },
    get itemIds() {
      return opts.exposeItemIds && items ? items.slice(0, total).map((i) => i.id) : undefined;
    },
    get results() {
      return results;
    },

    prompt() {
      if (isDone()) return [];
      const p = progress();
      const blocks: TerminalBlock[] = [];
      if (p) blocks.push({ kind: 'progress', current: p.current, total: p.total, label: opts.progressLabel });
      return [...blocks, ...itemAt(index).prompt];
    },

    answer(input: string): AnswerResult {
      if (isDone()) {
        return { correct: false, expected: '', reason: 'This round has finished.', kk: [], itemId: opts.gameId, score: 0, counted: false };
      }
      const item = itemAt(index);
      const check = item.check(input);
      const base = { expected: check.expected, reason: check.reason, kk: item.kk, itemId: item.id, instance: item.instance, markdown: check.markdown };
      if (check.counted === false) return { ...base, correct: false, score: 0, counted: false };
      const score = Math.min(1, Math.max(0, check.score ?? (check.correct ? 1 : 0)));
      results.push({ itemId: item.id, kk: item.kk, correct: check.correct, score });
      for (const kk of new Set(item.kk)) {
        const t = perKk[kk] ?? { correct: 0, total: 0 };
        perKk[kk] = { correct: t.correct + score, total: t.total + 1 };
      }
      lastAnswerAt = opts.now();
      index++;
      return { ...base, correct: check.correct, score, followUp: check.followUp };
    },

    summary(): GameSummary {
      const s = baseSummary();
      const shareText = opts.shareText?.(s);
      const withShare = shareText === undefined ? s : { ...s, shareText };
      return { ...withShare, blocks: [...summaryBlocks(withShare), ...(opts.summaryExtra?.(withShare) ?? [])] };
    },

    chips() {
      return isDone() ? [] : (itemAt(index).chips ?? []);
    },

    current() {
      if (isDone()) return null;
      const item = itemAt(index);
      return { itemId: item.id, kk: item.kk, instance: item.instance };
    },
  };
  return session;
}
