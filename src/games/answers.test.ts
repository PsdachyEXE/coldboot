import { describe, expect, it } from 'vitest';
import { formatGroups, formatList, matchOption, parseChoice, parseCount, parseIntGroups, parseIntList, sameList } from './answers';

describe('answer parsers', () => {
  it('reads lettered and numbered choices leniently', () => {
    expect(parseChoice('a')).toBe(0);
    expect(parseChoice(' B ')).toBe(1);
    expect(parseChoice('(c)')).toBe(2);
    expect(parseChoice('d)')).toBe(3);
    expect(parseChoice('D.')).toBe(3);
    expect(parseChoice('option b')).toBe(1);
    expect(parseChoice('1')).toBe(0);
    expect(parseChoice('4')).toBe(3);
  });

  it('rejects choices outside the options', () => {
    expect(parseChoice('e')).toBeNull();
    expect(parseChoice('5')).toBeNull();
    expect(parseChoice('0')).toBeNull();
    expect(parseChoice('ab')).toBeNull();
    expect(parseChoice('')).toBeNull();
    expect(parseChoice('b', 2)).toBe(1);
    expect(parseChoice('c', 2)).toBeNull();
  });

  it('reads whole-number lists with commas, spaces or brackets', () => {
    expect(parseIntList('3, 1, 2')).toEqual([3, 1, 2]);
    expect(parseIntList('3 1 2')).toEqual([3, 1, 2]);
    expect(parseIntList('[3,1,2]')).toEqual([3, 1, 2]);
    expect(parseIntList('  3 ,  1   2 ')).toEqual([3, 1, 2]);
    expect(parseIntList('-1 0 4')).toEqual([-1, 0, 4]);
  });

  it('is strict about the values in a list', () => {
    expect(parseIntList('3, 1.5, 2')).toBeNull();
    expect(parseIntList('three one two')).toBeNull();
    expect(parseIntList('')).toBeNull();
  });

  it('reads bracketed groups, keeping empty ones', () => {
    expect(parseIntGroups('[3, 1] [9 8]')).toEqual([[3, 1], [9, 8]]);
    expect(parseIntGroups('(3 1) ()')).toEqual([[3, 1], []]);
    expect(parseIntGroups('[] [4]')).toEqual([[], [4]]);
    expect(parseIntGroups('3 1 2')).toEqual([[3, 1, 2]]);
    expect(parseIntGroups('[a] [1]')).toBeNull();
    expect(parseIntGroups('')).toEqual([]);
  });

  it('reads a single whole number with optional trailing words', () => {
    expect(parseCount('15')).toBe(15);
    expect(parseCount(' 15 comparisons ')).toBe(15);
    expect(parseCount('15.')).toBe(15);
    expect(parseCount('15.5')).toBeNull();
    expect(parseCount('about 15')).toBeNull();
    expect(parseCount('15 16')).toBeNull();
    expect(parseCount('')).toBeNull();
  });

  it('matches word answers ignoring case, spaces and hyphens', () => {
    const opts = [
      { value: 'quick', accept: ['quick sort', 'quick'] },
      { value: 'selection', accept: ['selection sort', 'selection'] },
    ] as const;
    expect(matchOption('Quick Sort', opts)).toBe('quick');
    expect(matchOption('quicksort', opts)).toBe('quick');
    expect(matchOption('quick-sort.', opts)).toBe('quick');
    expect(matchOption('SELECTION', opts)).toBe('selection');
    expect(matchOption('bubble sort', opts)).toBeNull();
    expect(matchOption('   ', opts)).toBeNull();
  });

  it('formats lists and groups for display', () => {
    expect(formatList([3, 1, 2])).toBe('3, 1, 2');
    expect(formatGroups([[3, 1], []])).toBe('[3, 1] []');
    expect(sameList([1, 2], [1, 2])).toBe(true);
    expect(sameList([1, 2], [2, 1])).toBe(false);
    expect(sameList([1, 2], [1, 2, 3])).toBe(false);
  });
});
