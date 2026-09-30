/** Stub (owner: track D). Renders any Figure from structured data as SVG or a table. */
import type { Figure } from '../content/schema';

export function FigureView({ figure }: { figure: Figure }) {
  return (
    <figure data-figure={figure.kind}>
      <figcaption>{figure.title ?? figure.kind}</figcaption>
    </figure>
  );
}
