import { describe, expect, it } from 'vitest';
import { parseLetters, parseOption } from './answers';

const OPTIONS = ['Multi-factor authentication', 'Version control', 'Regular, tested backups', 'Encryption of stored data'];

describe('parseOption', () => {
  it('reads a letter or a number', () => {
    expect(parseOption('b', OPTIONS)).toBe(1);
    expect(parseOption(' D. ', OPTIONS)).toBe(3);
    expect(parseOption('(c)', OPTIONS)).toBe(2);
    expect(parseOption('1', OPTIONS)).toBe(0);
    expect(parseOption('e', OPTIONS)).toBeNull();
    expect(parseOption('5', OPTIONS)).toBeNull();
  });

  it("reads an option's text, ignoring case, spaces and hyphens", () => {
    expect(parseOption('version control', OPTIONS)).toBe(1);
    expect(parseOption('MULTIFACTOR AUTHENTICATION', OPTIONS)).toBe(0);
    expect(parseOption('regular, tested backups.', OPTIONS)).toBe(2);
    expect(parseOption('backups', OPTIONS)).toBeNull();
  });

  it('reads the letter and text together, as feedback prints them, only when they agree', () => {
    expect(parseOption('B. Version control', OPTIONS)).toBe(1);
    expect(parseOption('b) version control', OPTIONS)).toBe(1);
    expect(parseOption('A. Version control', OPTIONS)).toBeNull();
    expect(parseOption('', OPTIONS)).toBeNull();
  });
});

describe('parseLetters', () => {
  it('reads letters separated by spaces, commas or and, or run together', () => {
    expect(parseLetters('A C D', 6)).toEqual([0, 2, 3]);
    expect(parseLetters('a, c, d', 6)).toEqual([0, 2, 3]);
    expect(parseLetters('acd', 6)).toEqual([0, 2, 3]);
    expect(parseLetters('D and A', 6)).toEqual([0, 3]);
    expect(parseLetters('(b) (f)', 6)).toEqual([1, 5]);
    expect(parseLetters('b b', 6)).toEqual([1]);
    expect(parseLetters('H', 8)).toEqual([7]);
  });

  it('rejects anything but letters among the options', () => {
    expect(parseLetters('', 6)).toBeNull();
    expect(parseLetters('g', 6)).toBeNull();
    expect(parseLetters('none', 6)).toBeNull();
    expect(parseLetters('a 2', 6)).toBeNull();
    expect(parseLetters('all of them', 6)).toBeNull();
  });
});
