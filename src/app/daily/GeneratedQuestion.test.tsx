import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { QuizItem } from '../../games/types';
import { useAnnouncer } from '../../ui/announce';
import { resetStudyStores } from '../study/testing';
import { GeneratedQuestion } from './GeneratedQuestion';

const HINT = 'Type two sub-lists of whole numbers, each in brackets, such as [3, 1] [9, 7].';

const item: QuizItem = {
  id: 'gen-sort-quick',
  kk: ['U3O2-KK04'],
  prompt: [
    { kind: 'text', text: 'Quick sort partitions [5, 3, 9, 1, 7] around the pivot 5.' },
    { kind: 'text', text: 'Type the two sub-lists.' },
  ],
  check: (input) => (input.includes('[') && input.includes(']') && /\d/.test(input) ? { correct: true, expected: '[3, 1] [9, 7]', reason: '' } : { correct: false, expected: '', reason: HINT, counted: false }),
};

function renderQuestion() {
  render(<GeneratedQuestion item={item} position="Question 4 of 10" where="Daily" onAnswered={() => {}} next={{ label: 'Next question', onNext: () => {} }} autoFocus />);
}

describe('GeneratedQuestion', () => {
  beforeEach(() => resetStudyStores());
  afterEach(() => resetStudyStores());

  it('is named by its position and described by its prompt, so focus on it reads the question', () => {
    renderQuestion();
    const region = screen.getByRole('region', { name: 'Question 4 of 10' });
    expect(region).toHaveFocus();
    expect(region).toHaveAccessibleDescription('Quick sort partitions [5, 3, 9, 1, 7] around the pivot 5. Type the two sub-lists.');
  });

  it('speaks the hint for input in the wrong form, since focus stays in the field', () => {
    renderQuestion();
    const field = screen.getByRole('textbox', { name: 'Your answer' });
    field.focus();
    fireEvent.change(field, { target: { value: '[[[' } });
    fireEvent.submit(field.closest('form')!);
    expect(field).toHaveFocus();
    expect(field).toHaveAccessibleDescription(`Error: ${HINT}`);
    expect(useAnnouncer.getState().polite).toBe(HINT);

    fireEvent.change(field, { target: { value: '' } });
    fireEvent.submit(field.closest('form')!);
    expect(useAnnouncer.getState().polite).toBe('Type an answer first, or choose one of the suggested answers.');
  });
});
