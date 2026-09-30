/**
 * Selection sort and quick sort exactly as the `sort` game states them. Answers always come from
 * running these functions, never from hand-computed values; the tests check them against
 * independently written reference implementations over hundreds of seeds.
 */

export interface SelectionPass {
  /** 1-based pass number. */
  pass: number;
  /** The array after this pass. */
  array: number[];
  /** The smallest value in the unsorted part, now in place `pass`. */
  value: number;
  /** The value it swapped with (itself when it was already in place). */
  swappedWith: number;
  /** True when the smallest value was already in place (it swaps with itself). */
  inPlace: boolean;
}

/**
 * Ascending selection sort. Each pass finds the smallest value in the unsorted part (the first one,
 * furthest left, when it appears more than once) and swaps it into the first unsorted place, even
 * when it is already there. Returns the state after every pass (n - 1 passes).
 */
export function selectionSortPasses(values: readonly number[]): SelectionPass[] {
  const a = [...values];
  const passes: SelectionPass[] = [];
  for (let i = 0; i < a.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < a.length; j++) {
      if (a[j] < a[min]) min = j;
    }
    const swappedWith = a[i];
    [a[i], a[min]] = [a[min], a[i]];
    passes.push({ pass: i + 1, array: [...a], value: a[i], swappedWith, inPlace: min === i });
  }
  return passes;
}

export interface PartitionStep {
  /** The value compared with the pivot. */
  value: number;
  /** True when it was less than or equal to the pivot and swapped left. */
  moved: boolean;
  /** The array after this step. */
  array: number[];
}

export interface Partition {
  pivot: number;
  /** The array after the partition. */
  array: number[];
  /** 0-based position of the pivot after the partition (its final place). */
  pivotIndex: number;
  /** Values before the pivot, in array order. */
  left: number[];
  /** Values after the pivot, in array order. */
  right: number[];
  steps: PartitionStep[];
}

/**
 * Lomuto partition of the whole array with the last value as the pivot: scanning left to right,
 * each value less than or equal to the pivot swaps into the next place on the left; then the pivot
 * swaps into the place just after them.
 */
export function lomutoPartition(values: readonly number[]): Partition {
  if (!values.length) throw new Error('lomutoPartition needs at least one value');
  const a = [...values];
  const hi = a.length - 1;
  const pivot = a[hi];
  let boundary = -1;
  const steps: PartitionStep[] = [];
  for (let j = 0; j < hi; j++) {
    const value = a[j];
    const moved = value <= pivot;
    if (moved) {
      boundary++;
      [a[boundary], a[j]] = [a[j], a[boundary]];
    }
    steps.push({ value, moved, array: [...a] });
  }
  const pivotIndex = boundary + 1;
  [a[pivotIndex], a[hi]] = [a[hi], a[pivotIndex]];
  return { pivot, array: a, pivotIndex, left: a.slice(0, pivotIndex), right: a.slice(pivotIndex + 1), steps };
}

/** Comparisons selection sort makes on n values, whatever their order: n(n - 1) / 2. */
export function selectionComparisons(n: number): number {
  return (n * (n - 1)) / 2;
}
