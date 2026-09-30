/** Registry text for `search`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const SEARCH_ID = 'search';
export const SEARCH_TITLE = 'Linear search and binary search';
export const SEARCH_KK: KkId[] = ['U3O1-KK12'];
export const SEARCH_SUMMARY = 'Trace binary and linear searches, count comparisons, and pick the right search';

export const SEARCH_MAN = `search drills the two searching algorithms in the study design: linear search and binary search.

A round has 10 questions of four kinds.

Binary search: give the indexes inspected, in order, for a target that may or may not be in the sorted array. Each question states whether indexes start at 0 or 1. The midpoint is mid = (low + high) DIV 2, which rounds down. If the value at mid is less than the target, low becomes mid + 1; if it is greater, high becomes mid - 1. The search stops when it finds the target or when low is greater than high.

Linear search: give the indexes inspected, or the number of comparisons. It checks each value in turn from the first index and stops at the first match.

Counting: the most inspections each search can need.

Scenarios: choose the search that suits the data (sorted or not, how large) and how often it runs.

Type indexes as numbers separated by spaces or commas, such as 5 8 6.

Difficulty: --easy uses 7 to 9 values, normal uses 10 to 13, and --hard uses 14 to 18 with more missing targets.

Usage: play search [--easy|--hard]`;
