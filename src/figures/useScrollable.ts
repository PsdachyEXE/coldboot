import { useEffect, useId, useRef, useState, type RefObject } from 'react';

/**
 * True while the element is narrower than its content, so a scroll box can become a tab stop
 * (keyboard users can then scroll it) only when there is something to scroll.
 */
export function useScrollable<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    // The observer reports once straight away, then on every resize of the box or its content.
    const observer = new ResizeObserver(() => setScrollable(el.scrollWidth > el.clientWidth + 1));
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, []);
  return [ref, scrollable];
}

/** A document-unique id that is safe inside `url(#...)` references and `aria-labelledby` lists. */
export function useFigureId(): string {
  return `fig${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
}
