import { describe, expect, it } from 'vitest';
import { parseCommandLine, tokenize } from './parse';

const words = (line: string) => {
  const t = tokenize(line);
  return t.ok ? t.tokens.map((x) => x.value) : t.error;
};

describe('tokenize', () => {
  it('splits on any whitespace', () => {
    expect(words('  play   sort\t--hard ')).toEqual(['play', 'sort', '--hard']);
    expect(words('')).toEqual([]);
    expect(words('   ')).toEqual([]);
  });

  it('keeps quoted words together and joins adjacent parts', () => {
    expect(words('man "sort game"')).toEqual(['man', 'sort game']);
    expect(words("drill 'U3O1-KK12'")).toEqual(['drill', 'U3O1-KK12']);
    expect(words('a"b c"d')).toEqual(['ab cd']);
    expect(words('say ""')).toEqual(['say', '']);
  });

  it('handles escapes', () => {
    expect(words('say \\"hi\\"')).toEqual(['say', '"hi"']);
    expect(words('say "a \\"b\\" \\\\ c"')).toEqual(['say', 'a "b" \\ c']);
    expect(words("say 'no \\escape'")).toEqual(['say', 'no \\escape']);
    expect(words('one\\ word')).toEqual(['one word']);
  });

  it('reports an unclosed quote with how to fix it', () => {
    expect(words('man "sort')).toMatch(/opening " without a closing one/);
    expect(words("man 'sort")).toMatch(/Add the closing '/);
  });
});

describe('parseCommandLine', () => {
  it('separates the name, arguments and flags', () => {
    expect(parseCommandLine('play sort --hard')).toEqual({
      ok: true,
      command: { name: 'play', args: ['sort'], flags: ['hard'], raw: 'play sort --hard' },
    });
  });

  it('lower-cases the name and flags but not arguments', () => {
    const r = parseCommandLine('  DRILL u3o1-kk12 --EASY ');
    expect(r.ok && r.command).toEqual({ name: 'drill', args: ['u3o1-kk12'], flags: ['easy'], raw: 'DRILL u3o1-kk12 --EASY' });
  });

  it('never treats quoted words, single dashes or words after -- as flags', () => {
    const r = parseCommandLine('sudo rm -rf "--hard" -- --mini');
    expect(r.ok && r.command).toMatchObject({ name: 'sudo', args: ['rm', '-rf', '--hard', '--mini'], flags: [] });
  });

  it('returns no command for a blank line and an error for a bad quote', () => {
    expect(parseCommandLine('   ')).toEqual({ ok: true, command: null });
    expect(parseCommandLine('man "sort').ok).toBe(false);
  });
});
