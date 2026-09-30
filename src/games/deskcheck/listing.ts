/**
 * Builds pseudocode listings in the house style (docs/PSEUDOCODE.md): uppercase keywords, four
 * spaces a level, no blank lines. Each `line` call returns the 1-based line number it wrote, so
 * templates can ask about "line 7" without counting by hand.
 */
import { formatReal, Real, type Value } from './interpreter';

export class Listing {
  readonly lines: string[] = [];
  private depth = 0;

  /** Writes a line at the current depth and returns its number. */
  line(text: string): number {
    this.lines.push(`${'    '.repeat(this.depth)}${text}`);
    return this.lines.length;
  }

  /** Writes a line that opens a block (IF, FOR, WHILE, REPEAT, BEGIN, FUNCTION). */
  open(text: string): number {
    const n = this.line(text);
    this.depth++;
    return n;
  }

  /** Writes a line that closes a block (ENDIF, ENDFOR, ENDWHILE, UNTIL, END, ENDFUNCTION). */
  close(text: string): number {
    this.depth--;
    return this.line(text);
  }

  /** Writes ELSEIF or ELSE: one level out, then back in. */
  middle(text: string): number {
    this.depth--;
    const n = this.line(text);
    this.depth++;
    return n;
  }

  get code(): string {
    return this.lines.join('\n');
  }
}

/** A value written as a pseudocode literal: 12, 2.5, "Mia", TRUE, [4, 8, 15]. */
export function literal(v: Value): string {
  if (typeof v === 'number') return String(v);
  if (v instanceof Real) return formatReal(v.value);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'string') return `"${v}"`;
  return `[${v.map(literal).join(', ')}]`;
}

/** A call written as pseudocode: grade(65), countAbove([4, 9, 6], 5). */
export function callText(name: string, args: readonly Value[]): string {
  return `${name}(${args.map(literal).join(', ')})`;
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

export function ordinal(n: number): string {
  if (n >= 1 && n <= ORDINALS.length) return ORDINALS[n - 1];
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

/** "2 times", "once". */
export function times(n: number): string {
  return n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`;
}
