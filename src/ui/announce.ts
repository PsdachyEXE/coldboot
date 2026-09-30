/**
 * ARIA live announcements (answer feedback, timers). The shell renders one polite and one
 * assertive live region (`<LiveRegions />`) that read from this store.
 */
import { create } from 'zustand';

export interface AnnounceState {
  polite: string;
  assertive: string;
  /** Bumps on every message so repeated identical messages are still announced. */
  seq: number;
  /** `seq` when the polite message last changed, so only that region re-announces. */
  politeSeq: number;
  /** `seq` when the assertive message last changed. */
  assertiveSeq: number;
}

export const useAnnouncer = create<AnnounceState>()(() => ({ polite: '', assertive: '', seq: 0, politeSeq: 0, assertiveSeq: 0 }));

/**
 * Speaks `message` through the live region. Use `polite` (default) for answer feedback and
 * confirmations; `assertive` only for something that needs attention now, such as time running out.
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  useAnnouncer.setState((s) => {
    const seq = s.seq + 1;
    return priority === 'polite' ? { polite: message, seq, politeSeq: seq } : { assertive: message, seq, assertiveSeq: seq };
  });
}
