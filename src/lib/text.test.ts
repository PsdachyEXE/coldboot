import { describe, expect, it } from 'vitest';
import { cleanPlainText, editDistance, isCleanPlainText, nearest, normaliseAnswer, parseGroups, parseList, parseNumberList, sameAnswer } from './text';

describe('text', () => {
  it('normalises answers leniently', () => {
    expect(normaliseAnswer('  Binary   Search. ')).toBe('binary search');
    expect(normaliseAnswer('"Runtime"')).toBe('runtime');
    expect(sameAnswer('LOGIC', ' logic ')).toBe(true);
  });

  it('computes Levenshtein distance', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('', 'abc')).toBe(3);
    expect(editDistance('same', 'same')).toBe(0);
    expect(editDistance('flaw', 'lawn')).toBe(2);
  });

  it('suggests the nearest command within distance 2', () => {
    const cmds = ['help', 'play', 'review', 'drill', 'daily'];
    expect(nearest('hlep', cmds)).toBe('help');
    expect(nearest('revew', cmds)).toBe('review');
    expect(nearest('xyzzy', cmds)).toBeNull();
  });

  it('parses lists with commas, spaces and brackets', () => {
    expect(parseList('[3, 1 ,2]')).toEqual(['3', '1', '2']);
    expect(parseList('3 1 2')).toEqual(['3', '1', '2']);
    expect(parseList('3,1,2')).toEqual(['3', '1', '2']);
    expect(parseList('   ')).toEqual([]);
    expect(parseNumberList('4, 5.5, -1')).toEqual([4, 5.5, -1]);
    expect(parseNumberList('4, five')).toBeNull();
    expect(parseNumberList('')).toBeNull();
  });

  it('cleans plain text of control characters and caps length', () => {
    expect(cleanPlainText('  Ana\u0000lise\n ', 24)).toBe('Analise');
    expect(cleanPlainText('x'.repeat(40), 24)).toHaveLength(24);
  });
});

describe('text hardening', () => {
  it('normalises trailing stops and quotes in either order', () => {
    expect(normaliseAnswer('"logic".')).toBe('logic');
    expect(normaliseAnswer("'runtime'.")).toBe('runtime');
    expect(normaliseAnswer('“Syntax”')).toBe('syntax');
  });

  it('strips bidi overrides, C1 controls and zero-width characters, cutting on code points', () => {
    expect(cleanPlainText('ab‮\ncd', 24)).toBe('abcd');
    expect(cleanPlainText('a\u0085b​c﻿', 24)).toBe('abc');
    expect(cleanPlainText('😀😀😀', 2)).toBe('😀😀');
    expect(isCleanPlainText('Mia', 24)).toBe(true);
    expect(isCleanPlainText('Mia‮', 24)).toBe(false);
  });

  it('parses bracketed sub-lists', () => {
    expect(parseGroups('[1, 2] [4, 5]')).toEqual([['1', '2'], ['4', '5']]);
    expect(parseGroups('[] [4 5]')).toEqual([[], ['4', '5']]);
    expect(parseGroups('3 1 2')).toEqual([['3', '1', '2']]);
    expect(parseGroups('')).toEqual([]);
  });
});
