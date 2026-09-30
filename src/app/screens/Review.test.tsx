import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { useAttempts } from '../../state/attempts';
import { useSession } from '../../state/session';
import { useSettings } from '../../state/settings';
import { useSrs } from '../../state/srs';
import { useReportDialog } from '../../ui/report';
import { fixtureIndex, fxCard, fxMcq, provideContent, resetStudyStores } from '../study/testing';
import Review from './Review';

function renderReview(path = '/review') {
  const router = createMemoryRouter(
    [
      { path: '/review', element: <Review /> },
      { path: '/drill', element: <p>Drill screen</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function press(key: string) {
  fireEvent.keyDown(document.activeElement ?? document.body, { key });
}

const basic = fxCard('c-u3o1-kk04-001', ['U3O1-KK04'], {
  front: 'Why store a phone number as a string?',
  back: 'It keeps leading zeros and is never used in arithmetic.',
  mistake: 'A phone number is not an integer just because it is made of digits.',
});
const second = fxCard('c-u3o1-kk04-002', ['U3O1-KK04'], { front: 'Name the check that rejects a blank field.', back: 'An existence check.' });

describe('Review card flip', () => {
  beforeEach(() => {
    resetStudyStores();
    useSettings.setState({ onboarded: true, motion: 'reduce' });
    provideContent(fixtureIndex({ cards: [basic, second] }));
  });
  afterEach(() => {
    vi.useRealTimers();
    resetStudyStores();
  });

  it('flips with Space, rates with 1 to 4 and advances, and opens the report with R', () => {
    renderReview();
    expect(screen.getByText('2 new cards are ready.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }));

    const first = screen.getByRole('region', { name: 'Card 1 of 2, question' });
    expect(first).toHaveFocus();
    expect(within(first).getByText('Why store a phone number as a string?')).toBeInTheDocument();
    expect(screen.queryByText(/It keeps leading zeros/)).toBeNull();

    // Digits do nothing until the card is flipped.
    press('3');
    expect(useAttempts.getState().log).toHaveLength(0);

    press(' ');
    const flipped = screen.getByRole('region', { name: 'Card 1 of 2, answer shown' });
    expect(within(flipped).getByText(/It keeps leading zeros/)).toBeInTheDocument();
    expect(within(flipped).getByRole('list', { name: 'Key knowledge' })).toHaveTextContent('U3O1-KK04');
    expect(within(flipped).getByRole('complementary', { name: 'Common mistake' })).toHaveTextContent('A phone number is not an integer');
    expect(screen.getByRole('button', { name: 'Again, comes back in 10 minutes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Good, comes back in 1 day' })).toBeInTheDocument();

    press('3');
    const state = useSrs.getState();
    expect(state.cards['c-u3o1-kk04-001']).toMatchObject({ reps: 1, interval: 1, ease: 2.5, lapses: 0 });
    expect(state.introduced.count).toBe(1);
    const log = useAttempts.getState().log;
    expect(log).toHaveLength(1);
    expect(log[0].slice(0, 3)).toEqual(['c-u3o1-kk04-001', ['U3O1-KK04'], 0.8]);
    expect(Object.values(useSession.getState().activity)[0].reviews).toBe(1);

    expect(screen.getByRole('region', { name: 'Card 2 of 2, question' })).toHaveFocus();
    press('r');
    expect(useReportDialog.getState().request).toEqual({ itemId: 'c-u3o1-kk04-002', where: 'Review' });
  });

  it('ignores the shortcuts while the report dialog is open', () => {
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }));
    act(() => useReportDialog.getState().openReport({ itemId: 'x1' }));
    press(' ');
    expect(screen.getByRole('region', { name: 'Card 1 of 2, question' })).toBeInTheDocument();
  });

  it('flips with the Show answer button and rates with the buttons', () => {
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }));
    fireEvent.click(screen.getByRole('button', { name: /^Easy/ }));
    expect(useAttempts.getState().log[0][2]).toBe(1);
    expect(useSrs.getState().cards['c-u3o1-kk04-001'].ease).toBeCloseTo(2.6);
  });

  it('brings a card rated Again back 10 minutes later in the same session', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'setInterval'] });
    vi.setSystemTime(new Date(2026, 9, 1, 19, 0));
    provideContent(fixtureIndex({ cards: [basic] }));
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }));
    press(' ');
    press('1');
    expect(useSrs.getState().cards['c-u3o1-kk04-001']).toMatchObject({ reps: 0, lapses: 1 });
    expect(screen.getByRole('heading', { name: 'Next card in 10 minutes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish now' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10 * 60_000 + 1000);
    });
    expect(screen.getByRole('region', { name: 'Card 2 of 2, question' })).toBeInTheDocument();
    press(' ');
    press('3');
    expect(screen.getByRole('heading', { name: 'Review complete' })).toHaveFocus();
    // The new card counted once toward the day's limit, and both ratings were recorded.
    expect(useSrs.getState().introduced.count).toBe(1);
    expect(useAttempts.getState().log.map((t) => t[2])).toEqual([0, 0.8]);
    expect(screen.getByText('Cards reviewed').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Rated Again').nextSibling).toHaveTextContent('1 time');
    expect(screen.getByText('Your next review is due tomorrow.')).toBeInTheDocument();
  });

  it('lets the student finish while waiting for a requeued card', () => {
    provideContent(fixtureIndex({ cards: [basic] }));
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }));
    press(' ');
    press('1');
    fireEvent.click(screen.getByRole('button', { name: 'Finish now' }));
    expect(screen.getByRole('heading', { name: 'Review complete' })).toBeInTheDocument();
  });

  it('offers to review the cards left after finishing early', () => {
    provideContent(fixtureIndex({ cards: [basic, second] }));
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }));
    press(' ');
    press('3');
    fireEvent.click(screen.getByRole('button', { name: 'Finish review' }));
    expect(screen.getByRole('heading', { name: 'Review complete' })).toBeInTheDocument();
    expect(screen.getByText('You finished early. 1 new card is ready.')).toBeInTheDocument();
    expect(screen.getByText('After those, your next card is due tomorrow.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Drill' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review the remaining card' }));
    expect(screen.getByRole('region', { name: 'Card 1 of 1, question' })).toBeInTheDocument();
  });

  it('shows a reverse card in the reverse direction on odd reps', () => {
    const term = fxCard('t-validation', ['TERMS'], { type: 'reverse', front: 'Validation', back: 'Checking that input is reasonable before processing it.' });
    provideContent(fixtureIndex({ cards: [term] }));
    useSrs.getState().setCard('t-validation', { reps: 1, interval: 1, ease: 2.5, due: Date.now() - 1000, lapses: 0, last: 1 });
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }));
    expect(screen.getByText('Checking that input is reasonable before processing it.')).toBeInTheDocument();
    expect(screen.getByText('Name the term this defines.')).toBeInTheDocument();
    expect(screen.queryByText('Validation')).toBeNull();
    press(' ');
    expect(screen.getByText('Validation')).toBeInTheDocument();
  });

  it('hides cloze gaps until the flip', () => {
    const cloze = fxCard('c-u3o1-kk10-001', ['U3O1-KK10'], { type: 'cloze', front: 'A {{range check}} rejects 150 as an age.', back: 'Ages fall in a known range.' });
    provideContent(fixtureIndex({ cards: [cloze] }));
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }));
    expect(screen.queryByText('range check')).toBeNull();
    press(' ');
    expect(screen.getByText('range check')).toBeInTheDocument();
  });

  it('says when nothing is due and offers a drill', () => {
    provideContent(fixtureIndex({ cards: [basic, second], mcq: [fxMcq('m-u3o1-kk04-001', ['U3O1-KK04'])] }));
    useSrs.getState().setCard('c-u3o1-kk04-001', { reps: 1, interval: 1, ease: 2.5, due: Date.now() + 86_400_000, lapses: 0, last: 1 });
    useSrs.getState().setCard('c-u3o1-kk04-002', { reps: 1, interval: 1, ease: 2.5, due: Date.now() + 86_400_000, lapses: 0, last: 1 });
    renderReview();
    expect(screen.getByRole('heading', { name: 'No reviews due' })).toBeInTheDocument();
    expect(screen.getByText(/^Your next review is due /)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Drill' })).toHaveAttribute('href', '/drill');
  });

  it('says when there are no flashcards for a focused KK and offers its drill', () => {
    provideContent(fixtureIndex({ cards: [basic], mcq: [fxMcq('m-u4o2-kk03-001', ['U4O2-KK03'])] }));
    renderReview('/review?kk=U4O2-KK03');
    expect(screen.getByRole('heading', { name: 'No flashcards yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Drill this key knowledge' })).toHaveAttribute('href', '/drill?kk=U4O2-KK03');
  });

  it('points to the syllabus map when a KK has nothing to review or drill', () => {
    renderReview('/review?kk=U4O2-KK03');
    expect(screen.getByText(/The syllabus map shows what you can practise now\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the syllabus map' })).toHaveAttribute('href', '/map');
  });

  it('focuses the queue on one KK', () => {
    const other = fxCard('c-u3o2-kk01-001', ['U3O2-KK01']);
    provideContent(fixtureIndex({ cards: [basic, other] }));
    renderReview('/review?kk=U3O2-KK01');
    expect(screen.getByText('1 new card is ready.')).toBeInTheDocument();
  });
});
