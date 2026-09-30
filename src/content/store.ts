/**
 * Shared, lazily loaded study content. Screens call `useContentIndex()`; the first caller starts
 * the load. After a successful load, SRS records for cards that are no longer in the content are
 * pruned, so due counts match what Review can actually show.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { useSrs } from '../state/srs';
import { loadAllContent, type ContentIndex } from './loader';

export interface ContentState {
  index: ContentIndex | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  /** Starts (or retries) loading. Safe to call repeatedly. */
  load(): Promise<ContentIndex | null>;
}

export const useContent = create<ContentState>()((set, get) => ({
  index: null,
  status: 'idle',
  error: null,
  load: async () => {
    const { status, index } = get();
    if (status === 'ready') return index;
    if (status !== 'loading') set({ status: 'loading', error: null });
    try {
      const loaded = await loadAllContent();
      if (get().status !== 'ready') {
        set({ index: loaded, status: 'ready', error: null });
        useSrs.getState().prune(loaded.cardIds);
      }
      return loaded;
    } catch {
      set({ status: 'error', error: "Study content couldn't be loaded. Check your connection, then try again." });
      return null;
    }
  },
}));

/** The loaded content index, or null while loading (check `useContent(s => s.status)` for errors). */
export function useContentIndex(): ContentIndex | null {
  const index = useContent((s) => s.index);
  const status = useContent((s) => s.status);
  useEffect(() => {
    if (status === 'idle') void useContent.getState().load();
  }, [status]);
  return index;
}
