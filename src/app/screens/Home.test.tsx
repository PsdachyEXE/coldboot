import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { kkLabel } from '../../content/studyDesign';
import { melbourneDate } from '../../lib/time';
import { recordAttempt } from '../../state/record';
import { useSession } from '../../state/session';
import { useSettings } from '../../state/settings';
import { useSrs } from '../../state/srs';
import { fixtureIndex, fxCard, fxMcq, provideContent, resetStudyStores } from '../study/testing';
import Home from './Home';

const NOW = new Date(2026, 9, 1, 18, 0).getTime();

function renderHome() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <Home /> },
      { path: '/run', element: <h1>Run screen</h1> },
      { path: '/drill', element: <h1>Drill screen</h1> },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('Home', () => {
  beforeEach(() => {
    resetStudyStores();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    useSettings.setState({ onboarded: true, motion: 'reduce' });
    provideContent(
      fixtureIndex({
        cards: [fxCard('c-u3o1-kk04-001', ['U3O1-KK04']), fxCard('c-u3o1-kk04-002', ['U3O1-KK04'])],
        mcq: [fxMcq('m-u3o2-kk08-001', ['U3O2-KK08'])],
      }),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    resetStudyStores();
  });

  it('has one primary action, Start today\'s run, which goes to /run', () => {
    const router = renderHome();
    const start = screen.getByRole('link', { name: "Start today's run" });
    expect(start).toHaveAttribute('href', '/run');
    const run = screen.getByRole('list', { name: "Today's run" });
    expect(within(run).getAllByRole('listitem')).toHaveLength(3);
    expect(within(run).getByText('Learn 2 new cards.')).toBeInTheDocument();
    // Nothing tried yet, so the drill starts with key knowledge not tried, not "your weakest".
    expect(within(run).getByText(/starting with key knowledge you haven't tried yet, U3O2-KK08/)).toBeInTheDocument();
    fireEvent.click(start);
    expect(router.state.location.pathname).toBe('/run');
  });

  it('shows the due count, the streak and today\'s daily challenge status', () => {
    const card = { reps: 1, interval: 1, ease: 2.5, due: NOW - 1000, lapses: 0, last: NOW - 86_400_000 };
    useSrs.getState().setCard('c-u3o1-kk04-001', card);
    recordAttempt({ itemId: 'm-u3o2-kk08-001', kk: ['U3O2-KK08'], score: 1, timestamp: NOW - 3_600_000, ms: 1000 });
    const today = melbourneDate(NOW);
    useSession.getState().beginDaily(today, Array.from({ length: 10 }, (_, i) => `m-x-${i}`));
    for (let i = 0; i < 10; i++) useSession.getState().recordDaily(today, i, i < 8, NOW);
    renderHome();
    const facts = screen.getByText('Reviews due').closest('dl')!;
    expect(within(facts).getByText('Reviews due').nextSibling).toHaveTextContent('1');
    expect(within(facts).getByText('Streak').nextSibling).toHaveTextContent('1 day');
    expect(within(facts).getByText('Daily challenge').nextSibling).toHaveTextContent('Done, 8 of 10');
  });

  it('names the weakest key knowledge once there are attempts', () => {
    recordAttempt({ itemId: 'm-u3o2-kk08-001', kk: ['U3O2-KK08'], score: 0, timestamp: NOW - 3_600_000, ms: 1000 });
    renderHome();
    const run = screen.getByRole('list', { name: "Today's run" });
    expect(within(run).getByText(/starting with your weakest key knowledge, U3O2-KK08/)).toBeInTheDocument();
  });

  it('asks the student to finish a daily challenge already begun', () => {
    const today = melbourneDate(NOW);
    useSession.getState().beginDaily(today, Array.from({ length: 10 }, (_, i) => `m-x-${i}`));
    for (let i = 0; i < 5; i++) useSession.getState().recordDaily(today, i, true, NOW);
    renderHome();
    const run = screen.getByRole('list', { name: "Today's run" });
    expect(within(run).getByText('Finish the daily challenge: 5 of 10 answered.')).toBeInTheDocument();
  });

  it('says when the daily challenge is not done', () => {
    renderHome();
    expect(screen.getByText('Daily challenge').nextSibling).toHaveTextContent('Not done yet');
  });

  it('shows every KK as a cell, with unseen cells distinct from weak ones', () => {
    recordAttempt({ itemId: 'm-u3o1-kk04-001', kk: ['U3O1-KK04'], score: 0.2, timestamp: NOW - 60_000, ms: 1000 });
    renderHome();
    const grid = screen.getByRole('region', { name: 'Coverage' });
    const weak = within(grid).getByRole('button', { name: `${kkLabel('U3O1-KK04')}, 20% mastery` });
    const unseen = within(grid).getByRole('button', { name: `${kkLabel('U3O1-KK05')}, unseen` });
    expect(weak).toHaveAttribute('data-band', 'weak');
    expect(unseen).toHaveAttribute('data-band', 'unseen');
    // Unseen has no gauge; weak shows one lit segment of four.
    expect(unseen.querySelectorAll('[data-on]')).toHaveLength(0);
    expect(weak.querySelectorAll('[data-on]')).toHaveLength(4);
    expect(weak.querySelectorAll('[data-on="true"]')).toHaveLength(1);
    expect(within(grid).getByRole('button', { name: 'Terms used in this study, unseen' })).toBeInTheDocument();
    // The accessible name starts with the visible label, so voice users can say "click PSM".
    expect(within(grid).getByRole('button', { name: /^PSM, / })).toBeInTheDocument();
    expect(within(grid).getByRole('group', { name: /^U4O2/ })).toBeInTheDocument();
    expect(within(grid).getByRole('list', { name: 'Key' })).toHaveTextContent('Unseen');
  });

  it('starts a focused drill from a cell', () => {
    const router = renderHome();
    fireEvent.click(screen.getByRole('button', { name: `${kkLabel('U3O2-KK08')}, unseen` }));
    expect(router.state.location.pathname).toBe('/drill');
    expect(router.state.location.search).toBe('?kk=U3O2-KK08');
  });
});
