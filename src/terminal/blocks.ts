/**
 * TerminalBlock: the unit of terminal output. The terminal is a DOM terminal, so a line of output
 * can be rich (a table, an SVG figure, highlighted pseudocode, a link into an app route).
 * Blocks are plain data so games stay pure and testable; src/terminal renders them.
 */
import type { Figure } from '../content/schema';
import type { Highlight } from '../figures/highlight';

export type Tone = 'normal' | 'muted' | 'accent' | 'correct' | 'incorrect' | 'warning';

export type TerminalBlock =
  /** One or more lines of plain text. Newlines are preserved. Never interpreted as HTML. */
  | { kind: 'text'; text: string; tone?: Tone }
  /** Markdown subset (bundled content only; never user or imported text). */
  | { kind: 'markdown'; text: string }
  /** Highlighted pseudocode with line numbers. State the index base whenever arrays appear. */
  | { kind: 'pseudo'; code: string; title?: string; indexBase?: 0 | 1; highlightLines?: number[] }
  | { kind: 'table'; columns: string[]; rows: string[][]; caption?: string }
  /**
   * A figure drawn by FigureView. `highlight` rings elements with text markers (ids marked A, B,
   * C, ... or an id-to-marker map; see src/figures/highlight.ts); `compact` tightens the spacing.
   */
  | { kind: 'figure'; figure: Figure; highlight?: Highlight; compact?: boolean }
  /** A link into an app route (hash path such as "/drill?kk=U3O1-KK04"). */
  | { kind: 'link'; label: string; to: string }
  | { kind: 'list'; items: string[]; ordered?: boolean }
  /** Preformatted monospace text: ASCII Gantt charts, share lines, arrays. */
  | { kind: 'pre'; text: string; label?: string }
  /**
   * Lettered options (A to D) for an MCQ, or numbered choices. `markdown` may be true only when the
   * options come from bundled content; user-typed text never sets it.
   */
  | { kind: 'choices'; options: string[]; labels?: 'letters' | 'numbers'; markdown?: boolean }
  /**
   * Answer feedback: ✓ Correct / ✗ Incorrect with the expected answer and a reason. `markdown`
   * may be true only when expected/reason come from bundled content (e.g. an MCQ explanation).
   */
  | { kind: 'feedback'; correct: boolean; expected?: string; reason?: string; markdown?: boolean }
  | { kind: 'progress'; current: number; total: number; label?: string }
  /** Echo of a submitted command line. */
  | { kind: 'command'; prompt: string; input: string }
  | { kind: 'rule' };

export type TerminalBlockKind = TerminalBlock['kind'];

export const text = (value: string, tone?: Tone): TerminalBlock => ({ kind: 'text', text: value, tone });
export const pre = (value: string, label?: string): TerminalBlock => ({ kind: 'pre', text: value, label });
export const md = (value: string): TerminalBlock => ({ kind: 'markdown', text: value });
