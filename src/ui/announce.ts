/**
 * ARIA live announcements (answer feedback, timers). The shell renders one polite and one
 * assertive live region that read from this store.
 */
import { create } from 'zustand';

export interface AnnounceState {
  polite: string;
  assertive: string;
  /** Bumps on every message so repeated identical messages are still announced. */
  seq: number;
}

export const useAnnouncer = create<AnnounceState>()(() => ({ polite: '', assertive: '', seq: 0 }));

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  useAnnouncer.setState((s) => ({ ...s, [priority]: message, seq: s.seq + 1 }));
}
