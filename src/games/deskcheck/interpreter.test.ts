import { describe, expect, it } from 'vitest';
import {
  afterIteration,
  afterLine,
  callFunction,
  formatReal,
  formatValue,
  parseProgram,
  PseudoError,
  Real,
  run,
  runProgram,
  sameValue,
  timesRun,
  type PseudoErrorKind,
  type RunOptions,
  type Value,
} from './interpreter';

const base0: RunOptions = { indexBase: 0 };
const base1: RunOptions = { indexBase: 1 };

/** Builds a BEGIN ... END listing from statement lines already indented one level. */
function main(...lines: string[]): string {
  return ['BEGIN', ...lines.map((l) => `    ${l}`), 'END'].join('\n');
}

function output(source: string, opts: RunOptions = base0): string[] {
  return run(source, opts).output;
}

function fails(source: string, kind: PseudoErrorKind, opts: RunOptions = base0): PseudoError {
  try {
    run(source, opts);
  } catch (e) {
    expect(e).toBeInstanceOf(PseudoError);
    expect((e as PseudoError).kind).toBe(kind);
    return e as PseudoError;
  }
  throw new Error(`expected a ${kind} error`);
}

describe('statements', () => {
  it('assigns with ← and displays values and joined strings', () => {
    expect(output(main('total ← 4', 'total ← total + 3', 'DISPLAY total', 'DISPLAY "Total is " + total'))).toEqual(['7', 'Total is 7']);
  });

  it('runs IF, ELSEIF and ELSE branches in order and only the first TRUE one', () => {
    const src = (x: number) =>
      main(`x ← ${x}`, 'IF x ≥ 80 THEN', '    DISPLAY "A"', 'ELSEIF x > 64 THEN', '    DISPLAY "B"', 'ELSEIF x ≥ 60 THEN', '    DISPLAY "C"', 'ELSE', '    DISPLAY "D"', 'ENDIF');
    expect([80, 79, 65, 64, 60, 59].map((x) => output(src(x))[0])).toEqual(['A', 'B', 'B', 'C', 'C', 'D']);
    expect(output(main('x ← 1', 'IF x = 2 THEN', '    DISPLAY "two"', 'ENDIF', 'DISPLAY "done"'))).toEqual(['done']);
  });

  it('runs FOR loops with inclusive bounds, STEP and zero passes', () => {
    expect(output(main('FOR i ← 1 TO 3', '    DISPLAY i', 'ENDFOR'))).toEqual(['1', '2', '3']);
    expect(output(main('FOR i ← 3 TO 1 STEP -1', '    DISPLAY i', 'ENDFOR'))).toEqual(['3', '2', '1']);
    expect(output(main('FOR i ← 1 TO 8 STEP 3', '    DISPLAY i', 'ENDFOR'))).toEqual(['1', '4', '7']);
    expect(output(main('FOR i ← 5 TO 4', '    DISPLAY i', 'ENDFOR', 'DISPLAY "after"'))).toEqual(['after']);
  });

  it('evaluates FOR bounds once and ends the loop variable with the loop', () => {
    expect(output(main('n ← 3', 'FOR i ← 1 TO n', '    n ← 10', 'ENDFOR', 'DISPLAY n'))).toEqual(['10']);
    fails(main('FOR i ← 1 TO 2', '    x ← i', 'ENDFOR', 'DISPLAY i'), 'name');
    fails(main('FOR i ← 1 TO 2', '    i ← 5', 'ENDFOR'), 'name');
    fails(main('i ← 0', 'FOR i ← 1 TO 2', '    x ← i', 'ENDFOR'), 'name');
    expect(output(main('FOR i ← 1 TO 2', '    x ← i', 'ENDFOR', 'FOR i ← 3 TO 4', '    x ← x + i', 'ENDFOR', 'DISPLAY x'))).toEqual(['9']);
  });

  it('tests WHILE before each pass and REPEAT after each pass', () => {
    expect(output(main('n ← 10', 'count ← 0', 'WHILE n < 5 DO', '    count ← count + 1', 'ENDWHILE', 'DISPLAY count'))).toEqual(['0']);
    expect(output(main('n ← 10', 'count ← 0', 'REPEAT', '    count ← count + 1', 'UNTIL n > 5', 'DISPLAY count'))).toEqual(['1']);
    expect(output(main('n ← 1', 'WHILE n < 50 DO', '    n ← n * 3', 'ENDWHILE', 'DISPLAY n'))).toEqual(['81']);
  });

  it('calls functions with parameters, local variables and RETURN', () => {
    const src = [
      'FUNCTION larger(a, b)',
      '    IF a > b THEN',
      '        RETURN a',
      '    ENDIF',
      '    RETURN b',
      'ENDFUNCTION',
      'BEGIN',
      '    x ← larger(3, 9) + larger(8, 2)',
      '    DISPLAY x',
      'END',
    ].join('\n');
    expect(output(src)).toEqual(['17']);
    const program = parseProgram(src);
    expect(callFunction(program, 'larger', [4, 4], base0).returned).toBe(4);
  });

  it('keeps function variables local and passes arrays in', () => {
    const src = ['FUNCTION total(values)', '    sum ← 0', '    FOR i ← 1 TO LENGTH(values)', '        sum ← sum + values[i]', '    ENDFOR', '    RETURN sum', 'ENDFUNCTION'].join('\n');
    expect(callFunction(parseProgram(src), 'total', [[4, 8, 15]], base1).returned).toBe(27);
    const leaky = ['FUNCTION f(a)', '    RETURN a + outside', 'ENDFUNCTION', 'BEGIN', '    outside ← 1', '    DISPLAY f(2)', 'END'].join('\n');
    expect(fails(leaky, 'name').message).toContain('Inside a function');
  });

  it('ignores comments but still numbers their lines', () => {
    const src = ['BEGIN', '    // the running total', '    total ← 5', 'END'].join('\n');
    const r = run(src, { ...base0, trace: true });
    expect(afterLine(r, 3)?.vars.total).toBe(5);
    expect(output(main('x ← 2 // two', 'DISPLAY x'))).toEqual(['2']);
  });
});

describe('expressions', () => {
  it('does integer arithmetic with MOD and DIV rounding down', () => {
    expect(output(main('DISPLAY 17 MOD 5', 'DISPLAY 17 DIV 5', 'DISPLAY -7 DIV 2', 'DISPLAY 2 + 3 * 4', 'DISPLAY (2 + 3) * 4', 'DISPLAY 10 - 4 - 3'))).toEqual([
      '2',
      '3',
      '-4',
      '14',
      '20',
      '3',
    ]);
  });

  it('gives floating point results from / and decimal literals, shown with a decimal point', () => {
    expect(output(main('DISPLAY 7 / 2', 'DISPLAY 6 / 2', 'DISPLAY 1.5 + 1', 'DISPLAY 0.1 + 0.2'))).toEqual(['3.5', '3.0', '2.5', '0.3']);
    const r = run(main('x ← 9 / 4'), { ...base0, trace: true });
    expect(afterLine(r, 2)?.vars.x).toEqual(new Real(2.25));
    expect(formatReal(12)).toBe('12.0');
    expect(formatReal(3.125)).toBe('3.125');
  });

  it('compares with = ≠ < ≤ > ≥ and combines with AND, OR and NOT', () => {
    const lines = ['DISPLAY 3 = 3', 'DISPLAY 3 ≠ 3', 'DISPLAY 2 < 3', 'DISPLAY 3 ≤ 3', 'DISPLAY 3 > 3', 'DISPLAY 3 ≥ 3', 'DISPLAY "a" = "a"', 'DISPLAY 2.0 = 2'];
    expect(output(main(...lines))).toEqual(['TRUE', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'TRUE', 'TRUE']);
    expect(output(main('DISPLAY 1 < 2 AND 2 < 1', 'DISPLAY 1 < 2 OR 2 < 1', 'DISPLAY NOT 1 = 2', 'DISPLAY NOT TRUE OR TRUE'))).toEqual(['FALSE', 'TRUE', 'TRUE', 'TRUE']);
  });

  it('evaluates both sides of AND and OR, so listings never rely on short-circuiting', () => {
    fails(main('a ← [1, 2]', 'i ← 2', 'IF i < 2 AND a[i] > 0 THEN', '    DISPLAY i', 'ENDIF'), 'index');
  });

  it('joins strings with + and measures strings and arrays with LENGTH', () => {
    expect(output(main('name ← "Mia"', 'DISPLAY name + " " + "Tran"', 'DISPLAY LENGTH(name + "7")', 'DISPLAY LENGTH([3, 1, 2])', 'DISPLAY "Room " + (2 * 100 + 4)'))).toEqual([
      'Mia Tran',
      '4',
      '3',
      'Room 204',
    ]);
  });
});

describe('arrays', () => {
  it('indexes one-dimensional arrays from the stated base', () => {
    expect(output(main('a ← [4, 8, 15]', 'DISPLAY a[0] + a[2]'), base0)).toEqual(['19']);
    expect(output(main('a ← [4, 8, 15]', 'DISPLAY a[1] + a[3]'), base1)).toEqual(['19']);
  });

  it('reads and writes two-dimensional arrays by row, then column', () => {
    const grid = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    expect(output(main('DISPLAY grid[1][2]'), { indexBase: 0, globals: { grid } })).toEqual(['6']);
    expect(output(main('DISPLAY grid[1][2]'), { indexBase: 1, globals: { grid } })).toEqual(['2']);
    expect(output(main('grid[2][3] ← 0', 'DISPLAY grid[2][3] + grid[2][1]'), { indexBase: 1, globals: { grid } })).toEqual(['4']);
    expect(grid[1][2]).toBe(6);
  });

  it('changes elements in place and reports indexes out of range for either base', () => {
    expect(output(main('a ← [1, 2, 3]', 'a[1] ← 9', 'DISPLAY a[1] + a[0]'))).toEqual(['10']);
    expect(fails(main('a ← [1, 2, 3]', 'DISPLAY a[3]'), 'index').message).toBe('Line 3: Index 3 is out of range for a, whose indexes are 0 to 2.');
    expect(fails(main('a ← [1, 2, 3]', 'DISPLAY a[0]'), 'index', base1).message).toContain('indexes are 1 to 3');
    fails(main('a ← [1, 2, 3]', 'a[4] ← 1'), 'index', base1);
    fails(main('a ← [1, 2, 3]', 'DISPLAY a[1.0]'), 'type');
  });
});

describe('snapshots and line counts', () => {
  const src = main('total ← 0', 'FOR i ← 1 TO 4', '    total ← total + i', 'ENDFOR', 'DISPLAY total');

  it('gives the variables after a line runs for the nth time', () => {
    const r = run(src, { ...base0, trace: true });
    expect(afterLine(r, 4, 1)?.vars).toEqual({ total: 1, i: 1 });
    expect(afterLine(r, 4, 3)?.vars.total).toBe(6);
    expect(afterLine(r, 4, 5)).toBeNull();
    expect(timesRun(r, 4)).toBe(4);
  });

  it('gives the variables at the end of each loop pass, for every kind of loop', () => {
    const r = run(src, { ...base0, trace: true });
    expect(afterIteration(r, 3, 2)?.vars).toEqual({ total: 3, i: 2 });
    expect(afterIteration(r, 3, 5)).toBeNull();
    const w = run(main('n ← 1', 'WHILE n < 20 DO', '    n ← n * 2', 'ENDWHILE'), { ...base0, trace: true });
    expect(afterIteration(w, 3, 3)?.vars.n).toBe(8);
    const rep = run(main('n ← 5', 'REPEAT', '    n ← n - 2', 'UNTIL n < 0'), { ...base0, trace: true });
    expect(afterIteration(rep, 3, 2)?.vars.n).toBe(1);
  });

  it('picks a run of an inner loop by occurrence', () => {
    const nested = main('FOR i ← 1 TO 2', '    FOR j ← 1 TO 3', '        x ← i * 10 + j', '    ENDFOR', 'ENDFOR');
    const r = run(nested, { ...base0, trace: true });
    expect(afterIteration(r, 3, 2, 1)?.vars.x).toBe(12);
    expect(afterIteration(r, 3, 2, 2)?.vars.x).toBe(22);
  });

  it('snapshots copies, so later changes to an array do not rewrite history', () => {
    const r = run(main('a ← [1, 2]', 'a[0] ← 5', 'a[0] ← 7'), { ...base0, trace: true });
    expect(afterLine(r, 3)?.vars.a).toEqual([5, 2]);
    expect(afterLine(r, 4)?.vars.a).toEqual([7, 2]);
  });

  it('records nothing without trace, but still counts lines', () => {
    const r = run(src, base0);
    expect(r.trace).toEqual([]);
    expect(timesRun(r, 4)).toBe(4);
    expect(r.output).toEqual(['10']);
  });
});

describe('errors outside the subset', () => {
  it.each([
    ['an unknown keyword', main('x ← 1', 'ENDFRO'), "ENDFRO isn't a keyword"],
    ['INPUT', main('INPUT age'), "INPUT isn't a keyword"],
    ['an ASCII arrow', main('x <- 1'), 'Write ← rather than <-'],
    ['an ASCII comparison', main('IF 1 <= 2 THEN', '    x ← 1', 'ENDIF'), 'Write ≤ rather than <='],
    ['a missing ENDIF', main('IF 1 < 2 THEN', '    x ← 1'), 'ENDIF is missing: the IF must close before this END'],
    ['a stray ENDFOR', main('x ← 1', 'ENDFOR'), "ENDFOR doesn't match an open FOR"],
    ['a missing closing quote', main('DISPLAY "hi'), 'missing its closing quote'],
    ['chained comparisons', main('x ← 1 < 2 < 3'), 'Join two comparisons'],
    ['a blank line', 'BEGIN\n\n    x ← 1\nEND', 'Blank lines are not allowed'],
    ['wrong indentation', 'BEGIN\n  x ← 1\nEND', 'indented 4 spaces'],
    ['a tab', 'BEGIN\n\tx ← 1\nEND', 'not tabs'],
    ['trailing spaces', 'BEGIN\n    x ← 1 \nEND', 'trailing spaces'],
    ['a name that is not camelCase', main('Total ← 1'), 'camelCase'],
    ['assigning to a literal', main('0 ← total'), "can't start with 0"],
    ['a bare function call', main('f(1)'), 'does nothing'],
    ['a statement outside BEGIN', 'x ← 1', 'starts with BEGIN or FUNCTION'],
    ['ELSEIF after ELSE', main('IF 1 < 2 THEN', '    x ← 1', 'ELSE', '    x ← 2', 'ELSEIF 1 > 2 THEN', '    x ← 3', 'ENDIF'), "can't follow ELSE"],
    ['a missing THEN', main('IF 1 < 2', '    x ← 1', 'ENDIF'), 'Expected THEN'],
    ['a missing DO', main('WHILE 1 < 2', '    x ← 1', 'ENDWHILE'), 'Expected DO'],
  ])('rejects %s with a syntax error and its line', (_label, source, message) => {
    const e = fails(source, 'syntax');
    expect(e.message).toContain(message);
    expect(e.line).toBeGreaterThan(0);
  });

  it('reports runtime errors by kind', () => {
    expect(fails(main('DISPLAY total'), 'name').message).toBe('Line 2: total is used before it is given a value.');
    fails(main('quantity ← "ten"', 'DISPLAY quantity * 2'), 'type');
    fails(main('IF 1 THEN', '    x ← 1', 'ENDIF'), 'type');
    fails(main('DISPLAY "5" > 3'), 'type');
    fails(main('DISPLAY TRUE + 1'), 'type');
    fails(main('DISPLAY 7.5 DIV 2'), 'type');
    fails(main('count ← 0', 'DISPLAY 10 / count'), 'divide-by-zero');
    fails(main('DISPLAY 10 DIV 0'), 'divide-by-zero');
    fails(main('DISPLAY 10 MOD 0'), 'divide-by-zero');
    fails(main('RETURN 1'), 'return');
    fails(['FUNCTION f(a)', '    x ← a', 'ENDFUNCTION', 'BEGIN', '    DISPLAY f(1)', 'END'].join('\n'), 'return');
    fails(['FUNCTION f(a)', '    RETURN a', 'ENDFUNCTION', 'BEGIN', '    DISPLAY f(1, 2)', 'END'].join('\n'), 'type');
    fails(main('DISPLAY g(1)'), 'name');
    fails(main('DISPLAY [1, 2]'), 'type');
  });

  it('raises overflow beyond the stated integer range', () => {
    const src = main('points ← 0', 'FOR r ← 1 TO 5', '    points ← points + 9000', 'ENDFOR');
    const e = fails(src, 'overflow', { indexBase: 0, intRange: [-32768, 32767] });
    expect(e.line).toBe(4);
    expect(run(src, base0).output).toEqual([]);
  });

  it('stops runaway loops at the step limit', () => {
    const e = fails(main('x ← 1', 'WHILE x > 0 DO', '    x ← x + 1', 'ENDWHILE'), 'limit');
    expect(e.message).toContain('may never stop');
    fails(main('x ← 0', 'FOR i ← 1 TO 3 STEP 0', '    x ← 1', 'ENDFOR'), 'limit');
    fails(['FUNCTION f(n)', '    RETURN f(n + 1)', 'ENDFUNCTION', 'BEGIN', '    DISPLAY f(1)', 'END'].join('\n'), 'limit');
  });

  it('refuses to run a listing without the part asked for', () => {
    const fnOnly = parseProgram(['FUNCTION f(a)', '    RETURN a', 'ENDFUNCTION'].join('\n'));
    expect(() => runProgram(fnOnly, base0)).toThrow(PseudoError);
    expect(() => parseProgram('')).toThrow(PseudoError);
  });
});

describe('values', () => {
  it('formats values the way DISPLAY shows them', () => {
    const cases: [Value, string][] = [
      [7, '7'],
      [new Real(7), '7.0'],
      [new Real(2.5), '2.5'],
      [true, 'TRUE'],
      ['Mia', 'Mia'],
      [[1, 2], '[1, 2]'],
      [['a', 'b'], '["a", "b"]'],
    ];
    for (const [v, s] of cases) expect(formatValue(v)).toBe(s);
  });

  it('compares values by type as well as size', () => {
    expect(sameValue(7, 7)).toBe(true);
    expect(sameValue(7, new Real(7))).toBe(false);
    expect(sameValue(new Real(2.5), new Real(2.5))).toBe(true);
    expect(sameValue([1, [2]], [1, [2]])).toBe(true);
    expect(sameValue([1, 2], [1])).toBe(false);
  });
});
