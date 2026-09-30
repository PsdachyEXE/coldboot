/** Measures a chart's box so SVG charts draw at real pixel width (text stays 14 px at any width). */
import { useEffect, useRef, useState, type RefObject } from 'react';

/** Width used before the first measurement, and where ResizeObserver is missing (tests). */
export const FALLBACK_WIDTH = 640;

/** The content-box width of an element, kept current as it resizes. */
export function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const w = Math.floor(el.clientWidth);
      if (w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
