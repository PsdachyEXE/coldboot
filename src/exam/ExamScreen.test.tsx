import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { fixtureIndex, fxCaseStudy, fxMcq, fxShort, provideContent, resetStudyStores } from '../app/study/testing';
import { useAttempts } from '../state/attempts';
import { useSettings } from '../state/settings';
import { useAnnouncer } from '../ui/announce';
import { examActions } from './actions';
import ExamScreen from './ExamScreen';
import { useExam } from './store';
import { FULL_TIMING } from './timer';

const MIN = 60_000;
const T0 = Date.parse('2026-10-01T09:00:00+10:00');

const mcqA = fxMcq('m-u3o1-kk04-001', ['U3O1-KK04']); // answer index 2
const mcqB = fxMcq('m-u3o2-kk03-001', ['U3O2-KK03']);
const mcqC = fxMcq('m-u4o2-kk05-001', ['U4O2-KK05']);
const short = fxShort('s-u3o1-kk04-001', ['U3O1-KK04'], { marks: 3, prompt: 'Justify storing a phone number as a string.' });
const cs = fxCaseStudy('cs-01');
const content = fixtureIndex({ mcq: [mcqA, mcqB, mcqC], short: [short], caseStudies: [cs] });

function renderExam(path = '/exam') {
  const router = createMemoryRouter(
    [
      { path: '/exam', element: <ExamScreen /> },
      { path: '/drill', element: <p>Drill screen</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

/** A paper already 20 minutes in (writing time), started at T0 - 20 minutes. */
function seedWriting() {
  examActions.start(
    { mode: 'full', seed: 5, sections: { a: [mcqA.id, mcqB.id, mcqC.id], b: [short.id], c: ['cs-01-q01', 'cs-01-q02'] }, caseStudyId: 'cs-01', timing: FULL_TIMING },
    T0 - 20 * MIN,
  );
}

describe('exam screen', () => {
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

  it('explains the rules and offers both papers, with the mini paper first for ?mini=1', () => {
    renderExam('/exam');
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
    expect(screen.getByText(/There's no pause/)).toBeInTheDocument();
    const headings = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings().indexOf('Full paper')).toBeLessThan(headings().indexOf('Mini paper'));
    expect(screen.getByText(/No marked papers yet/)).toBeInTheDocument();
    renderExam('/exam?mini=1');
    const all = screen.getAllByRole('heading', { name: /paper$/ }).map((h) => h.textContent);
    expect(all.slice(-2)).toEqual(['Mini paper', 'Full paper']);
  });

  it('locks answers during reading time, then unlocks them when writing time starts', async () => {
    renderExam('/exam');
    fireEvent.click(screen.getByRole('button', { name: 'Start full paper' }));
    expect(useExam.getState().paper).toMatchObject({ mode: 'full', startedAt: T0, readingMs: 15 * MIN });
    expect(screen.getByRole('heading', { level: 1, name: 'Full paper' })).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: 'Reading time left: 15 minutes' })).toHaveTextContent('15:00');
    expect(screen.getByText(/You can't answer yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit paper' })).toBeNull();

    // Section A: the options can be read but not chosen.
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(4);
    radios.forEach((r) => expect(r).toBeDisabled());
    // Students can still move between questions and sections, and flag questions.
    fireEvent.click(screen.getByRole('button', { name: /^Question 2\b/ }));
    expect(screen.getByRole('heading', { level: 2, name: /Question 2/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Section B/ }));
    const box = screen.getByLabelText('Your answer');
    expect(box).toHaveAttribute('readonly');
    expect(screen.getByText(/Suggested length: About 3 developed points, one per mark\. You can write once writing time starts\./)).toBeInTheDocument();
    fireEvent.change(box, { target: { value: 'Too early' } });
    expect(useExam.getState().paper!.answers).toEqual({});

    // Reading time ends: the ticking clock notices within a second.
    vi.setSystemTime(T0 + 15 * MIN + 500);
    await waitFor(() => expect(screen.getByLabelText('Your answer')).not.toHaveAttribute('readonly'), { timeout: 2500 });
    expect(screen.getByRole('button', { name: 'Submit paper' })).toBeInTheDocument();
    // The announcement comes from a passive effect that can run after the commit waitFor saw.
    await waitFor(() => expect(useAnnouncer.getState().assertive).toMatch(/Writing time has started: you have 2 hours/));
    expect(screen.queryByText(/You can't answer yet/)).toBeNull();
  });

  it('autosaves every change to the store and to storage, and says so quietly', async () => {
    seedWriting();
    renderExam('/exam?sit=1');
    expect(screen.getByRole('timer', { name: /Writing time left: 1 hour 55 minutes/ })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('radio')[2]);
    expect(useExam.getState().paper!.answers[mcqA.id]).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Flag for review' }));
    expect(useExam.getState().paper!.flags).toEqual([mcqA.id]);
    expect(screen.getByRole('button', { name: 'Question 1, answered, flagged' })).toHaveAttribute('aria-current', 'true');

    fireEvent.click(screen.getByRole('tab', { name: /Section B/ }));
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'It keeps the <b>leading</b> zero.' } });
    expect(useExam.getState().paper!.answers[short.id]).toBe('It keeps the <b>leading</b> zero.');
    expect(screen.getByText('Saving')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument(), { timeout: 2000 });
    const saved = JSON.parse(window.localStorage.getItem('coldboot:v1:exam')!);
    expect(saved).toMatchObject({ v: 2, data: { paper: { answers: { [mcqA.id]: 2, [short.id]: 'It keeps the <b>leading</b> zero.' }, flags: [mcqA.id] } } });
    // The student's text is plain text, never markup.
    expect(screen.getByLabelText('Your answer')).toHaveValue('It keeps the <b>leading</b> zero.');
    expect(document.querySelector('b')).toBeNull();
  });

  it('asks before submitting, warns about unanswered questions, then marks the paper and reports it', async () => {
    seedWriting();
    renderExam('/exam?sit=1');
    fireEvent.click(screen.getAllByRole('radio')[2]); // A1: correct
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    fireEvent.click(screen.getAllByRole('radio')[0]); // A2: wrong
    fireEvent.click(screen.getByRole('tab', { name: /Section B/ }));
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'Leading zeros and no arithmetic.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit paper' }));
    const dialog = screen.getByRole('dialog', { name: 'Submit your paper?' });
    expect(within(dialog).getByText("You haven't answered 3 questions:")).toBeInTheDocument();
    expect(within(dialog).getByText('Section A, question 3')).toBeInTheDocument();
    expect(within(dialog).getByText('Section C, questions 1 and 2')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep writing' }));
    expect(useExam.getState().paper!.submittedAt).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Submit paper' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Submit your paper?' })).getByRole('button', { name: 'Submit paper' }));
    expect(useExam.getState().paper).toMatchObject({ submittedAt: T0, autoSubmitted: false, at: { section: 'a', index: 0 } });

    // Marking: Section A is marked for you.
    expect(screen.getByRole('heading', { level: 1, name: 'Mark your paper' })).toHaveFocus();
    expect(screen.getByText('Your answer is correct')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Question 1, correct' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Question 2, incorrect' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Question 3, not answered' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Question 2, incorrect' }));
    expect(screen.getByText('Your answer')).toBeInTheDocument();
    expect(screen.getByText('Two confuses the terms.')).toBeInTheDocument();

    // Section B is self-marked against the marking points, beside the model answer.
    fireEvent.click(screen.getByRole('tab', { name: /Section B/ }));
    expect(screen.getByText('Leading zeros and no arithmetic.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Model answer' })).toBeInTheDocument();
    const points = screen.getByRole('group', { name: 'Tick the marking points your answer earned' });
    const boxes = within(points).getAllByRole('checkbox');
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    expect(screen.getByText('Your mark: 2 of 3 marks')).toBeInTheDocument();
    expect(useExam.getState().paper!.ticks[short.id]).toEqual([0, 1]);
    expect(screen.getByText(/Marks so far:/)).toHaveTextContent('Marks so far: 3 of 9');

    // Nothing is recorded until marking is finished.
    expect(useAttempts.getState().log).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Finish marking' }));
    const finish = screen.getByRole('dialog', { name: 'Finish marking?' });
    expect(within(finish).getByText('Every written answer has been marked.')).toBeInTheDocument();
    fireEvent.click(within(finish).getByRole('button', { name: 'Finish marking' }));

    // The report: by section, by KK, time used, weakest KKs with a focused drill.
    expect(await screen.findByRole('heading', { level: 1, name: 'Paper report' })).toBeInTheDocument();
    expect(screen.getByText('3 of 9 marks (33%)')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Section A, multiple choice' })).toHaveAttribute('aria-valuetext', '1 of 3');
    expect(screen.getByRole('meter', { name: 'Section B, short answer' })).toHaveAttribute('aria-valuetext', '2 of 3');
    expect(screen.getByRole('meter', { name: 'Section C, case study' })).toHaveAttribute('aria-valuetext', '0 of 3');
    expect(screen.getByText(/You used 20 minutes of the 2 hours 15 minutes allowed/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Drill U3O2-KK03/ })).toHaveAttribute('href', '/drill?kk=U3O2-KK03');

    // Every answered item is recorded; unanswered ones are not.
    const log = useAttempts.getState().log.map(([id, , score]) => [id, score]);
    expect(log).toEqual([
      [mcqA.id, 1],
      [mcqB.id, 0],
      [short.id, 0.67],
    ]);
    const { paper, history } = useExam.getState();
    expect(paper).toBeNull();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ mode: 'full', sections: { a: [1, 3], b: [2, 3], c: [0, 3] }, usedMs: 20 * MIN });
  });

  it('submits automatically when writing time has run out, even after the tab was closed', () => {
    seedWriting();
    vi.setSystemTime(T0 + 3 * 60 * MIN);
    renderExam('/exam?sit=1');
    expect(screen.getByRole('heading', { level: 1, name: 'Mark your paper' })).toBeInTheDocument();
    expect(screen.getByText(/submitted automatically when writing time ended/)).toBeInTheDocument();
    expect(useExam.getState().paper).toMatchObject({ submittedAt: T0 - 20 * MIN + 135 * MIN, autoSubmitted: true });
  });

  it('offers to resume a paper in progress, and discards it only after confirming', () => {
    seedWriting();
    renderExam('/exam');
    expect(screen.getByRole('heading', { name: 'Paper in progress' })).toBeInTheDocument();
    expect(screen.getByText(/Writing time: 1 hour 55 minutes left\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Resume paper' })).toHaveAttribute('href', '/exam?sit=1');
    expect(screen.queryByRole('button', { name: 'Start full paper' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Stop and discard this paper' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Stop and discard this paper?' })).getByRole('button', { name: 'Keep this paper' }));
    expect(useExam.getState().paper).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Stop and discard this paper' }));
    act(() => {
      fireEvent.click(within(screen.getByRole('dialog', { name: 'Stop and discard this paper?' })).getByRole('button', { name: 'Discard paper' }));
    });
    expect(useExam.getState().paper).toBeNull();
    expect(screen.getByText(/Paper discarded\. Nothing from it was recorded\./)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Exam' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Start full paper' })).toBeInTheDocument();
  });

  it('works from the keyboard: arrow keys move between section tabs, and moving to a question focuses it', () => {
    seedWriting();
    renderExam('/exam?sit=1');
    const tabA = screen.getByRole('tab', { name: /Section A/ });
    tabA.focus();
    fireEvent.keyDown(tabA, { key: 'ArrowRight' });
    const tabB = screen.getByRole('tab', { name: /Section B/ });
    expect(tabB).toHaveAttribute('aria-selected', 'true');
    expect(tabB).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tabB.id);
    fireEvent.keyDown(tabB, { key: 'End' });
    expect(screen.getByRole('tab', { name: /Section C/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: /Section C/ }), { key: 'ArrowRight' });
    expect(tabA).toHaveFocus();
    expect(tabA).toHaveAttribute('tabindex', '0');
    expect(tabB).toHaveAttribute('tabindex', '-1');

    fireEvent.click(screen.getByRole('button', { name: 'Question 3, not answered' }));
    expect(screen.getByRole('heading', { level: 2, name: /Question 3/ })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Go to Section B' }));
    expect(screen.getByRole('tab', { name: /Section B/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 2, name: /Question 1/ })).toHaveFocus();
  });

  it("shows the case study insert in Section C, and a question's own figures with it", () => {
    const study = fxCaseStudy('cs-01');
    const [q1, q2] = study.questions;
    const withFigure = {
      ...study,
      questions: [q1, { ...q2, figures: [{ id: 'fig-own', kind: 'table' as const, title: 'Shift rota', columns: ['Day', 'Staff'], rows: [['Monday', '3']] }] }],
    };
    provideContent(fixtureIndex({ mcq: [mcqA], short: [short], caseStudies: [withFigure] }));
    examActions.start({ mode: 'mini', seed: 1, sections: { a: [mcqA.id], b: [short.id], c: [q1.id, q2.id] }, caseStudyId: 'cs-01', timing: FULL_TIMING }, T0 - 20 * MIN);
    renderExam('/exam?sit=1');
    fireEvent.click(screen.getByRole('tab', { name: /Section C/ }));
    expect(screen.getByText('Show the case study insert')).toBeInTheDocument();
    expect(screen.getByText(/Riverbend Freight is a Geelong freight company/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Question 2\b/ }));
    expect(screen.getAllByText('Shift rota').length).toBeGreaterThan(0);
  });

  it('says so when a report is not in history', () => {
    renderExam('/exam?report=p-nope-1');
    expect(screen.getByRole('heading', { name: 'Report not found' })).toBeInTheDocument();
  });
});
