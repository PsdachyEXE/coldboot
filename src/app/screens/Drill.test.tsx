import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { useAttempts } from '../../state/attempts';
import { useSettings } from '../../state/settings';
import { useAnnouncer } from '../../ui/announce';
import { useReportDialog } from '../../ui/report';
import { fixtureIndex, fxCard, fxMcq, provideContent, resetStudyStores } from '../study/testing';
import Drill from './Drill';

function renderDrill(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/drill', element: <Drill /> },
      { path: '/review', element: <p>Review screen</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function press(key: string) {
  fireEvent.keyDown(document.activeElement ?? document.body, { key });
}

const q1 = fxMcq('m-u3o1-kk04-001', ['U3O1-KK04'], {
  stem: 'Which data type suits a phone number?',
  options: ['Integer', 'Floating point', 'String', 'Boolean'],
  answer: 2,
  explanation: 'A phone number keeps its leading zero and is never used in arithmetic.',
  whyWrong: ['An integer drops the leading zero.', 'It is not a measurement.', '', 'It has more than two values.'],
});
const q2 = fxMcq('m-u3o1-kk04-002', ['U3O1-KK04'], { stem: 'Second question?' });

describe('Drill', () => {
  beforeEach(() => {
    resetStudyStores();
    useSettings.setState({ onboarded: true, motion: 'reduce' });
    provideContent(fixtureIndex({ mcq: [q1, q2], cards: [fxCard('c-u3o1-kk04-001', ['U3O1-KK04'])] }));
  });
  afterEach(() => {
    vi.useRealTimers();
    resetStudyStores();
  });

  function answerQuestion(stem: string, key: string) {
    const region = screen.getByRole('region', { name: stem });
    press(key);
    press('Enter');
    return region;
  }

  it('shows feedback, marks the answer by glyph and words, and records each answer', () => {
    renderDrill('/drill?kk=U3O1-KK04');
    expect(screen.getByText(/2 questions\./)).toBeInTheDocument();
    // The round is shuffled, so work out which question came first.
    const order = screen.queryByText('Which data type suits a phone number?') ? [q1, q2] : [q2, q1];

    // Answer the phone number question wrongly, whichever comes first.
    for (const q of order) {
      if (q === q1) {
        const region = answerQuestion('Which data type suits a phone number?', 'a');
        expect(within(region).getByText('Incorrect')).toBeInTheDocument();
        expect(within(region).getByText(/Correct answer/)).toBeInTheDocument();
        expect(within(region).getByText(/Your answer/)).toBeInTheDocument();
        expect(within(region).getByText('An integer drops the leading zero.')).toBeInTheDocument();
        expect(within(region).getByText('It has more than two values.')).toBeInTheDocument();
        expect(within(region).getByText('A phone number keeps its leading zero and is never used in arithmetic.')).toBeInTheDocument();
        expect(useAnnouncer.getState().polite).toBe('Incorrect. The answer is C.');
        fireEvent.click(within(region).getByRole('button', { name: 'Report a problem' }));
        expect(useReportDialog.getState().request).toEqual({ itemId: 'm-u3o1-kk04-001', where: 'Drill' });
        act(() => useReportDialog.getState().closeReport());
      } else {
        const region = answerQuestion('Second question?', 'c');
        expect(within(region).getByText('Correct')).toBeInTheDocument();
        expect(within(region).getByText(/Your answer is correct/)).toBeInTheDocument();
      }
      fireEvent.click(screen.getByRole('button', { name: q === order[1] ? 'Finish drill' : 'Next question' }));
    }

    const log = useAttempts.getState().log;
    expect(log.map((t) => [t[0], t[2]]).sort()).toEqual([
      ['m-u3o1-kk04-001', 0],
      ['m-u3o1-kk04-002', 1],
    ]);

    expect(screen.getByRole('heading', { name: 'Drill complete' })).toHaveFocus();
    expect(screen.getByText('1 of 2 correct')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Results by key knowledge' });
    expect(within(table).getByRole('rowheader')).toHaveTextContent('U3O1-KK04');
    expect(within(table).getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review this key knowledge' })).toHaveAttribute('href', '/review?kk=U3O1-KK04');
  });

  it('lets you choose with 1 to 4 and check with the button', () => {
    provideContent(fixtureIndex({ mcq: [q1] }));
    renderDrill('/drill?kk=U3O1-KK04');
    const check = screen.getByRole('button', { name: 'Check answer' });
    expect(check).toBeDisabled();
    press('3');
    expect(screen.getByRole('radio', { name: /String/ })).toBeChecked();
    fireEvent.click(check);
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(useAttempts.getState().log[0][2]).toBe(1);
    // Pressing a letter after checking changes nothing.
    press('a');
    expect(screen.getByRole('radio', { name: /String/ })).toBeChecked();
    expect(useAttempts.getState().log).toHaveLength(1);
  });

  it('starts a round from the setup form', () => {
    const router = renderDrill('/drill');
    expect(screen.getByRole('heading', { name: 'Drill' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('One key knowledge point'));
    const select = screen.getByLabelText('Key knowledge point') as HTMLSelectElement;
    expect(select.value).toBe('U3O1-KK04');
    expect(within(select).getByRole('option', { name: /U3O1-KK01 .*\(none yet\)/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    expect(router.state.location.search).toBe('?kk=U3O1-KK04');
    expect(screen.getByText(/Question 1 of 2/)).toBeInTheDocument();
  });

  it('runs a timed round, warns at 1 minute left and scores unanswered questions wrong', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'setInterval'] });
    vi.setSystemTime(new Date(2026, 9, 1, 19, 0));
    renderDrill('/drill?mode=random&timed=1');
    // Two questions at Section A pace: 2 x 72 s.
    expect(screen.getByText(/Timed: 2 questions in 2 minutes 24 seconds\./)).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('Time left 2:24');
    press('c');
    press('Enter');
    expect(useAttempts.getState().log).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(90_000);
    });
    expect(useAnnouncer.getState().assertive).toBe('1 minute left.');
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole('heading', { name: 'Drill complete' })).toBeInTheDocument();
    expect(screen.getByText(/Time's up\. 1 question was unanswered and counts as wrong\./)).toBeInTheDocument();
    expect(screen.getByText(/of 2 correct/)).toBeInTheDocument();
    // Unanswered questions are scored, not recorded as attempts.
    expect(useAttempts.getState().log).toHaveLength(1);
  });

  it('says so when a KK has no questions and offers its flashcards', () => {
    renderDrill('/drill?kk=U3O2-KK05');
    expect(screen.getByRole('heading', { name: /No questions for U3O2-KK05/ })).toBeInTheDocument();
  });

  it('points the glossary to its flashcards without saying questions are coming', () => {
    provideContent(fixtureIndex({ mcq: [q1], cards: [fxCard('t-algorithm', ['TERMS'])] }));
    renderDrill('/drill?kk=TERMS');
    expect(screen.getByRole('heading', { name: 'The glossary is practised with flashcards' })).toBeInTheDocument();
    expect(screen.queryByText(/yet/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Review the glossary' })).toHaveAttribute('href', '/review?kk=TERMS');
  });

  it('flags a drill link it does not understand', () => {
    renderDrill('/drill?kk=U9O9-KK99');
    expect(screen.getByText(/That drill link names something COLDBOOT doesn't have/)).toBeInTheDocument();
  });

  it('shows an empty state with no questions at all', () => {
    provideContent(fixtureIndex());
    renderDrill('/drill');
    expect(screen.getByRole('heading', { name: 'No multiple-choice questions yet' })).toBeInTheDocument();
  });
});
