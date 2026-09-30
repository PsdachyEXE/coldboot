/**
 * The `highlight` prop: which elements of a figure to ring, and the text marker beside each ring.
 *
 * - An array of element ids marks them A, B, C, ... in order, so a question can say "the flow
 *   marked A".
 * - An object maps each id to its own marker text, e.g. `{ f3: '1', p2: '2' }`.
 *
 * Element ids by figure kind: context diagram `system`, entity ids and flow ids; DFD node ids and
 * flow ids; use case diagram actor and use case ids and links; Gantt task ids; object description
 * property and method names; pseudocode line numbers; table row numbers (from 1); mock-up
 * elements `e1`, `e2`, ... in data order. A flow or link without an id is addressed as
 * `from->to`. Ids the figure doesn't contain are ignored.
 */
export type Highlight = readonly string[] | Readonly<Record<string, string>>;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function highlightMarkers(spec: Highlight | undefined): ReadonlyMap<string, string> {
  if (!spec) return new Map();
  if (Array.isArray(spec)) {
    const ids = spec as readonly string[];
    return new Map(ids.map((id, i) => [id, i < LETTERS.length ? LETTERS[i] : String(i + 1)]));
  }
  return new Map(Object.entries(spec as Readonly<Record<string, string>>));
}
