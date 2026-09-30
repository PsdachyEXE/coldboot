/**
 * Runs `fn` once the browser is idle, or within `timeout` ms at the latest. Where
 * requestIdleCallback is missing (Safari, tests) it waits a moment instead. Returns a cancel function.
 */
export function whenIdle(fn: () => void, timeout = 3000): () => void {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => fn(), { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const t = setTimeout(fn, Math.min(timeout, 1500));
  return () => clearTimeout(t);
}
