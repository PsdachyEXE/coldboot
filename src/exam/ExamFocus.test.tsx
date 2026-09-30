/**
 * Where focus goes in the exam's confirmations and after clearing an answer: never onto an
 * irreversible button, and never dropped to the page body.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { fixtureIndex, fxCaseStudy, fxMcq, fxShort, provideContent, resetStudyStores } from '../app/study/testing';
import { useSettings } from '../state/settings';
import { examActions } from './actions';
import ExamScreen from './ExamScreen';
import { useExam } from './store';
import { FULL_TIMING } from './timer';

const MIN = 60_000;
const T0 = Date.parse('2026-10-01T09:00:00+10:00');

const mcqA = fxMcq('m-u3o1-kk04-001', ['U3O1-KK04']);
const mcqB = fxMcq('m-u3o2-kk03-001', ['U3O2-KK03']);
const short = fxShort('s-u3o1-kk04-001', ['U3O1-KK04'], { marks: 3, prompt: 'Justify storing a phone number as a string.' });
const cs = fxCaseStudy('cs-01');
const content = fixtureIndex({ mcq: [mcqA, mcqB], short: [short], caseStudies: [cs] });

function renderExam(path = '/exam?sit=1') {
  const router = createMemoryRouter([{ path: '/exam', element: <ExamScreen /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

/** A full paper 20 minutes in, so writing time has started. */
function seedWriting() {
  examActions.start(
    { mode: 'full', seed: 5, sections: { a: [mcqA.id, mcqB.id], b: [short.id], c: ['cs-01-q01'] }, caseStudyId: 'cs-01', timing: FULL_TIMING },
    T0 - 20 * MIN,
  );
}

describe('exam focus', () => {
  beforeEach(() => {
    resetStudyStores();
    useExam.getState().reset();
    window.localStorage.clear();
    useSettings.setState({ onboarded: true, motion: 'reduce' });
    provideContent(content);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => {
    vi.useRealTimers();
    useExam.getState().reset();
    resetStudyStores();
    window.localStorage.clear();
  });

  it('opens the submit and discard dialogs on the button that keeps the paper', () => {
    seedWriting();
    renderExam();
    fireEvent.click(screen.getByRole('button', { name: 'Submit paper' }));
    const submit = screen.getByRole('dialog', { name: 'Submit your paper?' });
    // A second Enter (or a held key) must not submit a paper that can't be changed afterwards.
    expect(within(submit).getByRole('button', { name: 'Keep writing' })).toHaveFocus();
    fireEvent.click(within(submit).getByRole('button', { name: 'Keep writing' }));

    fireEvent.click(screen.getByRole('button', { name: 'Stop and discard this paper' }));
    const discard = screen.getByRole('dialog', { name: 'Stop and discard this paper?' });
    expect(within(discard).getByRole('button', { name: 'Keep this paper' })).toHaveFocus();
  });

  it('opens the finish marking dialog on Keep marking', () => {
    seedWriting();
    act(() => examActions.submit());
    renderExam();
    expect(screen.getByRole('heading', { level: 1, name: 'Mark your paper' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finish marking' }));
    const finish = screen.getByRole('dialog', { name: 'Finish marking?' });
    expect(within(finish).getByRole('button', { name: 'Keep marking' })).toHaveFocus();
  });
});
