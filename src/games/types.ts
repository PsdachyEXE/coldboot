/**
 * Game contract (Section 7.2). Games are pure: they take a seeded PRNG and return terminal blocks.
 * The terminal host renders blocks, times answers and records attempts; games never touch stores.
 *
 * Most games are question, answer and feedback loops, so they are built on the shared quiz-loop
 * engine in ./engine.ts: a game is an item generator plus the blocks that render each item.
 */
import type { ContentIndex } from '../content/loader';
import type { KkId } from '../content/schema';
import type { DailyRecord } from '../state/session';
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
  /**
   * Today's daily challenge record, if one exists (the `daily` game resumes from it and builds the
   * share line from its stored first attempts). Null for every other game.
   */
  readonly daily: DailyRecord | null;
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
   * Reproduces a generated item exactly, e.g. "deskcheck:seed=1234:i=4:hard". Shown in content
   * reports so a wrong generated answer can be regenerated and debugged.
   */
  instance?: string;
  /**
   * False when the input was not an attempt at all (e.g. an unparseable array); the host shows
   * `reason` and re-prompts without recording an attempt.
   */
  counted?: boolean;
  /**
   * True only when `expected` and `reason` come from bundled content (e.g. an MCQ explanation), so
   * the feedback block may render them as Markdown. Generated and user-typed text leaves it unset.
   */
  markdown?: boolean;
  /**
   * With `counted: false`: the input moved the game on without being marked (the boss round's
   * written answer, which reveals the model answer and marking points). The host records nothing
   * and prints no verdict or `reason`, only `followUp` and the next prompt.
   */
  advanced?: boolean;
  /**
   * The student marked their own answer (the boss round's case study questions). The host records
   * the attempt with `score` but prints no Correct or Incorrect verdict and plays no cue: `followUp`
   * says what was recorded.
   */
  selfMarked?: boolean;
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
  /**
   * Item ids of the whole round in order, known at start. The daily challenge exposes them so the
   * host can call beginDaily(date, itemIds) and then recordDaily(date, progress.current - 1, ...).
   */
  readonly itemIds?: readonly string[];
  /** The item currently awaiting an answer (for the Report action). */
  current?(): { itemId: string; kk: KkId[]; instance?: string } | null;
  /**
   * Set when the game can't run at all, e.g. blitz with no glossary installed: the blocks say why
   * and what to do instead. The host prints them after the title and doesn't start the game (no
   * attempts, no game end, no sound).
   */
  readonly unavailable?: TerminalBlock[];
}

/** Result of checking one answer against one item. */
export interface CheckResult {
  correct: boolean;
  expected: string;
  reason: string;
  /** 0 to 1; defaults to 1 when correct and 0 otherwise. */
  score?: number;
  followUp?: TerminalBlock[];
  /** False when the input wasn't an attempt (unparseable); the host re-prompts without recording. */
  counted?: boolean;
  /** See AnswerResult.markdown: bundled content only. */
  markdown?: boolean;
}

/** One question: the unit the shared quiz-loop engine (./engine.ts) runs. */
export interface QuizItem {
  /** Attempt item id, e.g. "gen-sort-selection" or a content MCQ id. */
  id: string;
  kk: KkId[];
  prompt: TerminalBlock[];
  chips?: string[];
  /** See AnswerResult.instance. */
  instance?: string;
  check(input: string): CheckResult;
}

export interface Game {
  id: string;
  title: string;
  kk: KkId[];
  /** Shown by `man <game>`. Plain text with blank-line paragraphs. */
  man: string;
  start(ctx: GameContext, opts: GameStartOptions): GameSession;
  /**
   * One self-contained generated item for a seed, used by the daily challenge and `boss`.
   * Deterministic: the same seed and difficulty always give the same item.
   */
  generate?(seed: number, difficulty: Difficulty): QuizItem;
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
  /** True when the game implements Game.generate (eligible for the daily challenge's generated items). */
  generator?: boolean;
  /**
   * True when the game has one level (blitz, daily): the terminal refuses --easy and --hard and
   * doesn't print a difficulty.
   */
  fixedDifficulty?: boolean;
  load: () => Promise<Game>;
}
