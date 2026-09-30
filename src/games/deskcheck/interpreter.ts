/**
 * A small interpreter for exactly the pseudocode subset that COLDBOOT generates (docs/PSEUDOCODE.md):
 * the deskcheck listings and the triage snippets. Every generated answer comes from running the
 * listing here; templates never compute answers themselves (Section 12).
 *
 * The subset:
 * - A listing is `BEGIN ... END`, or one or more `FUNCTION name(params) ... ENDFUNCTION` blocks
 *   (at most one `BEGIN ... END` block alongside them). Lines are numbered from 1 and blank lines
 *   are not allowed, because questions refer to line numbers. Indentation is four spaces a level.
 * - Statements: assignment with `←` (to a variable or an array element), `DISPLAY expr`,
 *   `IF ... THEN` / `ELSEIF ... THEN` / `ELSE` / `ENDIF`, `FOR v ← a TO b [STEP s]` / `ENDFOR`
 *   (bounds inclusive, evaluated once), `WHILE cond DO` / `ENDWHILE`, `REPEAT` / `UNTIL cond` and
 *   `RETURN expr`. `//` starts a comment.
 * - Expressions: whole and decimal numbers, "strings", TRUE and FALSE, array literals `[1, 2]`
 *   (nested for two dimensions), `a[i]` and `grid[r][c]` with a configurable index base, calls
 *   to the listing's functions and to `LENGTH(x)`, `+ - * /`, `MOD`, `DIV` (rounds down),
 *   `= ≠ < ≤ > ≥`, `AND`, `OR`, `NOT` and brackets. `+` joins strings, turning a number into its
 *   text. `/` always gives a floating point result. `AND` and `OR` evaluate both sides, so a
 *   listing never relies on short-circuiting.
 *
 * Anything else is a `PseudoError` of kind 'syntax' with the line number. Running raises
 * 'name', 'type', 'index', 'divide-by-zero', 'overflow', 'return' or 'limit' errors. The step
 * limit stops runaway loops.
 */

export type PseudoErrorKind = 'syntax' | 'name' | 'type' | 'index' | 'divide-by-zero' | 'overflow' | 'return' | 'limit';

export class PseudoError extends Error {
  readonly kind: PseudoErrorKind;
  /** 1-based line number, or 0 when the error isn't tied to a line. */
  readonly line: number;
  constructor(kind: PseudoErrorKind, message: string, line = 0) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = 'PseudoError';
    this.kind = kind;
    this.line = line;
  }
}

/** A floating point value. Whole numbers are plain JavaScript integers; anything from `/` or a decimal literal is Real. */
export class Real {
  readonly value: number;
  constructor(value: number) {
    this.value = value;
  }
}

export type Value = number | Real | string | boolean | Value[];

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const KEYWORDS = new Set([
  'BEGIN', 'END', 'IF', 'THEN', 'ELSEIF', 'ELSE', 'ENDIF', 'FOR', 'TO', 'STEP', 'ENDFOR', 'WHILE', 'DO', 'ENDWHILE',
  'REPEAT', 'UNTIL', 'FUNCTION', 'RETURN', 'ENDFUNCTION', 'DISPLAY', 'AND', 'OR', 'NOT', 'MOD', 'DIV', 'TRUE', 'FALSE', 'LENGTH',
]);

const ASCII_OPERATORS: Record<string, string> = { '<-': '←', '<=': '≤', '>=': '≥', '<>': '≠', '!=': '≠', '==': '=' };

type Token = { t: 'num'; v: string } | { t: 'str'; v: string } | { t: 'id'; v: string } | { t: 'kw'; v: string } | { t: 'op'; v: string };

const TOKEN = /\s*(?:(\/\/.*)|(\d+(?:\.\d+)?)(?![\w.])|("[^"]*")|([A-Za-z_][A-Za-z0-9_]*)|(<-|<=|>=|<>|!=|==|[←+\-*/=≠<≤>≥()[\],])|(\S+))/y;

function tokenise(text: string, line: number): Token[] {
  const tokens: Token[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < text.length) {
    const m = TOKEN.exec(text);
    if (!m) break;
    const [, comment, num, str, word, op, other] = m;
    if (comment !== undefined) break;
    if (num !== undefined) tokens.push({ t: 'num', v: num });
    else if (str !== undefined) tokens.push({ t: 'str', v: str.slice(1, -1) });
    else if (word !== undefined) {
      if (KEYWORDS.has(word)) tokens.push({ t: 'kw', v: word });
      else if (/^[A-Z][A-Z0-9_]+$/.test(word)) throw new PseudoError('syntax', `${word} isn't a keyword in this pseudocode.`, line);
      else if (!/^[a-z][A-Za-z0-9]*$/.test(word)) throw new PseudoError('syntax', `${word} isn't a valid name. Names are camelCase, such as totalScore.`, line);
      else tokens.push({ t: 'id', v: word });
    } else if (op !== undefined) {
      if (ASCII_OPERATORS[op]) throw new PseudoError('syntax', `Write ${ASCII_OPERATORS[op]} rather than ${op}.`, line);
      tokens.push({ t: 'op', v: op });
    } else if (other !== undefined) {
      if (other.startsWith('"')) throw new PseudoError('syntax', 'A string is missing its closing quote.', line);
      throw new PseudoError('syntax', `Unexpected ${other}.`, line);
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Syntax tree
// ---------------------------------------------------------------------------

export type Expr =
  | { k: 'lit'; v: Value }
  | { k: 'var'; name: string }
  | { k: 'index'; target: Expr; index: Expr }
  | { k: 'call'; name: string; args: Expr[] }
  | { k: 'array'; items: Expr[] }
  | { k: 'unary'; op: '-' | 'NOT'; e: Expr }
  | { k: 'bin'; op: string; l: Expr; r: Expr };

export interface Target {
  name: string;
  indexes: Expr[];
}

export interface Branch {
  line: number;
  /** Null for ELSE. */
  cond: Expr | null;
  body: Stmt[];
}

export type Stmt =
  | { k: 'assign'; line: number; target: Target; e: Expr }
  | { k: 'display'; line: number; e: Expr }
  | { k: 'return'; line: number; e: Expr }
  | { k: 'if'; line: number; branches: Branch[]; endLine: number }
  | { k: 'for'; line: number; v: string; from: Expr; to: Expr; step: Expr | null; body: Stmt[]; endLine: number }
  | { k: 'while'; line: number; cond: Expr; body: Stmt[]; endLine: number }
  | { k: 'repeat'; line: number; cond: Expr; body: Stmt[]; endLine: number };

export interface FunctionDef {
  name: string;
  params: string[];
  body: Stmt[];
  line: number;
  endLine: number;
}

export interface Program {
  source: string;
  lineCount: number;
  /** The BEGIN ... END block, or null for a listing of functions only. */
  main: Stmt[] | null;
  functions: Map<string, FunctionDef>;
}

interface SourceLine {
  n: number;
  indent: number;
  tokens: Token[];
}

const BINARY_PRECEDENCE: Record<string, number> = {
  OR: 1,
  AND: 2,
  '=': 4,
  '≠': 4,
  '<': 4,
  '≤': 4,
  '>': 4,
  '≥': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  MOD: 6,
  DIV: 6,
};
const COMPARISON = 4;

function describe(tok: Token | undefined): string {
  if (!tok) return 'the end of the line';
  if (tok.t === 'str') return `"${tok.v}"`;
  return tok.v;
}

class ExprParser {
  private pos = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly line: number,
  ) {}

  get done(): boolean {
    return this.pos >= this.tokens.length;
  }

  peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  isKw(v: string): boolean {
    const t = this.peek();
    return !!t && t.t === 'kw' && t.v === v;
  }

  isOp(v: string): boolean {
    const t = this.peek();
    return !!t && t.t === 'op' && t.v === v;
  }

  expectOp(v: string): void {
    if (!this.isOp(v)) throw this.error(`Expected ${v} but found ${describe(this.peek())}.`);
    this.pos++;
  }

  expectKw(v: string): void {
    if (!this.isKw(v)) throw this.error(`Expected ${v} but found ${describe(this.peek())}.`);
    this.pos++;
  }

  expectEnd(): void {
    if (!this.done) throw this.error(`Unexpected ${describe(this.peek())}.`);
  }

  error(message: string): PseudoError {
    return new PseudoError('syntax', message, this.line);
  }

  expr(minPrec = 1): Expr {
    let left = this.prefix();
    for (;;) {
      const t = this.peek();
      if (!t || (t.t !== 'op' && t.t !== 'kw')) break;
      const prec = BINARY_PRECEDENCE[t.v];
      if (prec === undefined || prec < minPrec) break;
      this.pos++;
      const right = this.expr(prec + 1);
      left = { k: 'bin', op: t.v, l: left, r: right };
      if (prec === COMPARISON) {
        const after = this.peek();
        if (after && after.t === 'op' && BINARY_PRECEDENCE[after.v] === COMPARISON) throw this.error('Join two comparisons with AND or OR.');
      }
    }
    return left;
  }

  private prefix(): Expr {
    if (this.isKw('NOT')) {
      this.pos++;
      return { k: 'unary', op: 'NOT', e: this.expr(COMPARISON) };
    }
    if (this.isOp('-')) {
      this.pos++;
      return { k: 'unary', op: '-', e: this.prefix() };
    }
    return this.postfix(this.primary());
  }

  private postfix(e: Expr): Expr {
    let out = e;
    while (this.isOp('[')) {
      this.pos++;
      const index = this.expr();
      this.expectOp(']');
      out = { k: 'index', target: out, index };
    }
    return out;
  }

  private args(): Expr[] {
    this.expectOp('(');
    const args: Expr[] = [];
    if (!this.isOp(')')) {
      for (;;) {
        args.push(this.expr());
        if (!this.isOp(',')) break;
        this.pos++;
      }
    }
    this.expectOp(')');
    return args;
  }

  private primary(): Expr {
    const t = this.next();
    if (!t) throw this.error('An expression is missing.');
    switch (t.t) {
      case 'num':
        return { k: 'lit', v: t.v.includes('.') ? new Real(Number(t.v)) : Number(t.v) };
      case 'str':
        return { k: 'lit', v: t.v };
      case 'id':
        if (this.isOp('(')) return { k: 'call', name: t.v, args: this.args() };
        return { k: 'var', name: t.v };
      case 'kw':
        if (t.v === 'TRUE' || t.v === 'FALSE') return { k: 'lit', v: t.v === 'TRUE' };
        if (t.v === 'LENGTH') return { k: 'call', name: 'LENGTH', args: this.args() };
        throw this.error(`Unexpected ${t.v}.`);
      case 'op':
        if (t.v === '(') {
          const inner = this.expr();
          this.expectOp(')');
          return inner;
        }
        if (t.v === '[') {
          const items: Expr[] = [];
          if (!this.isOp(']')) {
            for (;;) {
              items.push(this.expr());
              if (!this.isOp(',')) break;
              this.pos++;
            }
          }
          this.expectOp(']');
          return { k: 'array', items };
        }
        throw this.error(`Unexpected ${t.v}.`);
    }
  }
}

const BLOCK_ENDS = new Set(['END', 'ENDIF', 'ELSEIF', 'ELSE', 'ENDFOR', 'ENDWHILE', 'UNTIL', 'ENDFUNCTION']);
const OPENER: Record<string, string> = { ENDIF: 'IF', ELSEIF: 'IF', ELSE: 'IF', ENDFOR: 'FOR', ENDWHILE: 'WHILE', UNTIL: 'REPEAT', ENDFUNCTION: 'FUNCTION', END: 'BEGIN' };

class Parser {
  private i = 0;
  /** Keywords of the blocks currently open, outermost first, for clearer error messages. */
  private readonly openers: string[] = [];
  constructor(private readonly lines: SourceLine[]) {}

  private peekLine(): SourceLine | undefined {
    return this.lines[this.i];
  }

  private firstKw(line: SourceLine | undefined): string | null {
    const t = line?.tokens[0];
    return t && t.t === 'kw' ? t.v : null;
  }

  private checkIndent(line: SourceLine, depth: number): void {
    if (line.indent !== depth * 4) {
      throw new PseudoError('syntax', `This line should be indented ${depth * 4} spaces.`, line.n);
    }
  }

  program(source: string, lineCount: number): Program {
    let main: Stmt[] | null = null;
    const functions = new Map<string, FunctionDef>();
    while (this.i < this.lines.length) {
      const line = this.lines[this.i];
      this.checkIndent(line, 0);
      const kw = this.firstKw(line);
      if (kw === 'BEGIN') {
        if (main) throw new PseudoError('syntax', 'A listing has only one BEGIN block.', line.n);
        if (line.tokens.length > 1) throw new PseudoError('syntax', 'BEGIN stands on its own line.', line.n);
        this.i++;
        const { body, end } = this.block(1, ['END']);
        if (end.tokens.length > 1) throw new PseudoError('syntax', 'END stands on its own line.', end.n);
        main = body;
      } else if (kw === 'FUNCTION') {
        const def = this.functionDef();
        if (functions.has(def.name)) throw new PseudoError('syntax', `The function ${def.name} is defined twice.`, def.line);
        functions.set(def.name, def);
      } else {
        throw new PseudoError('syntax', 'A listing starts with BEGIN or FUNCTION.', line.n);
      }
    }
    if (!main && functions.size === 0) throw new PseudoError('syntax', 'The listing is empty.');
    return { source, lineCount, main, functions };
  }

  private functionDef(): FunctionDef {
    const line = this.lines[this.i++];
    const p = new ExprParser(line.tokens, line.n);
    p.expectKw('FUNCTION');
    const name = p.next();
    if (!name || name.t !== 'id') throw p.error('FUNCTION needs a name, such as FUNCTION average(values, n).');
    p.expectOp('(');
    const params: string[] = [];
    if (!p.isOp(')')) {
      for (;;) {
        const t = p.next();
        if (!t || t.t !== 'id') throw p.error('Parameters are names separated by commas.');
        if (params.includes(t.v)) throw p.error(`The parameter ${t.v} appears twice.`);
        params.push(t.v);
        if (!p.isOp(',')) break;
        p.next();
      }
    }
    p.expectOp(')');
    p.expectEnd();
    const { body, end } = this.block(1, ['ENDFUNCTION']);
    if (end.tokens.length > 1) throw new PseudoError('syntax', 'ENDFUNCTION stands on its own line.', end.n);
    return { name: name.v, params, body, line: line.n, endLine: end.n };
  }

  /** Statements until one of `ends` (which is consumed and returned). */
  private block(depth: number, ends: readonly string[]): { body: Stmt[]; end: SourceLine } {
    const body: Stmt[] = [];
    const closer = ends[ends.length - 1];
    this.openers.push(OPENER[closer]);
    try {
      for (;;) {
        const line = this.peekLine();
        if (!line) throw new PseudoError('syntax', `The listing ends before ${closer}.`, this.lines.at(-1)?.n ?? 0);
        const kw = this.firstKw(line);
        if (kw && ends.includes(kw)) {
          this.checkIndent(line, depth - 1);
          this.i++;
          return { body, end: line };
        }
        if (kw && BLOCK_ENDS.has(kw)) {
          const matches = this.openers.slice(0, -1).includes(OPENER[kw]);
          throw new PseudoError(
            'syntax',
            matches ? `${closer} is missing: the ${OPENER[closer]} must close before this ${kw}.` : `${kw} doesn't match an open ${OPENER[kw]}.`,
            line.n,
          );
        }
        this.checkIndent(line, depth);
        body.push(this.statement(depth));
      }
    } finally {
      this.openers.pop();
    }
  }

  private statement(depth: number): Stmt {
    const line = this.lines[this.i++];
    const p = new ExprParser(line.tokens, line.n);
    const first = p.peek()!;
    if (first.t === 'kw') {
      switch (first.v) {
        case 'IF':
          return this.ifStatement(line, p, depth);
        case 'FOR': {
          p.next();
          const v = p.next();
          if (!v || v.t !== 'id') throw p.error('FOR needs a loop variable, such as FOR i ← 1 TO 5.');
          p.expectOp('←');
          const from = p.expr();
          p.expectKw('TO');
          const to = p.expr();
          let step: Expr | null = null;
          if (p.isKw('STEP')) {
            p.next();
            step = p.expr();
          }
          p.expectEnd();
          const { body, end } = this.block(depth + 1, ['ENDFOR']);
          if (end.tokens.length > 1) throw new PseudoError('syntax', 'ENDFOR stands on its own line.', end.n);
          return { k: 'for', line: line.n, v: v.v, from, to, step, body, endLine: end.n };
        }
        case 'WHILE': {
          p.next();
          const cond = p.expr();
          p.expectKw('DO');
          p.expectEnd();
          const { body, end } = this.block(depth + 1, ['ENDWHILE']);
          if (end.tokens.length > 1) throw new PseudoError('syntax', 'ENDWHILE stands on its own line.', end.n);
          return { k: 'while', line: line.n, cond, body, endLine: end.n };
        }
        case 'REPEAT': {
          p.next();
          p.expectEnd();
          const { body, end } = this.block(depth + 1, ['UNTIL']);
          const q = new ExprParser(end.tokens, end.n);
          q.expectKw('UNTIL');
          const cond = q.expr();
          q.expectEnd();
          return { k: 'repeat', line: line.n, cond, body, endLine: end.n };
        }
        case 'DISPLAY': {
          p.next();
          const e = p.expr();
          p.expectEnd();
          return { k: 'display', line: line.n, e };
        }
        case 'RETURN': {
          p.next();
          const e = p.expr();
          p.expectEnd();
          return { k: 'return', line: line.n, e };
        }
        case 'BEGIN':
        case 'FUNCTION':
          throw p.error(`${first.v} can't appear inside another block.`);
        default:
          throw p.error(`A statement can't start with ${first.v}.`);
      }
    }
    if (first.t === 'id') {
      p.next();
      const indexes: Expr[] = [];
      while (p.isOp('[')) {
        p.next();
        indexes.push(p.expr());
        p.expectOp(']');
      }
      if (indexes.length > 2) throw p.error('Arrays have at most two dimensions.');
      if (!p.isOp('←')) {
        if (p.isOp('(')) throw p.error('A function call on its own line does nothing: assign its result, such as result ← f(x).');
        throw p.error(`Expected ← after ${first.v} but found ${describe(p.peek())}.`);
      }
      p.next();
      const e = p.expr();
      p.expectEnd();
      return { k: 'assign', line: line.n, target: { name: first.v, indexes }, e };
    }
    throw p.error(`A statement can't start with ${describe(first)}.`);
  }

  private ifStatement(line: SourceLine, p: ExprParser, depth: number): Stmt {
    p.expectKw('IF');
    const cond = p.expr();
    p.expectKw('THEN');
    p.expectEnd();
    const branches: Branch[] = [];
    let head = { line: line.n, cond: cond as Expr | null };
    let sawElse = false;
    for (;;) {
      const { body, end } = this.block(depth + 1, ['ELSEIF', 'ELSE', 'ENDIF']);
      branches.push({ ...head, body });
      const q = new ExprParser(end.tokens, end.n);
      const kw = (end.tokens[0] as { v: string }).v;
      if (kw === 'ENDIF') {
        q.next();
        q.expectEnd();
        return { k: 'if', line: line.n, branches, endLine: end.n };
      }
      if (sawElse) throw new PseudoError('syntax', `${kw} can't follow ELSE; close the IF with ENDIF.`, end.n);
      if (kw === 'ELSE') {
        q.next();
        q.expectEnd();
        sawElse = true;
        head = { line: end.n, cond: null };
      } else {
        q.next();
        const c = q.expr();
        q.expectKw('THEN');
        q.expectEnd();
        head = { line: end.n, cond: c };
      }
    }
  }
}

/** Parses a listing. Throws a PseudoError of kind 'syntax' for anything outside the subset. */
export function parseProgram(source: string): Program {
  const raw = source.split('\n');
  const lines: SourceLine[] = [];
  raw.forEach((text, i) => {
    const n = i + 1;
    if (/\t/.test(text)) throw new PseudoError('syntax', 'Indent with spaces, not tabs.', n);
    if (!text.trim()) throw new PseudoError('syntax', 'Blank lines are not allowed: every line of a listing is numbered.', n);
    if (/\s$/.test(text)) throw new PseudoError('syntax', 'This line has trailing spaces.', n);
    const tokens = tokenise(text, n);
    if (!tokens.length) return; // A comment line: numbered, but not a statement.
    lines.push({ n, indent: text.length - text.trimStart().length, tokens });
  });
  return new Parser(lines).program(source, raw.length);
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

export function isReal(v: Value): v is Real {
  return v instanceof Real;
}

export function isNumber(v: Value): v is number | Real {
  return typeof v === 'number' || v instanceof Real;
}

function num(v: number | Real): number {
  return typeof v === 'number' ? v : v.value;
}

/** A floating point number as text: always with a decimal point, never with binary noise. */
export function formatReal(x: number): string {
  if (Number.isInteger(x)) return `${x}.0`;
  const s = x.toFixed(10).replace(/0+$/, '');
  return s.endsWith('.') ? `${s}0` : s;
}

/** How DISPLAY shows a value: integers plainly, floating point with a decimal point, TRUE/FALSE, arrays in brackets. */
export function formatValue(v: Value): string {
  if (typeof v === 'number') return String(v);
  if (v instanceof Real) return formatReal(v.value);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'string') return v;
  return `[${v.map((x) => (typeof x === 'string' ? `"${x}"` : formatValue(x))).join(', ')}]`;
}

export function typeName(v: Value): string {
  if (typeof v === 'number') return 'an integer';
  if (v instanceof Real) return 'a floating point number';
  if (typeof v === 'boolean') return 'a Boolean';
  if (typeof v === 'string') return 'a string';
  return 'an array';
}

export function cloneValue(v: Value): Value {
  return Array.isArray(v) ? v.map(cloneValue) : v;
}

export function sameValue(a: Value, b: Value): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => sameValue(x, b[i]));
  }
  if (a instanceof Real || b instanceof Real) return a instanceof Real && b instanceof Real && a.value === b.value;
  return a === b;
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

export interface RunOptions {
  /** Index of the first element of every array (both dimensions of a 2D array). */
  indexBase: 0 | 1;
  /** Variables that exist before the listing runs, e.g. a 2D array shown as a table. Copied, never changed. */
  globals?: Readonly<Record<string, Value>>;
  /** Record a snapshot of the variables after every simple statement and every loop pass. */
  trace?: boolean;
  /** Statements and loop tests allowed before the run stops with a 'limit' error. Default 20,000. */
  maxSteps?: number;
  /** Smallest and largest integer a variable can hold; beyond them is an 'overflow' error. */
  intRange?: readonly [number, number];
}

export interface Snapshot {
  /** 'line': after the simple statement on `line` ran. 'iteration': after a loop body finished a pass. */
  kind: 'line' | 'iteration';
  line: number;
  /** For 'iteration': the pass number, from 1. */
  iteration?: number;
  /** 'main', or the function's name. */
  scope: string;
  vars: Record<string, Value>;
}

export interface RunResult {
  /** One entry per DISPLAY, as it would appear on screen. */
  output: string[];
  /** The value an entry function returned (callFunction only). */
  returned?: Value;
  /** Snapshots in execution order (only with `trace`). */
  trace: Snapshot[];
  /** How many times each line ran: simple statements, and IF, ELSEIF and loop tests. */
  lineCounts: Map<number, number>;
  steps: number;
}

class ReturnSignal {
  constructor(readonly value: Value) {}
}

interface Frame {
  scope: string;
  vars: Map<string, Value>;
  /** Loop variables of the FOR loops currently running. */
  loopVars: Set<string>;
  inFunction: boolean;
}

const DEFAULT_MAX_STEPS = 20_000;
const MAX_DEPTH = 64;

class Machine {
  readonly output: string[] = [];
  readonly trace: Snapshot[] = [];
  readonly lineCounts = new Map<number, number>();
  steps = 0;
  private depth = 0;
  private readonly base: 0 | 1;
  private readonly maxSteps: number;

  constructor(
    private readonly program: Program,
    private readonly opts: RunOptions,
  ) {
    this.base = opts.indexBase;
    this.maxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS;
  }

  private tick(line: number): void {
    this.lineCounts.set(line, (this.lineCounts.get(line) ?? 0) + 1);
    if (++this.steps > this.maxSteps) {
      throw new PseudoError('limit', `The program ran more than ${this.maxSteps.toLocaleString('en-AU')} steps, so it may never stop.`, line);
    }
  }

  private snap(frame: Frame, kind: Snapshot['kind'], line: number, iteration?: number): void {
    if (!this.opts.trace) return;
    const vars: Record<string, Value> = {};
    for (const [k, v] of frame.vars) vars[k] = cloneValue(v);
    this.trace.push(iteration === undefined ? { kind, line, scope: frame.scope, vars } : { kind, line, iteration, scope: frame.scope, vars });
  }

  newFrame(scope: string, inFunction: boolean, vars: Iterable<[string, Value]> = []): Frame {
    return { scope, vars: new Map(vars), loopVars: new Set(), inFunction };
  }

  exec(body: readonly Stmt[], frame: Frame): void {
    for (const s of body) this.stmt(s, frame);
  }

  private stmt(s: Stmt, frame: Frame): void {
    switch (s.k) {
      case 'assign': {
        this.tick(s.line);
        const value = this.eval(s.e, frame, s.line);
        this.assign(s.target, value, frame, s.line);
        this.snap(frame, 'line', s.line);
        return;
      }
      case 'display': {
        this.tick(s.line);
        const v = this.eval(s.e, frame, s.line);
        if (Array.isArray(v)) throw new PseudoError('type', 'DISPLAY shows one value; display the array one element at a time.', s.line);
        this.output.push(formatValue(v));
        this.snap(frame, 'line', s.line);
        return;
      }
      case 'return': {
        this.tick(s.line);
        if (!frame.inFunction) throw new PseudoError('return', 'RETURN only works inside a FUNCTION.', s.line);
        const v = this.eval(s.e, frame, s.line);
        this.snap(frame, 'line', s.line);
        throw new ReturnSignal(v);
      }
      case 'if': {
        for (const b of s.branches) {
          this.tick(b.line);
          if (b.cond === null || this.bool(b.cond, frame, b.line, 'IF')) {
            this.exec(b.body, frame);
            return;
          }
        }
        return;
      }
      case 'for':
        this.forLoop(s, frame);
        return;
      case 'while': {
        let pass = 0;
        for (;;) {
          this.tick(s.line);
          if (!this.bool(s.cond, frame, s.line, 'WHILE')) return;
          this.exec(s.body, frame);
          this.snap(frame, 'iteration', s.line, ++pass);
        }
      }
      case 'repeat': {
        let pass = 0;
        for (;;) {
          this.exec(s.body, frame);
          this.snap(frame, 'iteration', s.line, ++pass);
          this.tick(s.endLine);
          if (this.bool(s.cond, frame, s.endLine, 'UNTIL')) return;
        }
      }
    }
  }

  private forLoop(s: Extract<Stmt, { k: 'for' }>, frame: Frame): void {
    this.tick(s.line);
    const from = this.int(s.from, frame, s.line, 'The start of a FOR loop');
    const to = this.int(s.to, frame, s.line, 'The end of a FOR loop');
    const step = s.step ? this.int(s.step, frame, s.line, 'STEP') : 1;
    if (step === 0) throw new PseudoError('limit', 'STEP 0 would never reach the end of the loop.', s.line);
    if (frame.vars.has(s.v)) throw new PseudoError('name', `${s.v} is already in use, so it can't also be the FOR loop variable.`, s.line);
    frame.loopVars.add(s.v);
    let pass = 0;
    try {
      for (let i = from; step > 0 ? i <= to : i >= to; i += step) {
        frame.vars.set(s.v, i);
        this.exec(s.body, frame);
        this.snap(frame, 'iteration', s.line, ++pass);
        this.tick(s.line);
      }
    } finally {
      frame.loopVars.delete(s.v);
      frame.vars.delete(s.v);
    }
  }

  private assign(target: Target, value: Value, frame: Frame, line: number): void {
    if (frame.loopVars.has(target.name)) throw new PseudoError('name', `${target.name} is the FOR loop variable, so it can't be changed inside the loop.`, line);
    if (!target.indexes.length) {
      frame.vars.set(target.name, value);
      return;
    }
    let arr = this.lookup(target.name, frame, line);
    const idx = target.indexes.map((e) => this.eval(e, frame, line));
    for (let d = 0; d < idx.length; d++) {
      if (!Array.isArray(arr)) throw new PseudoError('type', `${target.name} isn't an array${d ? ' of arrays' : ''}, so it can't be indexed.`, line);
      const at = this.position(arr, idx[d], target.name, line);
      if (d === idx.length - 1) arr[at] = value;
      else arr = arr[at];
    }
  }

  private lookup(name: string, frame: Frame, line: number): Value {
    const v = frame.vars.get(name);
    if (v === undefined) {
      const hint = frame.inFunction ? ' Inside a function, only its parameters and its own variables exist.' : '';
      throw new PseudoError('name', `${name} is used before it is given a value.${hint}`, line);
    }
    return v;
  }

  private position(arr: Value[], index: Value, name: string, line: number): number {
    if (typeof index !== 'number') throw new PseudoError('type', `An array index must be an integer, not ${typeName(index)}.`, line);
    const at = index - this.base;
    if (at < 0 || at >= arr.length) {
      const range = arr.length ? `${this.base} to ${arr.length - 1 + this.base}` : 'none (it is empty)';
      throw new PseudoError('index', `Index ${index} is out of range for ${name}, whose indexes are ${range}.`, line);
    }
    return at;
  }

  private checkInt(v: number, line: number): number {
    const [lo, hi] = this.opts.intRange ?? [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
    if (v < lo || v > hi) {
      throw new PseudoError('overflow', `${v} is outside the integer range ${lo.toLocaleString('en-AU')} to ${hi.toLocaleString('en-AU')}.`, line);
    }
    return v;
  }

  private int(e: Expr, frame: Frame, line: number, what: string): number {
    const v = this.eval(e, frame, line);
    if (typeof v !== 'number') throw new PseudoError('type', `${what} must be an integer, not ${typeName(v)}.`, line);
    return v;
  }

  private bool(e: Expr, frame: Frame, line: number, what: string): boolean {
    const v = this.eval(e, frame, line);
    if (typeof v !== 'boolean') throw new PseudoError('type', `${what} needs a TRUE or FALSE condition, not ${typeName(v)}.`, line);
    return v;
  }

  eval(e: Expr, frame: Frame, line: number): Value {
    switch (e.k) {
      case 'lit':
        return e.v;
      case 'var':
        return this.lookup(e.name, frame, line);
      case 'array':
        return e.items.map((x) => this.eval(x, frame, line));
      case 'index': {
        const target = this.eval(e.target, frame, line);
        const index = this.eval(e.index, frame, line);
        const name = describeTarget(e.target);
        if (!Array.isArray(target)) throw new PseudoError('type', `${name} is ${typeName(target)}, not an array, so it can't be indexed.`, line);
        return target[this.position(target, index, name, line)];
      }
      case 'call':
        return this.call(e.name, e.args.map((a) => this.eval(a, frame, line)), line);
      case 'unary': {
        const v = this.eval(e.e, frame, line);
        if (e.op === 'NOT') {
          if (typeof v !== 'boolean') throw new PseudoError('type', `NOT needs TRUE or FALSE, not ${typeName(v)}.`, line);
          return !v;
        }
        if (typeof v === 'number') return this.checkInt(-v, line);
        if (v instanceof Real) return new Real(-v.value);
        throw new PseudoError('type', `Can't make ${typeName(v)} negative.`, line);
      }
      case 'bin':
        return this.binary(e.op, this.eval(e.l, frame, line), this.eval(e.r, frame, line), line);
    }
  }

  private binary(op: string, l: Value, r: Value, line: number): Value {
    const mismatch = (what: string) => new PseudoError('type', `${what} can't combine ${typeName(l)} with ${typeName(r)}.`, line);
    switch (op) {
      case 'AND':
      case 'OR':
        if (typeof l !== 'boolean' || typeof r !== 'boolean') throw mismatch(op);
        return op === 'AND' ? l && r : l || r;
      case '+':
        if (typeof l === 'string' || typeof r === 'string') {
          if (Array.isArray(l) || Array.isArray(r) || typeof l === 'boolean' || typeof r === 'boolean') throw mismatch('+');
          return `${formatValue(l)}${formatValue(r)}`;
        }
        return this.arith(op, l, r, line, mismatch);
      case '-':
      case '*':
        return this.arith(op, l, r, line, mismatch);
      case '/':
        if (!isNumber(l) || !isNumber(r)) throw mismatch('/');
        if (num(r) === 0) throw new PseudoError('divide-by-zero', 'Division by zero.', line);
        return new Real(num(l) / num(r));
      case 'DIV':
      case 'MOD':
        if (typeof l !== 'number' || typeof r !== 'number') {
          if (isNumber(l) && isNumber(r)) throw new PseudoError('type', `${op} works on integers only.`, line);
          throw mismatch(op);
        }
        if (r === 0) throw new PseudoError('divide-by-zero', `${op} by zero.`, line);
        return op === 'DIV' ? this.checkInt(Math.floor(l / r), line) : this.checkInt(l - r * Math.floor(l / r), line);
      case '=':
      case '≠': {
        if (Array.isArray(l) || Array.isArray(r)) throw new PseudoError('type', 'Compare arrays one element at a time.', line);
        const comparable = (isNumber(l) && isNumber(r)) || typeof l === typeof r;
        if (!comparable) throw mismatch(op);
        const equal = isNumber(l) && isNumber(r) ? num(l) === num(r) : l === r;
        return op === '=' ? equal : !equal;
      }
      case '<':
      case '≤':
      case '>':
      case '≥': {
        if (!isNumber(l) || !isNumber(r)) throw mismatch(op);
        const a = num(l);
        const b = num(r);
        return op === '<' ? a < b : op === '≤' ? a <= b : op === '>' ? a > b : a >= b;
      }
      default:
        throw new PseudoError('syntax', `Unknown operator ${op}.`, line);
    }
  }

  private arith(op: string, l: Value, r: Value, line: number, mismatch: (what: string) => PseudoError): Value {
    if (!isNumber(l) || !isNumber(r)) throw mismatch(op);
    const a = num(l);
    const b = num(r);
    const out = op === '+' ? a + b : op === '-' ? a - b : a * b;
    if (typeof l === 'number' && typeof r === 'number') return this.checkInt(out, line);
    return new Real(out);
  }

  call(name: string, args: Value[], line: number): Value {
    if (name === 'LENGTH') {
      if (args.length !== 1) throw new PseudoError('type', 'LENGTH takes one value.', line);
      const [v] = args;
      if (typeof v === 'string' || Array.isArray(v)) return v.length;
      throw new PseudoError('type', `LENGTH needs a string or an array, not ${typeName(v)}.`, line);
    }
    const fn = this.program.functions.get(name);
    if (!fn) throw new PseudoError('name', `There is no function called ${name}.`, line);
    if (args.length !== fn.params.length) {
      throw new PseudoError('type', `${name} takes ${fn.params.length} ${fn.params.length === 1 ? 'value' : 'values'}, but ${args.length} ${args.length === 1 ? 'was' : 'were'} given.`, line);
    }
    if (++this.depth > MAX_DEPTH) throw new PseudoError('limit', 'Too many nested function calls.', line);
    try {
      const frame = this.newFrame(name, true, fn.params.map((p, i) => [p, args[i]] as [string, Value]));
      try {
        this.exec(fn.body, frame);
      } catch (signal) {
        if (signal instanceof ReturnSignal) return signal.value;
        throw signal;
      }
      throw new PseudoError('return', `${name} reached ENDFUNCTION without a RETURN.`, fn.endLine);
    } finally {
      this.depth--;
    }
  }
}

function describeTarget(e: Expr): string {
  if (e.k === 'var') return e.name;
  if (e.k === 'index') return `${describeTarget(e.target)}[...]`;
  return 'the value';
}

function result(m: Machine, returned?: Value): RunResult {
  const out: RunResult = { output: m.output, trace: m.trace, lineCounts: m.lineCounts, steps: m.steps };
  if (returned !== undefined) out.returned = returned;
  return out;
}

function globalsFrame(m: Machine, opts: RunOptions) {
  return m.newFrame(
    'main',
    false,
    Object.entries(opts.globals ?? {}).map(([k, v]) => [k, cloneValue(v)] as [string, Value]),
  );
}

/** Runs the listing's BEGIN ... END block. Throws PseudoError on any runtime error. */
export function runProgram(program: Program, opts: RunOptions): RunResult {
  if (!program.main) throw new PseudoError('syntax', 'This listing has no BEGIN block to run.');
  const m = new Machine(program, opts);
  m.exec(program.main, globalsFrame(m, opts));
  return result(m);
}

/** Calls one of the listing's functions with the given arguments (copied first) and returns what it returned. */
export function callFunction(program: Program, name: string, args: readonly Value[], opts: RunOptions): RunResult {
  const m = new Machine(program, opts);
  const returned = m.call(name, args.map(cloneValue), 0);
  return result(m, returned);
}

/** Parses and runs in one step: the BEGIN block, or `call` when given. */
export function run(source: string, opts: RunOptions & { call?: { name: string; args: readonly Value[] } }): RunResult {
  const program = parseProgram(source);
  return opts.call ? callFunction(program, opts.call.name, opts.call.args, opts) : runProgram(program, opts);
}

/** The snapshot taken after `line` ran for the `occurrence`-th time (from 1), or null. */
export function afterLine(r: RunResult, line: number, occurrence = 1): Snapshot | null {
  let seen = 0;
  for (const s of r.trace) {
    if (s.kind === 'line' && s.line === line && ++seen === occurrence) return s;
  }
  return null;
}

/**
 * The snapshot at the end of pass `iteration` (from 1) of the loop whose header (or REPEAT) is on
 * `loopLine`. For a loop that runs more than once (nested inside another), `occurrence` picks
 * which run of the loop.
 */
export function afterIteration(r: RunResult, loopLine: number, iteration: number, occurrence = 1): Snapshot | null {
  let runs = 0;
  for (const s of r.trace) {
    if (s.kind !== 'iteration' || s.line !== loopLine) continue;
    if (s.iteration === 1) runs++;
    if (runs === occurrence && s.iteration === iteration) return s;
  }
  return null;
}

/** How many times a line ran. */
export function timesRun(r: RunResult, line: number): number {
  return r.lineCounts.get(line) ?? 0;
}
