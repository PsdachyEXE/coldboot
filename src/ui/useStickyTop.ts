import { useEffect, type RefObject } from 'react';

/**
 * For a bar that sticks to the top of the page (the exam bar, the timed drill's clock): while it is
 * mounted, its height is set as `--sticky-top` on the root element, which `global.css` adds to the
 * page's `scroll-padding-top`. A control that takes focus under the bar (Shift+Tab upwards) then
 * scrolls clear of it (WCAG 2.4.11).
 */
export function useStickyTop(bar: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const b = bar.current;
    if (!b) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty('--sticky-top', `${Math.ceil(b.getBoundingClientRect().height)}px`);
    apply();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
    observer?.observe(b);
    return () => {
      observer?.disconnect();
      root.style.removeProperty('--sticky-top');
    };
  }, [bar]);
}
