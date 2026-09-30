/** Test helpers for the daily challenge. Imported by tests only. */
import type { QuizItem } from '../types';

/** What a student would type for an item's expected answer. */
export function typedAnswer(item: QuizItem): string {
  // MCQ items leave `expected` empty for input that isn't a choice, so ask with a real choice.
  const expected = item.check('').expected || item.check('A').expected;
  if (/^[A-D]\. /.test(expected)) return expected[0];
  const plain = expected.replace(/ \(one per line\)$/, '').replace(/, then /g, ' ');
  // P1 games print more around the answer: "C: the actor Mechanic", "1. Arrange delivery",
  // "4 (Ranger), 5 (Payment gateway) and 6 (Camper)", "0 days: the finish doesn't move".
  const candidates = [
    plain,
    expected.split(':')[0],
    expected.replace(/^\d+\. /, ''),
    (expected.match(/\d+(?= \()/g) ?? []).join(' '),
    expected.match(/^-?\d+/)?.[0] ?? '',
    ...(item.chips ?? []),
  ];
  return candidates.find((c) => c && item.check(c).correct) ?? plain;
}

/** An answer that counts as an attempt and is wrong. */
export function wrongAnswer(item: QuizItem): string {
  const right = typedAnswer(item);
  // For lists of numbers: the same values reversed, or the first one changed.
  const nums = right.match(/-?\d+/g) ?? [];
  const derived = nums.length
    ? [
        [...nums].reverse().join(' '),
        [String(Number(nums[0]) + 1), ...nums.slice(1)].join(' '),
        right.replace(/-?\d+/, (n) => String(Number(n) + 1)),
        // Dates: the day before the first one ("31/12/2009" becomes "30/12/2009").
        right.replace(/\d+/, (n) => String(Number(n) - 1).padStart(n.length, '0')),
      ]
    : [];
  const basics = ['A', 'B', ...derived, '0', 'syntax', 'logic', 'valid', 'range', 'breakpoint', 'selection sort', 'binary search', 'x'];
  // Then any suggested answer, letter or number that the item reads and marks wrong.
  const more = [...(item.chips ?? []), 'TRUE', 'FALSE', 'C', 'D', '1', '2', '3', '4', '5', '6'];
  for (const c of [...basics, ...more]) {
    const r = item.check(c);
    if (r.counted !== false && !r.correct) return c;
  }
  throw new Error(`no wrong answer for ${item.id}`);
}
