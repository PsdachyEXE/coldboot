/**
 * Game contract (Section 7.2). Games are pure: they take a seeded PRNG and return terminal blocks.
 * The terminal host renders blocks, times answers and records attempts; games never touch stores.
 *
 * Most games are question, answer and feedback loops, so they are built on the shared quiz-loop
 * engine in ./engine.ts: a game is an item generator plus the blocks that render each item.
 */
import type { ContentIndex } from '../content/loader';
import type { KkId } from '../content/schema';
import type { TerminalBlock } from '../terminal/blocks';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type Priority = 'P0' | 'P1' | 'P2';

export interface GameContext {
  readonly playerName: string;
  /** Clock injection keeps timed games testable. */
  readonly now: () => number;
  /** Loaded study content for games that draw on it (blitz, daily, drill). Null when not loaded. */
  readonly content: ContentIndex | null;
  /** Current mastery (0 to 100) per KK, or null when unseen. */
  readonly mastery: (kk: KkId) => number | null;
  /** Melbourne calendar date (YYYY-MM-DD) for the daily challenge. */
  readonly today: string;
}

export interface GameStartOptions {
  difficulty: Difficulty;
  seed: number;
  /** Items per round. Defaults to 10. */
  count?: number;
  /** Restrict item selection to these KKs, where the game supports it. */
  kk?: KkId[];
}

export interface AnswerResult {
  correct: boolean;
  /** The expected answer, formatted for display. */
  expected: string;
  /** One line on why the expected answer is right (or why the input was wrong). */
  reason: string;
  kk: KkId[];
  /** Stable id for the attempt log, e.g. "gen-sort-selection" or a content item id. */
  itemId: string;
  /** 0 to 1. MCQs and game items score 0 or 1. */
  score: number;
  /** Extra blocks shown after the feedback line (e.g. an ASCII Gantt chart). */
  followUp?: TerminalBlock[];
  /**
   * False when the input was not an attempt at all (e.g. an unparseable array); the host shows
   * `reason` and re-prompts without recording an attempt.
   */
  counted?: boolean;
}

export interface KkTally {
  correct: number;
  total: number;
}

export interface GameSummary {
  gameId: string;
  /** Items answered correctly (or summed item scores). */
  score: number;
  /** Items attempted. */
  total: number;
  /** Elapsed milliseconds from start to the last answer. */
  ms: number;
  perKk: Partial<Record<KkId, KkTally>>;
  /** Clipboard text for games with a share line (daily). */
  shareText?: string;
  /** Rendered summary. */
  blocks: TerminalBlock[];
}

export interface GameSession {
  /** Blocks for the current item. Called after start and after each answer until done. */
  prompt(): TerminalBlock[];
  answer(input: string): AnswerResult;
  readonly done: boolean;
  summary(): GameSummary;
  /** Tappable suggested answers for touch devices (e.g. "syntax", "logic", "runtime"). */
  chips?(): string[];
  /** Epoch ms at which a timed game ends; the host ends the session when it passes. */
  readonly deadline?: number;
  /** 1-based index of the current item and the round length, for the progress line. */
  readonly progress?: { current: number; total: number };
}

export interface Game {
  id: string;
  title: string;
  kk: KkId[];
  /** Shown by `man <game>`. Plain text with blank-line paragraphs. */
  man: string;
  start(ctx: GameContext, opts: GameStartOptions): GameSession;
}

/**
 * Registry metadata, available without loading a game's code (for `ls`, `man` and completion).
 * `load` dynamic-imports the game module so games stay out of the shell bundle.
 */
export interface GameMeta {
  id: string;
  title: string;
  priority: Priority;
  kk: KkId[];
  /** One line for `ls`. */
  summary: string;
  man: string;
  /** True when the game needs loaded study content (GameContext.content). */
  needsContent?: boolean;
  load: () => Promise<Game>;
}
