import { describe, expect, it } from 'vitest';
import type { Mcq } from '../content/schema';
import { MCQ_UNPARSED, mcqItem } from './mcq';

const mcq: Mcq = {
  id: 'm-u3o1-kk12-001',
  kk: ['U3O1-KK12'],
  stem: 'Which search needs the data to be **sorted**?',
  options: ['Linear search', 'Binary search', 'Selection search', 'Hash search'],
  answer: 1,
  explanation: 'Binary search discards half of the sorted data at each step.',
  whyWrong: ['Linear search works on unsorted data.', '', 'Selection is a sort, not a search.', 'Hashing is outside this study.'],
  difficulty: 1,
  source: 'textbook',
};

describe('mcq item', () => {
  const item = mcqItem(mcq);

  it('renders the stem as Markdown and the options as lettered choices', () => {
    expect(item.prompt).toEqual([
      { kind: 'markdown', text: mcq.stem },
      { kind: 'choices', options: mcq.options, labels: 'letters', markdown: true },
    ]);
    expect(item.chips).toEqual(['A', 'B', 'C', 'D']);
    expect(item.id).toBe(mcq.id);
  });

  it('accepts letters and numbers', () => {
    expect(item.check('b').correct).toBe(true);
    expect(item.check('B').correct).toBe(true);
    expect(item.check('2').correct).toBe(true);
    expect(item.check('(b)').correct).toBe(true);
  });

  it('explains a wrong choice with its whyWrong line', () => {
    const r = item.check('c');
    expect(r.correct).toBe(false);
    expect(r.expected).toBe('B. Binary search');
    expect(r.reason).toContain(mcq.explanation);
    expect(r.reason).toContain('**Why not C:** Selection is a sort, not a search.');
    expect(r.markdown).toBe(true);
  });

  it('re-prompts on input that is not a choice', () => {
    const r = item.check('binary');
    expect(r.counted).toBe(false);
    expect(r.reason).toBe(MCQ_UNPARSED);
  });

  it('shows figures above the stem', () => {
    const withFigure = mcqItem({ ...mcq, figures: [{ id: 'f1', kind: 'pseudocode', code: 'DISPLAY 1' }] });
    expect(withFigure.prompt[0]).toEqual({ kind: 'figure', figure: { id: 'f1', kind: 'pseudocode', code: 'DISPLAY 1' } });
  });
});
