/**
 * The game host: loads a game lazily, builds its GameContext, prints its blocks, times and records
 * every answer, keeps the daily challenge record, ends timed games at their deadline, and prints
 * the summary. Games stay pure; this is the only place terminal games touch the stores.
 *
 * Daily challenge protocol (docs/CONTRACTS.md): when a session exposes `itemIds`, the host calls
 * useSession.beginDaily(today, itemIds) once at start, then recordDaily(today, index, correct, now)
 * for each counted answer, where index is progress.current - 1 before the answer. The stored record
 * is the source of truth: when the Daily screen has answered questions while the terminal waited,
 * the next answer here isn't checked or logged, and the game restarts from the record instead.
 *
 * Written answers (the boss round's case study): an `advanced` result moves the game on to its
 * marking points without recording anything; a `selfMarked` result records the student's own mark
 * and prints what was recorded instead of a Correct or Incorrect verdict.
 */
import type { ContentIndex } from '../content/loader';
import type { KkId } from '../content/schema';
import { useContent } from '../content/store';
import { freshSeed } from '../games/prng';
import type { AnswerResult, Difficulty, Game, GameContext, GameMeta, GameSession } from '../games/types';
import { melbourneDate } from '../lib/time';
import { computeMastery, masteryValue } from '../srs/mastery';
import { useAttempts } from '../state/attempts';
import { onClearTabState } from '../state/persist';
import { recordAttempt } from '../state/record';
import { useSession } from '../state/session';
import { useSettings } from '../state/settings';
import { playCue } from '../ui/sound';
import type { TerminalBlock } from './blocks';
import { useTerminalSession, GAME_ANSWERS_MAX } from './session';
import { announceSince } from './speech';
import { useTerminal } from './useTerminal';

export const CONTENT_ERROR = "Study content couldn't be loaded. Check your connection, then try again.";

export interface StartOptions {
  difficulty: Difficulty;
  /** Context for content reports, e.g. "terminal: play sort --hard". */
  where: string;
  kk?: KkId[];
  seed?: number;
  count?: number;
  /** Print the difficulty in the intro line (play games; not the drill). */
  showDifficulty?: boolean;
}

let startToken = 0;
let deadlineTimer: ReturnType<typeof setTimeout> | null = null;

const term = () => useTerminalSession.getState();
const say = (text: string, tone?: 'muted' | 'accent' | 'warning'): TerminalBlock => ({ kind: 'text', text, tone });

function clearDeadline(): void {
  if (deadlineTimer !== null) clearTimeout(deadlineTimer);
  deadlineTimer = null;
}

function scheduleDeadline(session: GameSession): void {
  clearDeadline();
  if (session.deadline === undefined) return;
  const wait = Math.max(0, session.deadline - Date.now());
  deadlineTimer = setTimeout(() => {
    deadlineTimer = null;
    const game = term().game;
    if (!game || game.session !== session) return;
    if (session.done) {
      const from = term().nextId;
      finishGame();
      announceSince(from);
    } else {
      scheduleDeadline(session);
    }
  }, wait + 10);
}

function introLine(session: GameSession, opts: StartOptions): string {
  const total = session.progress?.total;
  const size = total === undefined ? '' : `${total} ${total === 1 ? 'question' : 'questions'}`;
  const level = opts.showDifficulty ? `${opts.difficulty.charAt(0).toUpperCase()}${opts.difficulty.slice(1)} difficulty` : '';
  const head = [level, size].filter(Boolean).join(', ');
  const timed = session.deadline !== undefined ? ` You have ${Math.max(1, Math.round((session.deadline - Date.now()) / 1000))} seconds.` : '';
  return `${head ? `${head}.` : ''}${timed} Answer at the prompt and press Enter. Press Ctrl+C or select Abort game to stop.`.trim();
}

/**
 * Loads and starts a game. Returns false when it couldn't start (content or code failed to load,
 * or the start was aborted with Ctrl+C while loading).
 */
export async function startGame(meta: GameMeta, opts: StartOptions): Promise<boolean> {
  if (term().game) endGameQuietly();
  const token = ++startToken;
  term().setBusy(true);
  try {
    let content: ContentIndex | null = null;
    if (meta.needsContent) {
      content = await useContent.getState().load();
      if (token !== startToken) return false;
      if (!content) {
        term().print(say(useContent.getState().error ?? CONTENT_ERROR, 'warning'));
        return false;
      }
    }
    let game: Game;
    try {
      game = await meta.load();
    } catch {
      if (token === startToken) term().print(say(`The ${meta.id} game couldn't load. Check your connection, then type the command again.`, 'warning'));
      return false;
    }
    if (token !== startToken) return false;
    const now = () => Date.now();
    const t = now();
    const today = melbourneDate(t);
    const mastery = computeMastery(useAttempts.getState(), t);
    const ctx: GameContext = {
      playerName: useSettings.getState().name,
      now,
      content,
      mastery: (kk) => masteryValue(mastery, kk),
      today,
      daily: meta.id === 'daily' ? (useSession.getState().daily[today] ?? null) : null,
    };
    const session = game.start(ctx, { difficulty: opts.difficulty, seed: opts.seed ?? freshSeed(t), kk: opts.kk, count: opts.count });
    if (session.unavailable) {
      term().print([say(meta.title, 'accent'), ...session.unavailable]);
      return false;
    }
    if (session.itemIds?.length) useSession.getState().beginDaily(today, [...session.itemIds]);
    // A session that is already done (today's daily challenge, finished earlier) only needs its summary.
    term().print(session.done ? [say(meta.title, 'accent')] : [say(meta.title, 'accent'), say(introLine(session, opts), 'muted')]);
    term().setGame({
      gameId: meta.id,
      meta,
      title: meta.title,
      session,
      difficulty: opts.difficulty,
      where: opts.where,
      startedAt: t,
      shownAt: t,
      today,
      chips: session.chips?.() ?? [],
      answers: [],
    });
    if (session.done) {
      finishGame();
      return true;
    }
    term().print(session.prompt());
    term().patchGame({ shownAt: Date.now() });
    scheduleDeadline(session);
    return true;
  } catch {
    if (token === startToken) {
      term().setGame(null);
      term().print(say(`The ${meta.id} game couldn't start because of a fault in this build. Reload the app and try again, or play another game.`, 'warning'));
    }
    return false;
  } finally {
    if (token === startToken) term().setBusy(false);
  }
}

/** Checks one typed answer against the running game and prints the feedback and next prompt. Returns the result, or null when nothing was checked. */
export function submitAnswer(input: string): AnswerResult | null {
  const game = term().game;
  if (!game) return null;
  const { session } = game;
  if (session.done) {
    finishGame();
    return null;
  }
  const index = session.progress ? session.progress.current - 1 : -1;
  if (session.itemIds && index >= 0) {
    const record = useSession.getState().daily[game.today];
    if (record && record.results.length !== index) {
      term().print(say('That question was already answered on the Daily screen, so the challenge carries on from your saved answers.', 'muted'));
      const from = term().nextId;
      // startGame rebuilds the session from the record: the first unanswered question, or the stored result.
      void startGame(game.meta, { difficulty: game.difficulty, where: game.where }).then(() => announceSince(from));
      return null;
    }
  }
  const t = Date.now();
  let result: AnswerResult;
  try {
    result = session.answer(input);
  } catch {
    term().print(say('Something went wrong checking that answer. Type report current to tell us about this question.', 'warning'));
    return null;
  }
  term().patchGame({ answers: [...game.answers, input].slice(-GAME_ANSWERS_MAX) });
  if (result.counted === false) {
    if (!result.advanced) {
      term().print(say(result.reason, 'warning'));
      return result;
    }
    // The game moved on without marking anything (a written answer before its marking points).
    // shownAt stays put, so the attempt recorded next is timed from when the question appeared.
    // Nothing is recorded, but `report` now means this question: its model answer is on screen.
    term().print(result.followUp ?? []);
    term().setLastAnswered({ itemId: result.itemId, kk: result.kk, instance: result.instance, where: game.where });
    if (session.done) finishGame();
    else {
      term().print(session.prompt());
      term().patchGame({ chips: session.chips?.() ?? [] });
    }
    return result;
  }
  const verdict: TerminalBlock[] = result.selfMarked
    ? []
    : [
        {
          kind: 'feedback',
          correct: result.correct,
          expected: result.expected || undefined,
          reason: result.reason || undefined,
          markdown: result.markdown === true ? true : undefined,
        },
      ];
  term().print([...verdict, ...(result.followUp ?? [])]);
  recordAttempt({ itemId: result.itemId, kk: result.kk, score: result.score, timestamp: t, ms: t - game.shownAt });
  if (session.itemIds && index >= 0) useSession.getState().recordDaily(game.today, index, result.correct, t);
  term().setLastAnswered({ itemId: result.itemId, kk: result.kk, instance: result.instance, where: game.where });
  if (!result.selfMarked) playCue(result.correct ? 'correct' : 'incorrect');
  if (session.done) {
    finishGame();
    return result;
  }
  term().print(session.prompt());
  term().patchGame({ shownAt: Date.now(), chips: session.chips?.() ?? [] });
  return result;
}

/** Prints the summary, publishes the game end and clears the game. */
export function finishGame(): void {
  clearDeadline();
  const game = term().game;
  if (!game) return;
  const summary = game.session.summary();
  term().setGame(null);
  term().print(summary.blocks);
  useTerminal.getState().reportGameEnd({ gameId: game.gameId, score: summary.score, total: summary.total, at: Date.now() });
  if (summary.shareText) {
    term().print([
      { kind: 'pre', text: summary.shareText, label: 'Share line', wrap: true },
      say('Type share to copy it to the clipboard.', 'muted'),
    ]);
    term().setLastShare(summary.shareText);
  }
  playCue('complete');
}

function endGameQuietly(): void {
  startToken++;
  clearDeadline();
  term().setGame(null);
  term().setBusy(false);
}

/**
 * Back to a fresh terminal: abandons any running or loading game and clears the scrollback, the
 * last answered item and the last share line. Runs when progress is reset or replaced, so the next
 * student in the same tab never sees the last one's commands.
 */
export function resetTerminal(): void {
  endGameQuietly();
  term().reset();
}

onClearTabState(resetTerminal);

/**
 * Aborts the running (or loading) game. Attempts already recorded stay recorded. Returns false
 * when there was nothing to abort.
 */
export function abortGame(): boolean {
  const { game, busy } = term();
  if (!game && !busy) return false;
  endGameQuietly();
  term().print(say('Game aborted.', 'muted'));
  return true;
}
