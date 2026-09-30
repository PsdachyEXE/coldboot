/** Props every figure body receives from FigureView. */
export interface BodyProps<F> {
  figure: F;
  /** Highlighted element ids and the text marker beside each ring. */
  markers: ReadonlyMap<string, string>;
  /** The figure's title, used as the SVG's accessible name. */
  title: string;
  /** id of the title in the figcaption, for tables named by it. */
  titleId: string;
  /** Short description for the SVG's <desc>. */
  desc: string;
}

/** Default sizes from content/README.md, "Figure coordinates". */
export const DEFAULTS = {
  systemR: 64,
  entityW: 128,
  entityH: 48,
  processR: 48,
  storeW: 160,
  storeH: 36,
  useCaseRx: 84,
  useCaseRy: 28,
} as const;

/** Space between a label and the inside edge of its shape. */
export const INSET = 8;
