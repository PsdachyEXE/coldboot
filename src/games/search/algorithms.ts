/**
 * Binary search and linear search exactly as the `search` game states them. Indexes are reported in
 * the base the question states (0 or 1). The tests check these against independently written
 * reference implementations over hundreds of seeds.
 */

export type IndexBase = 0 | 1;

export interface BinaryStep {
  low: number;
  high: number;
  /** (low + high) DIV 2: rounded down. */
  mid: number;
  value: number;
  /** found; less (value below the target, so low = mid + 1); greater (so high = mid - 1). */
  outcome: 'found' | 'less' | 'greater';
}

export interface BinaryTrace {
  steps: BinaryStep[];
  found: boolean;
  /** low and high when the search stopped. */
  low: number;
  high: number;
}

/** Iterative binary search on ascending values, reporting indexes in the stated base. */
export function binarySearchTrace(values: readonly number[], target: number, base: IndexBase): BinaryTrace {
  let low = base;
  let high = values.length - 1 + base;
  const steps: BinaryStep[] = [];
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = values[mid - base];
    if (value === target) {
      steps.push({ low, high, mid, value, outcome: 'found' });
      return { steps, found: true, low, high };
    }
    if (value < target) {
      steps.push({ low, high, mid, value, outcome: 'less' });
      low = mid + 1;
    } else {
      steps.push({ low, high, mid, value, outcome: 'greater' });
      high = mid - 1;
    }
  }
  return { steps, found: false, low, high };
}

export interface LinearTrace {
  /** Indexes inspected, in the stated base. */
  inspected: number[];
  found: boolean;
}

/** Linear search from the first index, stopping at the first match. */
export function linearSearchTrace(values: readonly number[], target: number, base: IndexBase): LinearTrace {
  const inspected: number[] = [];
  for (let i = 0; i < values.length; i++) {
    inspected.push(i + base);
    if (values[i] === target) return { inspected, found: true };
  }
  return { inspected, found: false };
}

/**
 * The most values binary search inspects in a sorted list of n values. Each miss leaves at most
 * floor(m / 2) of the m values still in range, so it is the number of halvings until nothing is left.
 */
export function binaryWorstCase(n: number): number {
  let inspections = 0;
  for (let m = n; m > 0; m = Math.floor(m / 2)) inspections++;
  return inspections;
}

/** The sizes still in range at each inspection in the worst case: 100, 50, 25, 12, 6, 3, 1. */
export function halvingChain(n: number): number[] {
  const chain: number[] = [];
  for (let m = n; m > 0; m = Math.floor(m / 2)) chain.push(m);
  return chain;
}
