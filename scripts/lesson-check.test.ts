import { describe, expect, it } from 'vitest';
import { checkContent } from '../src/content/check';
import type { Lesson } from '../src/content/schema';
import { overlaps, words } from './lesson-check';
import { readContentDir } from './readContent';

const lesson = (over: Partial<Lesson> = {}): Lesson => ({
  id: 'l-u3o1-kk04',
  kk: 'U3O1-KK04',
  intro: 'Every value a program keeps has a type.',
  sections: [
    { heading: 'Text', body: 'A character holds one symbol.' },
    { heading: 'Numbers', body: 'An integer has no fractional part.' },
    { heading: 'Booleans', body: 'A Boolean holds true or false.' },
  ],
  source: 'study-design',
  ...over,
});

/** The real content with these lessons in their areas. */
function check(lessons: Lesson[], area: 'U3O1' | 'U3O2' = 'U3O1') {
  const raw = readContentDir();
  raw.areas[area] = { ...raw.areas[area], lessons };
  return checkContent(raw).errors.filter((e) => e.includes('lessons.json'));
}

describe('lesson rules', () => {
  it('accepts a well-formed lesson', () => {
    expect(check([lesson()])).toEqual([]);
  });

  it('names a lesson for its point, keeps it in its area, and allows one per point', () => {
    expect(check([lesson({ id: 'l-u3o1-kk05' })]).join('\n')).toMatch(/should be named l-u3o1-kk04/);
    expect(check([lesson()], 'U3O2').join('\n')).toMatch(/belongs in content\/u3o1\/lessons\.json/);
    expect(check([lesson(), lesson()]).join('\n')).toMatch(/duplicate id l-u3o1-kk04/);
  });

  it('rejects cloze gaps, raw HTML, unknown command terms, repeated headings and long prose', () => {
    const errs = (l: Partial<Lesson>) => check([lesson(l)]).join('\n');
    expect(errs({ intro: 'A {{string}} holds text.' })).toMatch(/cloze gap/);
    expect(errs({ intro: 'A <b>string</b> holds text.' })).toMatch(/raw HTML/);
    expect(errs({ worked: { commandTerm: 'ponder', marks: 1, prompt: 'Why?', points: [{ text: 'Because', marks: 1 }], model: 'Because.' } })).toMatch(/unknown command term "ponder"/);
    const body = 'word '.repeat(300);
    expect(errs({ sections: [0, 1, 2].map(() => ({ heading: 'Same', body: 'x' })) })).toMatch(/repeats a section heading/);
    expect(errs({ sections: [1, 2, 3].map((i) => ({ heading: `Part ${i}`, body })) })).toMatch(/words of prose/);
    // Code blocks don't count towards the length.
    const code = '```pseudo\n' + 'total ← total + 1\n'.repeat(400) + '```';
    expect(errs({ sections: [1, 2, 3].map((i) => ({ heading: `Part ${i}`, body: `Short. ${code}` })) })).toBe('');
  });
});

describe('copied-text scan', () => {
  const source = new Set<string>();
  const t = words('Students should describe the purpose of validation and explain how existence checks work in a module.');
  for (let i = 0; i + 8 <= t.length; i++) source.add(t.slice(i, i + 8).join(' '));

  it('finds a run of eight or more shared words, ignoring case and punctuation', () => {
    expect(overlaps('As the brief says: STUDENTS should describe the purpose of validation, and more.', source)).toEqual(['students should describe the purpose of validation and']);
  });

  it('lets shorter echoes and code through', () => {
    expect(overlaps('Describe the purpose of validation in your own words.', source)).toEqual([]);
    expect(overlaps('```pseudo\nstudents should describe the purpose of validation and explain\n```', source)).toEqual([]);
  });
});
