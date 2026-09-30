import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { useAttempts } from '../../state/attempts';
import { storageKey } from '../../state/storage';
import { useSettings } from '../../state/settings';
import { fixtureIndex, fxCaseStudy, fxShort, provideContent, resetStudyStores } from '../study/testing';
import { markScore } from '../study/written';
import Written from './Written';

function renderWritten(path: string) {
  const router = createMemoryRouter([{ path: '/written', element: <Written /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const item = fxShort('s-u3o1-kk04-001', ['U3O1-KK04'], {
  commandTerm: 'justify',
  marks: 3,
  prompt: 'Justify storing a phone number as a string.',
  points: [
    { text: 'Keeps the leading zero', marks: 1 },
    { text: 'No arithmetic is done on it', marks: 1 },
    { text: 'Can hold spaces or a plus sign', marks: 1 },
    { text: 'Links the choice to the scenario', marks: 1 },
  ],
  model: 'A string keeps the leading zero and allows spaces.',
  mistake: 'Digits alone do not make a number an integer.',
});

describe('markScore', () => {
  it('scores ticked marks over marks available, capped at the marks available', () => {
    expect(markScore(item, new Set())).toEqual({ earned: 0, score: 0 });
    expect(markScore(item, new Set([0, 2]))).toEqual({ earned: 2, score: 2 / 3 });
    expect(markScore(item, new Set([0, 1, 2, 3]))).toEqual({ earned: 3, score: 1 });
    const weighted = { marks: 4, points: [{ text: 'a', marks: 2 }, { text: 'b', marks: 1 }, { text: 'c', marks: 2 }] };
    expect(markScore(weighted, new Set([0, 2]))).toEqual({ earned: 4, score: 1 });
    expect(markScore(weighted, new Set([1]))).toEqual({ earned: 1, score: 0.25 });
  });
});

describe('Written', () => {
  beforeEach(() => {
    resetStudyStores();
    window.sessionStorage.clear();
    useSettings.setState({ onboarded: true, motion: 'reduce' });
    provideContent(fixtureIndex({ short: [item], caseStudies: [fxCaseStudy()] }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resetStudyStores();
    window.sessionStorage.clear();
  });

  it('shows the command term, marks and suggested length, and keeps a draft', () => {
    renderWritten('/written?kk=U3O1-KK04');
    expect(screen.getByText('Justify')).toBeInTheDocument();
    expect(screen.getByText('(3 marks)')).toBeInTheDocument();
    expect(screen.getByText(/Suggested length: About 3 developed points, one per mark\./)).toBeInTheDocument();
    const box = screen.getByLabelText('Your answer');
    fireEvent.change(box, { target: { value: 'It keeps the <b>zero</b>.' } });
    expect(window.sessionStorage.getItem(storageKey('draft:s-u3o1-kk04-001'))).toBe('It keeps the <b>zero</b>.');
  });

  it('gives the right score for the ticked points, records it and shows the mistake note', () => {
    renderWritten('/written?kk=U3O1-KK04');
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'Leading zeros matter.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show model answer' }));
    expect(screen.getByRole('heading', { name: 'Model answer' })).toHaveFocus();
    expect(screen.getByText('A string keeps the leading zero and allows spaces.')).toBeInTheDocument();
    expect(screen.getByLabelText('Your answer')).toHaveAttribute('readonly');

    const points = screen.getByRole('group', { name: 'Tick the marking points your answer earned' });
    const boxes = within(points).getAllByRole('checkbox');
    expect(boxes).toHaveLength(4);
    expect(within(points).getAllByText('(1 mark)')).toHaveLength(4);

    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[2]);
    expect(screen.getByText('Your mark: 2 of 3 marks')).toBeInTheDocument();
    fireEvent.click(boxes[1]);
    fireEvent.click(boxes[3]);
    expect(screen.getByText('Your mark: 3 of 3 marks (capped at the marks available)')).toBeInTheDocument();
    fireEvent.click(boxes[1]);
    fireEvent.click(boxes[3]);

    expect(screen.queryByText(/Digits alone/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save score' }));
    expect(screen.getByText('Score saved: 2 of 3 marks.')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Common mistake' })).toHaveTextContent('Digits alone do not make a number an integer.');
    const log = useAttempts.getState().log;
    expect(log).toHaveLength(1);
    expect(log[0].slice(0, 3)).toEqual(['s-u3o1-kk04-001', ['U3O1-KK04'], 0.67]);
    expect(window.sessionStorage.getItem(storageKey('draft:s-u3o1-kk04-001'))).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Finish practice' }));
    expect(screen.getByRole('heading', { name: 'Written practice complete' })).toBeInTheDocument();
    expect(screen.getByText('2 of 3 marks')).toBeInTheDocument();
  });

  it('lists case studies on the setup screen', () => {
    renderWritten('/written');
    expect(screen.getByRole('button', { name: 'Start written practice' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practise Riverbend Freight' })).toHaveAttribute('href', '/written?cs=cs-01');
  });

  it('practises a case study with the insert, figure references and question navigation', () => {
    const router = renderWritten('/written?cs=cs-01');
    expect(screen.getByRole('heading', { level: 1, name: 'Riverbend Freight' })).toBeInTheDocument();
    // jsdom has no matchMedia, so this is the narrow layout: the insert folds into a section.
    expect(screen.getByText('Show the case study insert')).toBeInTheDocument();
    expect(screen.getByText(/Riverbend Freight is a Geelong freight company/)).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Case study questions' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Question 1, 1 mark', 'Question 2, 2 marks']);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByText('Referred to in this question').length).toBeGreaterThan(0);
    expect(screen.getByText(/Question 1 of 2 \(1 mark\)/)).toBeInTheDocument();

    fireEvent.click(links[1]);
    expect(router.state.location.search).toBe('?cs=cs-01&q=cs-01-q02');
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Your answer')).toBeInTheDocument();
  });

  it('keeps answers when moving between case study questions, without recording them twice', () => {
    renderWritten('/written?cs=cs-01');
    fireEvent.keyDown(document.body, { key: 'c' });
    fireEvent.keyDown(document.body, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'A range check on weight.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show model answer' }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Save score' }));
    expect(screen.getByText('Answered 2 of 2: 2 of 3 marks so far.')).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Case study questions' });
    fireEvent.click(within(nav).getByRole('link', { name: 'Question 1, 1 mark, answered' }));
    expect(screen.getByText('Correct')).toBeInTheDocument();
    fireEvent.click(within(nav).getByRole('link', { name: 'Question 2, 2 marks, answered' }));
    expect(screen.getByLabelText('Your answer')).toHaveValue('A range check on weight.');
    expect(screen.getByText('Score saved: 1 of 2 marks.')).toBeInTheDocument();
    expect(useAttempts.getState().log.map((t) => [t[0], t[2]])).toEqual([
      ['cs-01-q01', 1],
      ['cs-01-q02', 0.5],
    ]);
  });

  it('shows the insert beside the question on wide screens', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('min-width: 1100px'), media: query, addEventListener: () => {}, removeEventListener: () => {} }));
    renderWritten('/written?cs=cs-01');
    const insert = screen.getByRole('complementary', { name: 'Case study insert: Riverbend Freight' });
    expect(within(insert).getByText('Referred to in this question')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bookings table' })).toBeInTheDocument();
  });

  it('says so when a case study does not exist', () => {
    renderWritten('/written?cs=cs-99');
    expect(screen.getByRole('heading', { name: 'Case study not found' })).toBeInTheDocument();
  });
});
