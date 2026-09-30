/**
 * On the /terminal route, the backtick key focuses the route's input instead of opening the drawer
 * over it. The route registers its focus function here while it is mounted.
 */
let handler: (() => void) | null = null;

export function registerRouteFocus(fn: () => void): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

/** Focuses the route's input. Returns false when the route isn't mounted. */
export function focusRouteInput(): boolean {
  if (!handler) return false;
  handler();
  return true;
}
