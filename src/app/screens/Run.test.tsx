import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { melbourneDate } from '../../lib/time';
import { useAttempts } from '../../state/attempts';
import { useSession } from '../../state/session';
import { useSettings } from '../../state/settings';
import { useTerminal } from '../../terminal/useTerminal';
import { fixtureIndex, fxCard, fxMcq, provideContent, resetStudyStores } from '../study/testing';
import Run from './Run';

// The run only needs to know whether the daily game exists; a test can hide it.
const registry = vi.hoisted(() => ({ dailyInstalled: true }));
vi.mock('../../games/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../games/registry')>();
  return {
    ...actual,
    findGame: (id: string) => {
      if (id !== 'daily') return actual.findGame(id);
      return registry.dailyInstalled ? { id: 'daily' } : undefined;
    },
  };
});

function renderRun() {
  const router = createMemoryRouter([{ path: '/run', element: <Run /> }], { initialEntries: ['/run'] });
  render(<RouterProvider router={router} />);
  return router;
}

function press(key: string) {
  fireEvent.keyDown(document.activeElement ?? document.body, { key });
}

function steps() {
  return within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('listitem');
}

/** The Run complete summary, one line per step. */
function summary(): string[] {
  return ['Review cards', 'Drill your weakest key knowledge', 'Daily challenge'].map(
    (title) => screen.getByText(title, { selector: 'dt' }).nextElementSibling?.textContent ?? '',
  );
}

describe("Today's run", () => {
  beforeEach(() => {
    resetStudyStores();
    registry.dailyInstalled = true;
    useTerminal.setState({ open: false, pending: null, lastGameEnd: null });
    useSettings.setState({ onboarded: true, motion: 'reduce' });
  });
  afterEach(() => {
    resetStudyStores();
    useTerminal.setState({ open: false, pending: null, lastGameEnd: null });
  });

  it('runs review, then the drill, then hands the daily challenge to the terminal', () => {
    provideContent(
      fixtureIndex({
        cards: [fxCard('c-u3o1-kk04-001', ['U3O1-KK04'])],
        mcq: [fxMcq('m-u3o1-kk04-001', ['U3O1-KK04'])],
      }),
    );
    renderRun();
    expect(screen.getByRole('heading', { name: 'Step 1 of 3: Review cards' })).toBeInTheDocument();
    expect(steps()[0]).toHaveAttribute('aria-current', 'step');

    // Step 1: one new card.
    press(' ');
    press('3');
    expect(screen.getByRole('heading', { name: 'Step 2 of 3: Drill your weakest key knowledge' })).toHaveFocus();
    expect(steps()[0]).toHaveTextContent('Done: 1 card reviewed, 1 of them new.');
    expect(steps()[1]).toHaveAttribute('aria-current', 'step');

    // Step 2: a one-question drill (the fixture's answer is C).
    press('c');
    press('Enter');
    fireEvent.click(screen.getByRole('button', { name: 'Finish drill' }));
    expect(screen.getByRole('heading', { name: 'Step 3 of 3: Daily challenge' })).toHaveFocus();
    expect(steps()[1]).toHaveTextContent('Done: 1 of 1 correct.');
    expect(useAttempts.getState().log.map((t) => t[0])).toEqual(['c-u3o1-kk04-001', 'm-u3o1-kk04-001']);

    // Step 3: the terminal runs `daily`; its game end completes the run.
    fireEvent.click(screen.getByRole('button', { name: 'Start the daily challenge' }));
    expect(useTerminal.getState()).toMatchObject({ open: true, pending: 'daily' });
    act(() => useTerminal.getState().reportGameEnd({ gameId: 'sort', score: 3, total: 10, at: Date.now() }));
    expect(screen.queryByRole('heading', { name: 'Run complete' })).toBeNull();
    act(() => useTerminal.getState().reportGameEnd({ gameId: 'daily', score: 8, total: 10, at: Date.now() }));
    expect(screen.getByRole('heading', { name: 'Run complete' })).toHaveFocus();
    expect(summary()).toEqual(['Done: 1 card reviewed, 1 of them new.', 'Done: 1 of 1 correct.', 'Done: 8 of 10 correct.']);
  });

  it('skips steps with nothing to do, with a note, and counts a daily already done today', () => {
    provideContent(fixtureIndex());
    const today = melbourneDate(Date.now());
    useSession.getState().beginDaily(today, Array.from({ length: 10 }, (_, i) => `m-x-${i}`));
    for (let i = 0; i < 10; i++) useSession.getState().recordDaily(today, i, i % 2 === 0, Date.now());
    renderRun();
    expect(screen.getByRole('heading', { name: 'Run complete' })).toBeInTheDocument();
    expect(summary()).toEqual(['Skipped: Nothing was due.', 'Skipped: There are no questions to drill yet.', 'Done: Already done today: 5 of 10 correct.']);
  });

  it('completes the daily step from today\'s record as well as the terminal', () => {
    provideContent(fixtureIndex());
    renderRun();
    expect(screen.getByRole('heading', { name: 'Step 3 of 3: Daily challenge' })).toBeInTheDocument();
    const today = melbourneDate(Date.now());
    act(() => {
      useSession.getState().beginDaily(today, Array.from({ length: 10 }, (_, i) => `m-x-${i}`));
      for (let i = 0; i < 10; i++) useSession.getState().recordDaily(today, i, true, Date.now());
    });
    expect(screen.getByRole('heading', { name: 'Run complete' })).toBeInTheDocument();
    expect(summary()[2]).toBe('Done: 10 of 10 correct.');
  });

  it('lets the student skip the daily challenge', () => {
    provideContent(fixtureIndex());
    renderRun();
    fireEvent.click(screen.getByRole('button', { name: 'Skip the daily challenge' }));
    expect(screen.getByRole('heading', { name: 'Run complete' })).toBeInTheDocument();
    expect(summary()[2]).toBe('Skipped: Type daily in the terminal to take it later today.');
  });

  it('skips the daily challenge when this build has no daily game', () => {
    registry.dailyInstalled = false;
    provideContent(fixtureIndex());
    renderRun();
    expect(screen.getByRole('heading', { name: 'Run complete' })).toBeInTheDocument();
    expect(summary()[2]).toBe("Skipped: The daily challenge isn't in this version of COLDBOOT yet.");
  });
});
