/**
 * Pseudocode listing through the shared Markdown pipeline (renderPseudo): numbered lines and
 * highlighted keywords. The caption states the array index base when the figure sets it.
 * Highlighted line numbers get a dashed ring; their markers are listed in the caption.
 */
import { useMemo } from 'react';
import type { PseudocodeFigure } from '../content/schema';
import { renderPseudo } from '../content/markdown';
import type { BodyProps } from './types';
import { useScrollable } from './useScrollable';
import '../ui/markdown.css';
import styles from './Figure.module.css';

export function PseudocodeFigureView({ figure: f, markers, title }: BodyProps<PseudocodeFigure>) {
  const [ref, scrollable] = useScrollable<HTMLDivElement>();
  const lines = useMemo(() => [...markers.keys()].map(Number).filter((n) => Number.isInteger(n) && n > 0), [markers]);
  // Bundled content or a game template only; renderPseudo escapes every character of the code.
  const html = useMemo(() => renderPseudo(f.code, { highlightLines: lines }), [f.code, lines]);
  return (
    <div
      ref={ref}
      className={styles.pseudo}
      tabIndex={scrollable ? 0 : undefined}
      role={scrollable ? 'group' : undefined}
      aria-label={scrollable ? `${title} (scrolls sideways)` : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
