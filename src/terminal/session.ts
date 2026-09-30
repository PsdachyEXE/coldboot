/**
 * The terminal session (Section 7.1: two presentations, one session). The drop-down drawer and the
 * full-screen route both render this store, so scrollback, the running game, the typed draft and
 * the history cursor carry across when the student switches between them. It lives in memory only;
 * the persisted command history is `useSession.terminalHistory` (src/state/session.ts).
 */
import { create } from 'zustand';
import type { KkId } from '../content/schema';
import type { Difficulty, GameMeta, GameSession } from '../games/types';
import type { TerminalBlock } from './blocks';

/** Scrollback cap: older entries drop off the top. */
export const SCROLLBACK_MAX = 500;
/** Answers kept per game for Up and Down while a game runs. */
export const GAME_ANSWERS_MAX = 50;

export interface TerminalEntry {
  id: number;
  block: TerminalBlock;
}

export interface ActiveGame {
  gameId: string;
  /** Registry metadata of the running game (title, KKs, man page). */
  meta: GameMeta;
  title: string;
  session: GameSession;
  difficulty: Difficulty;
  /** How the game was started, for content reports: "terminal: play sort --hard". */
  where: string;
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms the current item was shown (attempt timing). */
  shownAt: number;
  /** Melbourne date when the game started (daily challenge records). */
  today: string;
  /** Suggested answers for the current item. */
  chips: string[];
  /** Answers typed in this game, oldest first, for Up and Down. */
  answers: string[];
}

/** An item the `report` command can open a report for. */
export interface ItemRef {
  itemId: string;
  kk: KkId[];
  instance?: string;
  where: string;
}

export interface HistoryWalk {
  /** Position in the history while walking it; null when not walking. */
  index: number | null;
  draft: string;
  /** The line being typed before the walk started, restored when walking past the newest entry. */
  stash: string;
}

/**
 * One step through history. Up (-1) moves to older entries and stops at the oldest; Down (+1) moves
 * to newer ones and, past the newest, restores the line that was being typed.
 */
export function walkHistory(state: HistoryWalk, history: readonly string[], dir: -1 | 1): HistoryWalk {
  if (!history.length) return state;
  if (dir === -1) {
    if (state.index === null) return { index: history.length - 1, draft: history[history.length - 1], stash: state.draft };
    const index = Math.max(0, Math.min(state.index, history.length) - 1);
    return { index, draft: history[index], stash: state.stash };
  }
  if (state.index === null) return state;
  const index = state.index + 1;
  if (index >= history.length) return { index: null, draft: state.stash, stash: '' };
  return { index, draft: history[index], stash: state.stash };
}

export const WELCOME: TerminalBlock[] = [
  { kind: 'text', text: 'COLDBOOT terminal', tone: 'accent' },
  { kind: 'text', text: 'Type help to see the commands, ls to list the games, or play sort to start one.', tone: 'muted' },
];

export interface TerminalSessionState {
  entries: TerminalEntry[];
  /** Id the next printed entry gets. Ids only increase, so "everything since id n" is well defined. */
  nextId: number;
  game: ActiveGame | null;
  /** True while a game or the study content is loading. */
  busy: boolean;
  draft: string;
  historyIndex: number | null;
  stash: string;
  /** The most recently answered item, for `report`. */
  lastAnswered: ItemRef | null;
  /** The most recent share line, for `share`. */
  lastShare: string | null;

  /** Appends blocks to the scrollback and returns the id of the first one. */
  print(blocks: TerminalBlock | readonly TerminalBlock[]): number;
  clear(): void;
  /** Typing: sets the draft and ends any history walk. */
  setDraft(draft: string): void;
  historyUp(history: readonly string[]): void;
  historyDown(history: readonly string[]): void;
  setGame(game: ActiveGame | null): void;
  patchGame(patch: Partial<ActiveGame>): void;
  setBusy(busy: boolean): void;
  setLastAnswered(ref: ItemRef | null): void;
  setLastShare(text: string | null): void;
  /** Back to a fresh session (tests, and a full reset). */
  reset(): void;
}

function initial() {
  return {
    entries: WELCOME.map((block, id) => ({ id, block })),
    nextId: WELCOME.length,
    game: null,
    busy: false,
    draft: '',
    historyIndex: null,
    stash: '',
    lastAnswered: null,
    lastShare: null,
  };
}

export const useTerminalSession = create<TerminalSessionState>()((set, get) => ({
  ...initial(),
  print: (blocks) => {
    const list = Array.isArray(blocks) ? (blocks as readonly TerminalBlock[]) : [blocks as TerminalBlock];
    const first = get().nextId;
    if (!list.length) return first;
    set((s) => {
      const added = list.map((block, i) => ({ id: s.nextId + i, block }));
      const entries = [...s.entries, ...added];
      return { entries: entries.length > SCROLLBACK_MAX ? entries.slice(-SCROLLBACK_MAX) : entries, nextId: s.nextId + list.length };
    });
    return first;
  },
  clear: () => set({ entries: [] }),
  setDraft: (draft) => set({ draft, historyIndex: null }),
  historyUp: (history) => set((s) => walk(s, history, -1)),
  historyDown: (history) => set((s) => walk(s, history, 1)),
  setGame: (game) => set({ game, historyIndex: null }),
  patchGame: (patch) => set((s) => (s.game ? { game: { ...s.game, ...patch } } : s)),
  setBusy: (busy) => set({ busy }),
  setLastAnswered: (lastAnswered) => set({ lastAnswered }),
  setLastShare: (lastShare) => set({ lastShare }),
  reset: () => set(initial()),
}));

function walk(s: TerminalSessionState, history: readonly string[], dir: -1 | 1): Partial<TerminalSessionState> {
  const next = walkHistory({ index: s.historyIndex, draft: s.draft, stash: s.stash }, history, dir);
  return { historyIndex: next.index, draft: next.draft, stash: next.stash };
}
