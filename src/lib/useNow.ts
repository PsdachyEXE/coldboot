/** A ticking clock for countdowns, due counts and timers. */
import { useEffect, useState } from 'react';

/**
 * The current time (epoch ms), refreshed every `intervalMs` and whenever the page becomes visible
 * again (background tabs throttle timers, so a returning user never sees a stale countdown).
 * Pick the slowest interval the display needs: 1000 for a seconds timer, 15000 for the status bar.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, Math.max(50, intervalMs));
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}
