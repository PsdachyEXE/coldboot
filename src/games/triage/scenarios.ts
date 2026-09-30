/**
 * The `triage` scenario bank. Each template builds one error case from a seeded PRNG, either as a
 * short pseudocode listing or as a plain-language description, together with its classification,
 * a one-line reason and the debugging technique that suits it best.
 *
 * Listings are checked by the deskcheck interpreter (the tests run every seed): a syntax case
 * must fail to parse, a runtime case must stop with the named runtime error on the line the story
 * gives, and a logic case must run without error and display something different from its
 * corrected listing. Numbers quoted in a story come from running the listing, never from the
 * template.
 */
import { pick, randInt, sample, shuffle, type Rng } from '../prng';
import type { Difficulty } from '../types';
import { formatValue, PseudoError, run, type RunOptions } from '../deskcheck/interpreter';
import { Listing, literal } from '../deskcheck/listing';

export type ErrorType = 'syntax' | 'logic' | 'runtime';
export type RuntimeKind = 'overflow' | 'index' | 'type' | 'divide';
export type Technique = 'breakpoint' | 'output' | 'comment';

export interface Classification {
  type: ErrorType;
  kind?: RuntimeKind;
}

export interface ScenarioCode {
  source: string;
  indexBase?: 0 | 1;
  intRange?: readonly [number, number];
}

export interface Scenario {
  template: string;
  classification: Classification;
  /** What happens, in plain language (one or two sentences). */
  story: string;
  code?: ScenarioCode;
  /** The corrected listing, for logic cases. */
  fixed?: string;
  /** One line on why the classification is right. */
  why: string;
  technique: {
    answer: Technique;
    /** What the programmer wants to find out, written so that one technique fits best. */
    need: string;
    why: string;
  };
}

export const RUNTIME_LABELS: Record<RuntimeKind, string> = {
  overflow: 'overflow',
  index: 'index out of range',
  type: 'type mismatch',
  divide: 'divide by zero',
};

export const TECHNIQUE_LABELS: Record<Technique, string> = {
  breakpoint: 'breakpoint',
  output: 'debugging output statement',
  comment: 'commenting out code',
};

const TECHNIQUE_WHY: Record<Technique, string> = {
  breakpoint: 'A breakpoint pauses the program at a chosen line, so you can inspect the variables at that moment and step on line by line.',
  output: 'Debugging output statements display values while the program keeps running, giving a record of how they change on every pass.',
  comment: 'Commenting out code stops those lines running without deleting them, so you can see whether the problem goes away without them.',
};

const PEOPLE = ['Priya', 'Tomas', 'Aisha', 'Jack', 'Mei', 'Liam', 'Hannah', 'Kofi', 'Sienna', 'Ravi', 'Chloe', 'Daniel'];

function technique(answer: Technique, need: string): Scenario['technique'] {
  return { answer, need, why: TECHNIQUE_WHY[answer] };
}

/** The runtime error a listing stops with, or null if it runs to the end. */
export function runtimeError(code: ScenarioCode): PseudoError | null {
  try {
    run(code.source, runOptions(code));
    return null;
  } catch (e) {
    if (e instanceof PseudoError && e.kind !== 'syntax') return e;
    throw e;
  }
}

export function runOptions(code: ScenarioCode): RunOptions {
  return { indexBase: code.indexBase ?? 0, intRange: code.intRange };
}

function outputOf(source: string, base: 0 | 1 = 0): string {
  return run(source, { indexBase: base }).output.join(', ');
}

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

// ---------------------------------------------------------------------------
// Syntax errors
// ---------------------------------------------------------------------------

const MISSPELT: Record<string, readonly string[]> = {
  ENDFOR: ['ENDFRO', 'ENFOR', 'ENDFR'],
  ENDIF: ['ENDFI', 'ENIDF', 'EDNIF'],
  DISPLAY: ['DISPALY', 'DSIPLAY', 'DIPSLAY'],
  ENDWHILE: ['ENDWHIEL', 'ENDWILE'],
};

/** A small correct listing, returned line by line so one line can be broken. */
function totalListing(rng: Rng, base: 0 | 1): { lines: string[]; name: string } {
  const n = randInt(rng, 4, 6);
  const name = pick(rng, ['scores', 'prices', 'laps', 'sales']);
  const L = new Listing();
  L.open('BEGIN');
  L.line(`${name} ← ${literal(sample(rng, range(2, 40), n))}`);
  L.line('total ← 0');
  L.open(`FOR i ← ${base} TO ${n - 1 + base}`);
  L.open(`IF ${name}[i] > ${randInt(rng, 5, 20)} THEN`);
  L.line(`total ← total + ${name}[i]`);
  L.close('ENDIF');
  L.close('ENDFOR');
  L.line('DISPLAY total');
  L.close('END');
  return { lines: L.lines, name };
}

function misspeltKeyword(rng: Rng, d: Difficulty): Scenario {
  const base = pick(rng, [0, 1] as const);
  const { lines } = totalListing(rng, base);
  const candidates = lines.flatMap((l, i) => {
    const word = l.trim().split(' ')[0];
    return MISSPELT[word] ? [{ i, word }] : [];
  });
  const { i, word } = pick(rng, candidates);
  lines[i] = lines[i].replace(word, pick(rng, MISSPELT[word]));
  const who = pick(rng, PEOPLE);
  const where = d === 'hard' ? '' : ` The translator reports a problem on line ${i + 1}.`;
  return {
    template: 'misspelt-keyword',
    classification: { type: 'syntax' },
    story: `${who}'s program won't start at all.${where}`,
    code: { source: lines.join('\n'), indexBase: base },
    why: `${word} is misspelt on line ${i + 1}, so the program breaks the rules of the language and can't be translated: a syntax error.`,
    technique: technique('comment', 'you want to find which part of a long program stops it from being translated, by leaving sections out one at a time'),
  };
}

function missingEnd(rng: Rng): Scenario {
  const base = pick(rng, [0, 1] as const);
  const { lines } = totalListing(rng, base);
  const target = pick(rng, ['ENDIF', 'ENDFOR']);
  const at = lines.findIndex((l) => l.trim() === target);
  lines.splice(at, 1);
  const who = pick(rng, PEOPLE);
  return {
    template: 'missing-end',
    classification: { type: 'syntax' },
    story: `${who}'s program won't start. The translator says a block was never closed.`,
    code: { source: lines.join('\n'), indexBase: base },
    why: `The ${target === 'ENDIF' ? 'IF' : 'FOR'} block has no ${target}, so the structure breaks the rules of the language: a syntax error.`,
    technique: technique('comment', 'you want to find which block is left open by temporarily leaving blocks out until the program is translated again'),
  };
}

function unclosedString(rng: Rng, d: Difficulty): Scenario {
  const L = new Listing();
  L.open('BEGIN');
  L.line(`count ← ${randInt(rng, 2, 9)}`);
  L.line(`price ← ${randInt(rng, 3, 20)}`);
  L.line('total ← count * price');
  const line = L.line(pick(rng, ['DISPLAY "Total due: + total', 'DISPLAY "Amount owing + total', 'DISPLAY "Your total is + total']));
  L.close('END');
  const who = pick(rng, PEOPLE);
  return {
    template: 'unclosed-string',
    classification: { type: 'syntax' },
    story: `${who}'s program won't run.${d === 'hard' ? '' : ` The editor highlights line ${line}.`}`,
    code: { source: L.code },
    why: `The string on line ${line} opens with a quotation mark but never closes, which breaks the rules of the language: a syntax error.`,
    technique: technique('comment', 'you want to confirm the rest of the program runs by stopping the highlighted line from running, without deleting it'),
  };
}

function unbalancedBracket(rng: Rng): Scenario {
  const L = new Listing();
  L.open('BEGIN');
  const a = randInt(rng, 10, 90);
  const b = randInt(rng, 10, 90);
  L.line(`first ← ${a}`);
  L.line(`second ← ${b}`);
  const line = L.line('average ← (first + second / 2');
  L.line('DISPLAY average');
  L.close('END');
  const who = pick(rng, PEOPLE);
  return {
    template: 'unbalanced-bracket',
    classification: { type: 'syntax' },
    story: `${who}'s program won't start. The translator reports that line ${line} ends unexpectedly.`,
    code: { source: L.code },
    why: `Line ${line} opens a bracket that is never closed, so the statement isn't valid in the language: a syntax error.`,
    technique: technique('comment', 'you want to check whether the rest of the program is translated once line ' + line + ' is stopped from running'),
  };
}

const PLAIN_SYNTAX: readonly ((who: string, n: number) => Pick<Scenario, 'story' | 'why'>)[] = [
  (who, n) => ({
    story: `${who} typed retrun instead of return on line ${n}. The editor underlines it and the program won't run.`,
    why: 'A misspelt keyword breaks the rules of the language, so the program can’t be translated: a syntax error.',
  }),
  (who, n) => ({
    story: `${who}'s program won't start because a function call on line ${n} is missing its closing bracket.`,
    why: 'A missing bracket makes the statement invalid in the language: a syntax error, found before the program runs.',
  }),
  (who, n) => ({
    story: `The translator stops at line ${n} of ${who}'s program because an IF statement has no matching ENDIF.`,
    why: 'An unclosed block breaks the structure the language requires, so it is a syntax error.',
  }),
];

function plainSyntax(rng: Rng): Scenario {
  const make = pick(rng, PLAIN_SYNTAX);
  return {
    template: `plain-syntax-${PLAIN_SYNTAX.indexOf(make) + 1}`,
    classification: { type: 'syntax' },
    ...make(pick(rng, PEOPLE), randInt(rng, 5, 40)),
    technique: technique('comment', 'you want to narrow down which section stops the program from being translated by temporarily switching sections off'),
  };
}

// ---------------------------------------------------------------------------
// Logic errors (the listing runs, but gives the wrong result)
// ---------------------------------------------------------------------------

function wrongComparison(rng: Rng): Scenario {
  const pass = pick(rng, [40, 45, 50, 60, 65, 70]);
  let test = 0;
  const build = (op: string) => {
    const L = new Listing();
    L.open('BEGIN');
    L.line(`mark ← ${pass}`);
    test = L.open(`IF mark ${op} ${pass} THEN`);
    L.line('DISPLAY "Pass"');
    L.middle('ELSE');
    L.line('DISPLAY "Fail"');
    L.close('ENDIF');
    L.close('END');
    return L.code;
  };
  const source = build('>');
  const fixed = build('≥');
  return {
    template: 'wrong-comparison',
    classification: { type: 'logic' },
    story: `A mark of ${pass} or more is a pass. The program runs without an error, but for a mark of exactly ${pass} it displays ${outputOf(source)} instead of ${outputOf(fixed)}.`,
    code: { source },
    fixed,
    why: `The program runs but gives the wrong result, so it is a logic error: > leaves out a mark of exactly ${pass}, where ≥ was needed.`,
    technique: technique('breakpoint', `you want to pause the program at line ${test} when mark is ${pass} and check which branch it takes next`),
  };
}

function shortLoop(rng: Rng): Scenario {
  const base = pick(rng, [0, 1] as const);
  const n = randInt(rng, 4, 6);
  const values = sample(rng, range(5, 30), n);
  const build = (last: number) => {
    const L = new Listing();
    L.open('BEGIN');
    L.line(`scores ← ${literal(values)}`);
    L.line('total ← 0');
    L.open(`FOR i ← ${base} TO ${last}`);
    L.line('total ← total + scores[i]');
    L.close('ENDFOR');
    L.line('DISPLAY total');
    L.close('END');
    return L.code;
  };
  const source = build(n - 2 + base);
  const fixed = build(n - 1 + base);
  return {
    template: 'short-loop',
    classification: { type: 'logic' },
    story: `The program should display the total of all ${n} scores, ${outputOf(fixed, base)}. It runs without an error but displays ${outputOf(source, base)}.`,
    code: { source, indexBase: base },
    fixed,
    why: `The loop stops one index early, so the last score is never added. The program runs but gives the wrong answer: a logic error.`,
    technique: technique('output', 'you want i and total printed on every pass while the program runs, to compare with your desk check'),
  };
}

function wrongStart(rng: Rng): Scenario {
  const base = pick(rng, [0, 1] as const);
  const n = randInt(rng, 4, 6);
  const temps = sample(rng, range(8, 35), n);
  let test = 0;
  const build = (start: string) => {
    const L = new Listing();
    L.open('BEGIN');
    L.line(`temps ← ${literal(temps)}`);
    L.line(`lowest ← ${start}`);
    L.open(`FOR i ← ${base} TO ${n - 1 + base}`);
    test = L.open('IF temps[i] < lowest THEN');
    L.line('lowest ← temps[i]');
    L.close('ENDIF');
    L.close('ENDFOR');
    L.line('DISPLAY lowest');
    L.close('END');
    return L.code;
  };
  const source = build('0');
  const fixed = build(`temps[${base}]`);
  return {
    template: 'wrong-start',
    classification: { type: 'logic' },
    story: `The program should display the lowest temperature. It runs without an error, but it displays ${outputOf(source, base)} even though the lowest temperature is ${outputOf(fixed, base)}.`,
    code: { source, indexBase: base },
    fixed,
    why: 'lowest starts at 0, which is below every temperature, so no temperature ever replaces it. The program runs but gives the wrong answer: a logic error.',
    technique: technique('breakpoint', `you want to pause at line ${test} on the first pass and inspect temps[i] and lowest`),
  };
}

function wrongOperator(rng: Rng): Scenario {
  const price = randInt(rng, 3, 15);
  const quantity = randInt(rng, 2, 9);
  let calc = 0;
  const build = (op: string) => {
    const L = new Listing();
    L.open('BEGIN');
    L.line(`price ← ${price}`);
    L.line(`quantity ← ${quantity}`);
    calc = L.line(`cost ← price ${op} quantity`);
    L.line('DISPLAY cost');
    L.close('END');
    return L.code;
  };
  const source = build('+');
  const fixed = build('*');
  return {
    template: 'wrong-operator',
    classification: { type: 'logic' },
    story: `The program should display the cost of ${quantity} items at $${price} each, which is $${outputOf(fixed)}. It runs without an error but displays ${outputOf(source)}.`,
    code: { source },
    fixed,
    why: `Line ${calc} adds where it should multiply. The program runs but calculates the wrong value: a logic error.`,
    technique: technique('output', `you want to display cost straight after line ${calc} while the program keeps running, to see what it holds`),
  };
}

function countEverything(rng: Rng): Scenario {
  const base = pick(rng, [0, 1] as const);
  const n = randInt(rng, 5, 6);
  const t = randInt(rng, 10, 20);
  // At least one score on each side of t, so counting every score gives a different answer.
  const values = shuffle(rng, [randInt(rng, 2, t), randInt(rng, t + 1, 30), ...sample(rng, range(2, 30), n - 2)]);
  // Counts and totals the scores above t; the broken version counts outside the IF.
  const build = (inside: boolean) => {
    const L = new Listing();
    L.open('BEGIN');
    L.line(`scores ← ${literal(values)}`);
    L.line('count ← 0');
    L.line('total ← 0');
    L.open(`FOR i ← ${base} TO ${n - 1 + base}`);
    L.open(`IF scores[i] > ${t} THEN`);
    L.line('total ← total + scores[i]');
    if (inside) L.line('count ← count + 1');
    L.close('ENDIF');
    if (!inside) L.line('count ← count + 1');
    L.close('ENDFOR');
    L.line('DISPLAY count');
    L.close('END');
    return L.code;
  };
  const source = build(false);
  const fixed = build(true);
  return {
    template: 'count-everything',
    classification: { type: 'logic' },
    story: `The program should count the scores above ${t}, which is ${outputOf(fixed, base)}. It runs without an error, but it displays ${outputOf(source, base)}, the number of scores.`,
    code: { source, indexBase: base },
    fixed,
    why: 'count goes up outside the IF, so every score is counted. The program runs but gives the wrong answer: a logic error.',
    technique: technique('output', 'you want a line printed on every pass showing i, scores[i] and count while the program runs'),
  };
}

const PLAIN_LOGIC: readonly ((who: string) => Pick<Scenario, 'story' | 'why'>)[] = [
  (who) => ({
    story: `${who}'s shopping program adds 10% GST to prices that already include GST, so customers are overcharged. It never crashes or shows an error.`,
    why: 'The program runs to the end but calculates the wrong amount: a logic error.',
  }),
  (who) => ({
    story: `${who}'s program should list names in alphabetical order, but it lists them from Z to A. No error message appears.`,
    why: 'The program runs but the result is wrong, so it is a logic error in the comparison.',
  }),
  (who) => ({
    story: `${who}'s quiz program gives a mark for every answer, including wrong ones. It runs without any error message.`,
    why: 'Nothing stops the program; it just makes the wrong decision, so it is a logic error.',
  }),
];

function plainLogic(rng: Rng): Scenario {
  const make = pick(rng, PLAIN_LOGIC);
  return {
    template: `plain-logic-${PLAIN_LOGIC.indexOf(make) + 1}`,
    classification: { type: 'logic' },
    ...make(pick(rng, PEOPLE)),
    technique: technique('output', 'you want the key values displayed at each step as the program runs, so you can see where they first go wrong'),
  };
}

// ---------------------------------------------------------------------------
// Runtime errors (the listing starts, then stops)
// ---------------------------------------------------------------------------

function errorLine(code: ScenarioCode, kind: string): number {
  const e = runtimeError(code);
  if (!e) throw new Error(`the ${kind} listing ran without an error`);
  return e.line;
}

function indexPastEnd(rng: Rng): Scenario {
  const base = pick(rng, [0, 1] as const);
  const n = randInt(rng, 4, 8);
  const values = sample(rng, range(1, 50), n);
  const last = n - 1 + base;
  // Either one index past the end, or (when indexes start at 1) a loop that starts at 0.
  const startsAtZero = base === 1 && rng() < 0.5;
  const L = new Listing();
  L.open('BEGIN');
  L.line(`marks ← ${literal(values)}`);
  L.line('total ← 0');
  L.open(startsAtZero ? `FOR i ← 0 TO ${last}` : `FOR i ← ${base} TO ${last + 1}`);
  L.line('total ← total + marks[i]');
  L.close('ENDFOR');
  L.line('DISPLAY total');
  L.close('END');
  const code: ScenarioCode = { source: L.code, indexBase: base };
  const line = errorLine(code, 'index');
  return {
    template: 'index-past-end',
    classification: { type: 'runtime', kind: 'index' },
    story: `The program starts, then stops with an error on line ${line} before it displays anything.`,
    code,
    why: startsAtZero
      ? `marks is indexed 1 to ${last}, but the loop starts at marks[0], which doesn't exist: a runtime error, index out of range.`
      : `marks has ${n} values, indexed ${base} to ${last}, but the loop reaches marks[${last + 1}], which doesn't exist: a runtime error, index out of range.`,
    technique: technique('breakpoint', `you want the program to pause on line ${line} on each pass, so you can inspect i just before it fails`),
  };
}

function divideByZero(rng: Rng): Scenario {
  const base = pick(rng, [0, 1] as const);
  const n = randInt(rng, 4, 6);
  const t = randInt(rng, 30, 45);
  const values = sample(rng, range(5, t), n);
  const L = new Listing();
  L.open('BEGIN');
  L.line(`scores ← ${literal(values)}`);
  L.line('total ← 0');
  L.line('count ← 0');
  L.open(`FOR i ← ${base} TO ${n - 1 + base}`);
  L.open(`IF scores[i] > ${t} THEN`);
  L.line('total ← total + scores[i]');
  L.line('count ← count + 1');
  L.close('ENDIF');
  L.close('ENDFOR');
  L.line('DISPLAY total / count');
  L.close('END');
  const code: ScenarioCode = { source: L.code, indexBase: base };
  const line = errorLine(code, 'divide');
  return {
    template: 'divide-by-zero',
    classification: { type: 'runtime', kind: 'divide' },
    story: `The program should display the average of the scores above ${t}. For this class it stops with an error on line ${line}.`,
    code,
    why: `No score is above ${t}, so count is still 0 when line ${line} divides by it: a runtime error, divide by zero.`,
    technique: technique('comment', `you want to check that the rest of the program works when line ${line} doesn't run at all`),
  };
}

function typeMismatch(rng: Rng): Scenario {
  const word = pick(rng, ['ten', 'a dozen', 'three', '5 boxes', 'lots']);
  const L = new Listing();
  L.open('BEGIN');
  L.line('// quantity is read from a text box on the order form');
  L.line(`quantity ← ${literal(word)}`);
  L.line(`price ← ${randInt(rng, 2, 20)}`);
  L.line('cost ← quantity * price');
  L.line('DISPLAY cost');
  L.close('END');
  const code: ScenarioCode = { source: L.code };
  const line = errorLine(code, 'type');
  return {
    template: 'type-mismatch',
    classification: { type: 'runtime', kind: 'type' },
    story: `The customer typed ${word} into the quantity box. The program stops with an error on line ${line}.`,
    code,
    why: `quantity holds the text "${word}", which can't be multiplied by a number: a runtime error, type mismatch.`,
    technique: technique('breakpoint', `you want to pause just before line ${line} runs and inspect what quantity holds`),
  };
}

function overflow(rng: Rng): Scenario {
  const byte = rng() < 0.4;
  const limit = byte ? 255 : 32767;
  const add = byte ? randInt(rng, 60, 90) : randInt(rng, 7000, 9000);
  const L = new Listing();
  L.open('BEGIN');
  L.line(byte ? '// count is stored in one byte (largest value 255)' : '// points is stored as a 16-bit integer (largest value 32,767)');
  const name = byte ? 'count' : 'points';
  L.line(`${name} ← 0`);
  L.open('FOR round ← 1 TO 6');
  L.line(`${name} ← ${name} + ${add}`);
  L.close('ENDFOR');
  L.line(`DISPLAY ${name}`);
  L.close('END');
  const code: ScenarioCode = { source: L.code, intRange: byte ? [0, 255] : [-32768, 32767] };
  const line = errorLine(code, 'overflow');
  return {
    template: 'overflow',
    classification: { type: 'runtime', kind: 'overflow' },
    story: `The program runs for a few rounds, then stops with an error on line ${line}.`,
    code,
    why: `${name} grows by ${add} each round and soon needs more than ${formatValue(limit)}, the largest value its data type can hold: a runtime error, overflow.`,
    technique: technique('output', `you want ${name} displayed after every round while the program runs, to see when it gets too large`),
  };
}

const PLAIN_RUNTIME: readonly ((who: string, rng: Rng) => Pick<Scenario, 'story' | 'why' | 'classification'>)[] = [
  (who) => ({
    classification: { type: 'runtime', kind: 'index' },
    story: `${who}'s program stores 12 monthly totals in an array indexed 0 to 11. It crashes when a user asks for the total at index 12.`,
    why: 'Index 12 doesn’t exist in an array indexed 0 to 11: a runtime error, index out of range.',
  }),
  (who) => ({
    classification: { type: 'runtime', kind: 'divide' },
    story: `${who}'s bill-splitting app divides the bill by the number of people. It crashes when someone enters 0 people.`,
    why: 'Dividing by 0 has no result, so the program stops while running: a runtime error, divide by zero.',
  }),
  (who) => ({
    classification: { type: 'runtime', kind: 'type' },
    story: `${who}'s program converts the age a user types into an integer. It crashes when a user types seventeen.`,
    why: 'The text "seventeen" can’t be converted to an integer: a runtime error, type mismatch.',
  }),
  (who, rng) => {
    const long = rng() < 0.5;
    return {
      classification: { type: 'runtime', kind: 'overflow' },
      story: long
        ? `${who}'s game keeps the score in a 16-bit integer, which holds values up to 32,767. After a long session the score needs to go higher and the game crashes.`
        : `${who}'s counter is stored in a single byte, which holds values up to 255. It crashes when the count reaches 256.`,
      why: 'The value needs more than its data type can hold: a runtime error, overflow.',
    };
  },
];

function plainRuntime(rng: Rng, kind?: RuntimeKind): Scenario {
  const who = pick(rng, PEOPLE);
  const options = PLAIN_RUNTIME.map((make, i) => ({ i, made: make(who, rng) })).filter((o) => !kind || o.made.classification.kind === kind);
  const { i, made } = pick(rng, options);
  const need: Record<RuntimeKind, Scenario['technique']> = {
    index: technique('breakpoint', 'you want to pause the program just before the crash and inspect the index it is about to use'),
    divide: technique('comment', 'you want to confirm the crash comes from the division by running the program without that line'),
    type: technique('breakpoint', 'you want to pause just before the conversion and inspect exactly what text it received'),
    overflow: technique('output', 'you want the score displayed after every turn while the game runs, to see when it gets too large'),
  };
  return { template: `plain-runtime-${i + 1}`, ...made, technique: need[made.classification.kind!] };
}

// ---------------------------------------------------------------------------
// The bank
// ---------------------------------------------------------------------------

type Maker = (rng: Rng, d: Difficulty) => Scenario;

export const TEMPLATES: Record<string, { type: ErrorType; kind?: RuntimeKind; code: boolean; make: Maker }> = {
  'misspelt-keyword': { type: 'syntax', code: true, make: misspeltKeyword },
  'missing-end': { type: 'syntax', code: true, make: missingEnd },
  'unclosed-string': { type: 'syntax', code: true, make: unclosedString },
  'unbalanced-bracket': { type: 'syntax', code: true, make: unbalancedBracket },
  'plain-syntax': { type: 'syntax', code: false, make: plainSyntax },
  'wrong-comparison': { type: 'logic', code: true, make: wrongComparison },
  'short-loop': { type: 'logic', code: true, make: shortLoop },
  'wrong-start': { type: 'logic', code: true, make: wrongStart },
  'wrong-operator': { type: 'logic', code: true, make: wrongOperator },
  'count-everything': { type: 'logic', code: true, make: countEverything },
  'plain-logic': { type: 'logic', code: false, make: plainLogic },
  'index-past-end': { type: 'runtime', kind: 'index', code: true, make: indexPastEnd },
  'divide-by-zero': { type: 'runtime', kind: 'divide', code: true, make: divideByZero },
  'type-mismatch': { type: 'runtime', kind: 'type', code: true, make: typeMismatch },
  overflow: { type: 'runtime', kind: 'overflow', code: true, make: overflow },
  'plain-index': { type: 'runtime', kind: 'index', code: false, make: (rng) => plainRuntime(rng, 'index') },
  'plain-divide': { type: 'runtime', kind: 'divide', code: false, make: (rng) => plainRuntime(rng, 'divide') },
  'plain-type': { type: 'runtime', kind: 'type', code: false, make: (rng) => plainRuntime(rng, 'type') },
  'plain-overflow': { type: 'runtime', kind: 'overflow', code: false, make: (rng) => plainRuntime(rng, 'overflow') },
};

export type TemplateId = keyof typeof TEMPLATES;
export const TEMPLATE_IDS = Object.keys(TEMPLATES);
