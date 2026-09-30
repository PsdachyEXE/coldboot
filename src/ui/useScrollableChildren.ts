import { useEffect, type RefObject } from 'react';

/**
 * For HTML injected as a string (rendered Markdown and pseudocode), where no React ref reaches the
 * scroll boxes: every element under `container` matching `selector` becomes a labelled tab stop
 * while it is wider than its box, so keyboard users can scroll it, and stops being one when it
 * fits. Re-run it whenever the injected HTML changes (pass the HTML as `key`).
 */
export function useScrollableChildren(container: RefObject<HTMLElement | null>, selector: string, label: (el: HTMLElement) => string, key: unknown): void {
  useEffect(() => {
    const root = container.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const boxes = [...root.querySelectorAll<HTMLElement>(selector)];
    if (!boxes.length) return;
    const update = (el: HTMLElement) => {
      if (el.scrollWidth > el.clientWidth + 1) {
        el.tabIndex = 0;
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', `${label(el)} (scrolls sideways)`);
      } else {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
      }
    };
    const observer = new ResizeObserver(() => boxes.forEach(update));
    for (const el of boxes) {
      observer.observe(el);
      if (el.firstElementChild) observer.observe(el.firstElementChild);
    }
    return () => observer.disconnect();
    // `label` is read at update time; `key` stands for the injected HTML.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, selector, key]);
}
