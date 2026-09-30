/**
 * Conceptual sort questions, written by hand. Every statement is standard textbook material:
 * selection sort always makes n(n - 1)/2 comparisons and at most n - 1 swaps; quick sort averages
 * O(n log n) and falls to O(n²) when partitions are lopsided, for example on already sorted data
 * with the last value as the pivot.
 */
import type { ChoiceConcept, NamedAnswer, WhichConcept } from '../concepts';

export type SortName = 'selection' | 'quick';

export const SORT_ANSWERS: readonly NamedAnswer<SortName>[] = [
  { value: 'selection', label: 'selection sort', accept: ['selection sort', 'selection', 'selectionsort'] },
  { value: 'quick', label: 'quick sort', accept: ['quick sort', 'quick', 'quicksort'] },
];

export const SORT_WHICH: readonly WhichConcept<SortName>[] = [
  {
    id: 'large-unsorted',
    prompt: 'A program sorts 50,000 unsorted records every night, and the job must finish quickly.',
    answer: 'quick',
    reason: 'Quick sort averages O(n log n) comparisons; selection sort always makes n(n - 1)/2, about 1.25 billion for 50,000 records.',
  },
  {
    id: 'expensive-swaps',
    prompt: 'Comparing two values is fast, but every swap rewrites a slow storage chip. Which sort keeps the number of swaps lowest on a large list?',
    answer: 'selection',
    reason: 'Selection sort makes at most n - 1 swaps, one per pass; quick sort usually makes far more on a large list.',
  },
  {
    id: 'same-comparisons',
    prompt: 'Which sort makes exactly the same number of comparisons whether the list starts sorted, reversed or shuffled?',
    answer: 'selection',
    reason: 'Every pass of selection sort compares all the unsorted values, so it always makes n(n - 1)/2 comparisons.',
  },
  {
    id: 'pivot',
    prompt: 'Which sort splits the list around a pivot value and then sorts each side separately?',
    answer: 'quick',
    reason: 'Quick sort partitions around a pivot, then sorts the sub-lists either side of it.',
  },
  {
    id: 'sorted-worst-case',
    prompt: 'The list is already in ascending order and the pivot is always the last value. Which sort slows down to its worst case?',
    answer: 'quick',
    reason: 'Each partition leaves every other value on one side of the pivot, so quick sort falls to O(n²). Selection sort takes the same time whatever the order.',
  },
  {
    id: 'small-simple',
    prompt: 'A module sorts a list of 10 values, and the code must be short and easy to check by hand. Which sort suits?',
    answer: 'selection',
    reason: 'For 10 values the speed difference is negligible, and selection sort is a short loop with no recursion.',
  },
  {
    id: 'recursion',
    prompt: 'Which sort is usually written as a function that calls itself on smaller parts of the list?',
    answer: 'quick',
    reason: 'Quick sort sorts each sub-list with a recursive call after partitioning.',
  },
  {
    id: 'front-fixed',
    prompt: 'After each pass, which sort has one more value in its final place at the front of the list?',
    answer: 'selection',
    reason: 'Each pass of selection sort swaps the smallest unsorted value into the next place at the front.',
  },
  {
    id: 'average-faster',
    prompt: 'On large lists of values in random order, which sort is usually faster?',
    answer: 'quick',
    reason: 'Quick sort averages O(n log n); selection sort is O(n²) on every list.',
  },
];

export const SORT_CHOICE: readonly ChoiceConcept[] = [
  {
    id: 'quick-average',
    prompt: "What is quick sort's average time complexity?",
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(n²)'],
    answer: 2,
    reason: 'Balanced partitions halve the list about log n times, and each level of partitioning compares about n values.',
  },
  {
    id: 'quick-worst',
    prompt: "What is quick sort's worst-case time complexity?",
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(n²)'],
    answer: 3,
    reason: 'When every partition leaves all the other values on one side, quick sort makes n(n - 1)/2 comparisons.',
  },
  {
    id: 'selection-complexity',
    prompt: "What is selection sort's time complexity?",
    options: ['O(n) at best and O(n²) at worst', 'O(n²) in every case', 'O(n log n) in every case', 'O(log n) at best and O(n) at worst'],
    answer: 1,
    reason: 'Selection sort always makes n(n - 1)/2 comparisons, whatever order the values start in.',
  },
  {
    id: 'quick-worst-input',
    prompt: 'Quick sort always takes the last value as its pivot. Which starting list gives its O(n²) worst case?',
    options: ['A list already in ascending order', 'A list of values in random order', 'A list with no repeated values', 'A list whose length is a power of 2'],
    answer: 0,
    reason: 'Each pivot is the largest value left, so every partition leaves all the other values on one side.',
  },
  {
    id: 'doubling-selection',
    prompt: 'The list to sort doubles in length. Roughly how many times as many comparisons does selection sort make?',
    options: ['About the same number', 'About twice as many', 'About four times as many', 'About eight times as many'],
    answer: 2,
    reason: 'Comparisons grow with n²: doubling n multiplies n(n - 1)/2 by about 4.',
  },
  {
    id: 'after-partition',
    prompt: 'What is always true straight after quick sort partitions a list?',
    options: ['The pivot is in its final sorted place', 'The whole list is in order', 'The smallest value is at the front', 'The two sub-lists are the same length'],
    answer: 0,
    reason: 'Every value before the pivot belongs before it and every value after it belongs after it, so the pivot never moves again.',
  },
];
