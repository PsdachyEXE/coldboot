/** Test helpers for the daily challenge. Imported by tests only. */
import type { QuizItem } from '../types';

/** What a student would type for an item's expected answer. */
export function typedAnswer(item: QuizItem): string {
  // MCQ items leave `expected` empty for input that isn't a choice, so ask with a real choice.
  const expected = item.check('').expected || item.check('A').expected;
  if (/^[A-D]\. /.test(expected)) return expected[0];
  return expected.replace(/ \(one per line\)$/, '').replace(/, then /g, ' ');
}

/** An answer that counts as an attempt and is wrong. */
export function wrongAnswer(item: QuizItem): string {
  const right = typedAnswer(item);
  // For lists of numbers: the same values reversed, or the first one changed.
  const nums = right.match(/-?\d+/g) ?? [];
  const derived = nums.length ? [[...nums].reverse().join(' '), [String(Number(nums[0]) + 1), ...nums.slice(1)].join(' '), right.replace(/-?\d+/, (n) => String(Number(n) + 1))] : [];
  for (const c of ['A', 'B', ...derived, '0', 'syntax', 'logic', 'valid', 'range', 'breakpoint', 'selection sort', 'binary search', 'x']) {
    const r = item.check(c);
    if (r.counted !== false && !r.correct) return c;
  }
  throw new Error(`no wrong answer for ${item.id}`);
}
