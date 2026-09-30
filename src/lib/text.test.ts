import { describe, expect, it } from 'vitest';
import { cleanPlainText, editDistance, nearest, normaliseAnswer, parseList, parseNumberList, sameAnswer } from './text';

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
