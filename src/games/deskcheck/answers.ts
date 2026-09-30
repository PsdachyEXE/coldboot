/**
 * Answers to deskcheck questions: a value (a variable's value or a return value) or the lines a
 * listing displays. Checking is lenient on case, whitespace, wrapping quotes and commas versus
 * spaces between list items, and strict on values: a whole number never matches a typed decimal
 * ("7" is not "7.0"), and a floating point answer is typed with a decimal point.
 */
import { normaliseAnswer, parseList } from '../../lib/text';
import { formatValue, isReal, Real, type Value } from './interpreter';

export type DeskAnswer = { kind: 'value'; value: Value } | { kind: 'output'; lines: string[] };

export type Verdict = { status: 'right' } | { status: 'wrong'; note?: string } | { status: 'unparsed'; message: string };

const NUMBER = /^[+-]?\d+(?:\.\d+)?$/;

/** Strips wrapping quotes and a trailing full stop from one list token. */
function cleanToken(token: string): string {
  return normaliseAnswer(token);
}

/** Whether a typed number token matches an expected integer or floating point value. Null when the token isn't a number. */
function matchNumber(token: string, expected: number | Real): { ok: boolean; note?: string } | null {
  if (!NUMBER.test(token)) return null;
  const typed = Number(token);
  const hasPoint = token.includes('.');
  if (typeof expected === 'number') {
    if (hasPoint && typed === expected) return { ok: false, note: `${expected} is a whole number (an integer), so it has no decimal point.` };
    return { ok: !hasPoint && typed === expected };
  }
  if (!hasPoint && typed === expected.value) return { ok: false, note: `The result is a floating point number, so it is written ${formatValue(expected)}.` };
  return { ok: hasPoint && Math.abs(typed - expected.value) < 1e-9 };
}

function matchScalar(token: string, expected: Value): { ok: boolean; note?: string } | { unparsed: string } {
  if (typeof expected === 'number' || isReal(expected)) {
    const m = matchNumber(token, expected);
    if (!m) return { unparsed: typeof expected === 'number' ? 'Type a whole number, such as 12.' : 'Type a number with a decimal point, such as 2.5.' };
    return m;
  }
  if (typeof expected === 'boolean') {
    if (token !== 'true' && token !== 'false') return { unparsed: 'Type TRUE or FALSE.' };
    return { ok: (token === 'true') === expected };
  }
  if (typeof expected === 'string') return { ok: token === normaliseAnswer(expected) };
  return { unparsed: 'Type one value.' };
}

/** Splits a typed list: commas and whitespace separate items, and surrounding brackets are ignored. */
function tokens(input: string): string[] {
  return parseList(input).map(cleanToken).filter(Boolean);
}

export function checkDeskAnswer(input: string, answer: DeskAnswer): Verdict {
  const typed = normaliseAnswer(input);
  if (!typed) return { status: 'unparsed', message: answerHint(answer) };

  if (answer.kind === 'output') {
    const want = answer.lines.flatMap((l) => l.trim().split(/\s+/)).map(cleanToken);
    const got = tokens(input);
    if (got.length !== want.length) return { status: 'wrong' };
    for (let i = 0; i < want.length; i++) {
      const w = want[i];
      if (NUMBER.test(w)) {
        const m = matchNumber(got[i], w.includes('.') ? new Real(Number(w)) : Number(w));
        if (!m?.ok) return { status: 'wrong', note: m?.note };
      } else if (got[i] !== w) {
        return { status: 'wrong' };
      }
    }
    return { status: 'right' };
  }

  const expected = answer.value;
  if (Array.isArray(expected)) {
    const got = tokens(input);
    if (got.length !== expected.length) {
      return { status: 'unparsed', message: `The array has ${expected.length} values. Type all ${expected.length}, separated by spaces or commas.` };
    }
    for (let i = 0; i < expected.length; i++) {
      const m = matchScalar(got[i], expected[i]);
      if ('unparsed' in m) return { status: 'unparsed', message: 'Type the values in order, separated by spaces or commas.' };
      if (!m.ok) return { status: 'wrong', note: m.note };
    }
    return { status: 'right' };
  }
  const m = matchScalar(typed, expected);
  if ('unparsed' in m) return { status: 'unparsed', message: m.unparsed };
  return m.ok ? { status: 'right' } : { status: 'wrong', note: m.note };
}

/** The expected answer as feedback shows it. */
export function formatDeskAnswer(answer: DeskAnswer): string {
  if (answer.kind === 'value') {
    const v = answer.value;
    return Array.isArray(v) ? v.map(formatValue).join(', ') : formatValue(v);
  }
  if (answer.lines.length === 1) return answer.lines[0];
  if (answer.lines.every((l) => !/\s/.test(l))) return `${answer.lines.join(', ')} (one per line)`;
  return answer.lines.join(', then ');
}

/** How to type the answer, shown under the question. */
export function answerHint(answer: DeskAnswer): string {
  if (answer.kind === 'output') {
    return answer.lines.length === 1 ? 'Type what is displayed.' : 'Type every line that is displayed, in order, separated by spaces or commas.';
  }
  const v = answer.value;
  if (Array.isArray(v)) return 'Type the values in order, separated by spaces or commas.';
  if (typeof v === 'number') return 'Type a whole number.';
  if (isReal(v)) return 'The answer is a floating point number: type it with a decimal point, such as 2.5.';
  if (typeof v === 'boolean') return 'Type TRUE or FALSE.';
  return 'Type the text, without quotes.';
}
