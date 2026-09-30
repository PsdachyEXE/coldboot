import { useCallback, useSyncExternalStore } from 'react';

/** Below this width the rail becomes a tab bar and the status bar shrinks (Section 9). */
export const NARROW_QUERY = '(max-width: 719.98px)';

/** Tracks a CSS media query. Returns false where matchMedia is missing (tests, old browsers). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    [query],
  );
  const get = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, get, () => false);
}

/** True below 720 px wide. */
export function useNarrow(): boolean {
  return useMediaQuery(NARROW_QUERY);
}
