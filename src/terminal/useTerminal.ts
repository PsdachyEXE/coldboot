/**
 * Drawer visibility and a command hand-off, shared by the shell (toggle button), study screens
 * (e.g. Today's run asking the terminal to start `daily`) and the terminal itself (track B).
 */
import { create } from 'zustand';

/** What the terminal publishes when a game ends, so screens (e.g. Today's run) can move on. */
export interface GameEnd {
  gameId: string;
  score: number;
  total: number;
  /** Epoch ms. */
  at: number;
}

export interface TerminalUiState {
  open: boolean;
  /** The most recent finished (not aborted) game. Set by the terminal host. */
  lastGameEnd: GameEnd | null;
  /** A command another screen asked the terminal to run; the terminal consumes and clears it. */
  pending: string | null;
  setOpen(open: boolean): void;
  toggle(): void;
  /** Opens the drawer and runs `command` as if typed at the prompt. */
  run(command: string): void;
  /** Called by the terminal once it has taken the pending command. */
  takePending(): string | null;
  /** Called by the terminal host when a game finishes. */
  reportGameEnd(end: GameEnd): void;
}

export const useTerminal = create<TerminalUiState>()((set, get) => ({
  open: false,
  lastGameEnd: null,
  pending: null,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  run: (command) => set({ open: true, pending: command }),
  takePending: () => {
    const cmd = get().pending;
    if (cmd !== null) set({ pending: null });
    return cmd;
  },
  reportGameEnd: (end) => set({ lastGameEnd: end }),
}));
