/** Drawer visibility, shared by the shell (toggle button, backtick) and the terminal itself. */
import { create } from 'zustand';

export interface TerminalUiState {
  open: boolean;
  setOpen(open: boolean): void;
  toggle(): void;
}

export const useTerminal = create<TerminalUiState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
