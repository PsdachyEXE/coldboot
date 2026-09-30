/** Registry text for `sort`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const SORT_ID = 'sort';
export const SORT_TITLE = 'Selection sort and quick sort';
export const SORT_KK: KkId[] = ['U3O1-KK12'];
export const SORT_SUMMARY = 'Trace selection sort passes and quick sort partitions, and compare the two';

export const SORT_MAN = `sort drills the two sorting algorithms in the study design: selection sort and quick sort.

A round has 10 questions of four kinds.

Selection sort: give the array after pass k. Each pass finds the smallest value in the unsorted part and swaps it into the first unsorted place, even if it is already there.

Quick sort: give the array after the first partition, then the two sub-lists left to sort. The pivot is the last value. Scanning left to right, each value less than or equal to the pivot swaps into the next place on the left, then the pivot swaps into the place just after them (Lomuto partitioning).

Counting: comparisons, passes and swaps. Selection sort always makes n(n - 1)/2 comparisons and at most n - 1 swaps.

Concepts: efficiency, complexity, and when each sort is the better choice.

Type arrays as numbers separated by spaces or commas, such as 4 1 3. Type sub-lists in brackets, such as [4, 1] [9, 7], with [] for an empty one. Every question states its rules, so read it before you answer.

Difficulty: --easy uses 5 values, normal uses 6 or 7, and --hard uses 8 values with repeats.

Usage: play sort [--easy|--hard]`;
