/**
 * Search scenarios and concept questions, written by hand. Following VCAA's teaching advice for
 * U3O1-KK12, each scenario is decided by the solution requirements (how much data, how often it is
 * searched), how each algorithm works, and whether the data is sorted. Binary search needs values
 * sorted by the key being searched and makes at most floor(log2 n) + 1 inspections; linear search
 * works on any order and makes up to n comparisons. Big-O notation is textbook extension: the study
 * design and VCAA's advice don't use it.
 */
import type { ChoiceConcept, NamedAnswer, WhichConcept } from '../concepts';

export type SearchName = 'linear' | 'binary';

export const SEARCH_ANSWERS: readonly NamedAnswer<SearchName>[] = [
  { value: 'linear', label: 'linear search', accept: ['linear search', 'linear', 'sequential search', 'sequential'] },
  { value: 'binary', label: 'binary search', accept: ['binary search', 'binary'] },
];

export const SEARCH_WHICH: readonly WhichConcept<SearchName>[] = [
  {
    id: 'unsorted-once',
    prompt: 'A program reads 40 customer names from a file in the order they signed up, then looks up one name once when it starts. Which search should it use?',
    answer: 'linear',
    reason: 'The names are unsorted and searched once; sorting them just to run one binary search would take longer than one linear search.',
  },
  {
    id: 'sorted-large-frequent',
    prompt: 'A sorted array of 2,000,000 product codes is searched thousands of times a day. Which search should the program use?',
    answer: 'binary',
    reason: 'Binary search inspects at most 21 of 2,000,000 sorted values; a linear search could compare all 2,000,000.',
  },
  {
    id: 'sort-once-search-often',
    prompt: 'An unsorted list of 500,000 student records changes once a year but is searched thousands of times a day. Which search should the program be built around?',
    answer: 'binary',
    reason: 'Sorting once a year, then running fast binary searches, costs far less than thousands of linear searches through 500,000 records.',
  },
  {
    id: 'wrong-key',
    prompt: 'A member list is sorted by surname. Staff need to find the member with a given phone number. Which search works?',
    answer: 'linear',
    reason: 'Binary search only works on the value the list is sorted by; the phone numbers are in no particular order.',
  },
  {
    id: 'tiny-list',
    prompt: 'A settings screen keeps 8 colour names in no particular order and looks one up when a button is pressed. Which search suits?',
    answer: 'linear',
    reason: 'With 8 unsorted values a linear search is simple and fast enough; sorting first would add work for no benefit.',
  },
  {
    id: 'dictionary',
    prompt: 'A spelling checker keeps 300,000 words in alphabetical order and looks up every word the user types. Which search suits?',
    answer: 'binary',
    reason: 'The words are sorted and searched constantly, so binary search needs at most 19 inspections per word.',
  },
  {
    id: 'needs-sorted',
    prompt: 'Which search only works when the values are in order?',
    answer: 'binary',
    reason: 'Binary search decides which half to discard by comparing with the middle value, which only works on sorted values.',
  },
  {
    id: 'middle-first',
    prompt: 'Which search inspects the middle value first and then discards half of the values left?',
    answer: 'binary',
    reason: 'Each step of binary search inspects the middle of the range and, because the values are sorted, keeps only the half that could hold the target.',
  },
  {
    id: 'grows-linearly',
    prompt: 'In the worst case, which search makes twice as many comparisons when the list doubles in size?',
    answer: 'linear',
    reason: 'Linear search may compare every value, so its worst case grows in proportion to n.',
  },
  {
    id: 'doubling-one-more',
    prompt: 'Which search needs only one more inspection in the worst case when a sorted list doubles in size?',
    answer: 'binary',
    reason: 'The first inspection of the doubled sorted list halves it back to the original size.',
  },
];

export const SEARCH_CHOICE: readonly ChoiceConcept[] = [
  {
    id: 'binary-requirement',
    prompt: 'What must be true before binary search can be used on an array?',
    options: ['The values are sorted by the value being searched for', 'The array holds an even number of values', 'The target value is in the array', 'The array holds no repeated values'],
    answer: 0,
    reason: 'Binary search compares the target with the middle value to decide which half to keep, which only works when the values are in order.',
  },
  {
    id: 'binary-complexity',
    prompt: "What is binary search's worst-case time complexity?",
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    answer: 1,
    reason: 'Each inspection halves the values still in range, so n values need at most floor(log2 n) + 1 inspections.',
  },
  {
    id: 'linear-complexity',
    prompt: "What is linear search's worst-case time complexity?",
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    answer: 2,
    reason: 'When the target is last or missing, linear search compares every one of the n values.',
  },
  {
    id: 'justify-binary',
    prompt: 'Which facts justify building a module around binary search rather than linear search?',
    options: [
      'The data is unsorted, and the list is small',
      'The data is stored in a CSV file with an even number of values',
      'The data is sorted, and the module must search a large list quickly and often',
      'The data is unsorted, and the target is usually near the start',
    ],
    answer: 2,
    reason: 'Binary search only works on data sorted by the value searched for, and it pays off when the requirements call for many fast searches of a large list. A small list, or unsorted data searched only now and then, suits linear search.',
  },
  {
    id: 'linear-best',
    prompt: 'When does linear search make the fewest comparisons?',
    options: ['The target is the first value', 'The target is the middle value', 'The target is the last value', 'The target is not in the list'],
    answer: 0,
    reason: 'Linear search checks from the start, so a target in the first place is found after one comparison.',
  },
];
