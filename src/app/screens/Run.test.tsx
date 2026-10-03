import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { melbourneDate } from '../../lib/time';
import { useAttempts } from '../../state/attempts';
import { useSession } from '../../state/session';
import { clearTabState } from '../../state/persist';
import { useSettings } from '../../state/settings';
import { useSrs } from '../../state/srs';
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

    // Step 3: the terminal runs `daily`, with the Daily screen offered instead; its game end completes the run.
    expect(screen.getByRole('link', { name: 'Do it on screen instead' })).toHaveAttribute('href', '/daily');
    fireEvent.click(screen.getByRole('button', { name: 'Start the daily challenge' }));
    expect(screen.getByRole('link', { name: 'Do it on screen instead' })).toHaveAttribute('href', '/daily');
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

  it('counts a drill ended before any answer as skipped', () => {
    provideContent(fixtureIndex({ mcq: [fxMcq('m-u3o1-kk04-001', ['U3O1-KK04'])] }));
    renderRun();
    expect(screen.getByRole('heading', { name: 'Step 2 of 3: Drill your weakest key knowledge' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'End drill now' }));
    expect(screen.getByRole('heading', { name: 'Step 3 of 3: Daily challenge' })).toBeInTheDocument();
    expect(steps()[1]).toHaveTextContent('Skipped: You ended the drill before answering.');
  });

  it('carries on a daily challenge already begun today', () => {
    provideContent(fixtureIndex());
    const today = melbourneDate(Date.now());
    useSession.getState().beginDaily(today, Array.from({ length: 10 }, (_, i) => `m-x-${i}`));
    for (let i = 0; i < 5; i++) useSession.getState().recordDaily(today, i, true, Date.now());
    renderRun();
    expect(screen.getByText(/You've answered 5 of 10\. Carry on from question 6\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue the daily challenge' }));
    expect(useTerminal.getState()).toMatchObject({ open: true, pending: 'daily' });
  });

  it('keeps the daily challenge button in place while the terminal is open, for focus to come back to', () => {
    provideContent(fixtureIndex());
    renderRun();
    const start = screen.getByRole('button', { name: 'Start the daily challenge' });
    start.focus();
    fireEvent.click(start);
    expect(useTerminal.getState()).toMatchObject({ open: true, pending: 'daily' });
    // The same button, relabelled: the drawer returns focus to it when it closes.
    expect(start).toBeInTheDocument();
    expect(start).toHaveAccessibleName('Open the terminal');
    expect(start).toHaveFocus();
    act(() => useTerminal.getState().setOpen(false));
    fireEvent.click(start);
    expect(useTerminal.getState().open).toBe(true);
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

describe("Today's run keeps its place", () => {
  const RUN_KEY = 'coldboot:v1:run';

  beforeEach(() => {
    resetStudyStores();
    registry.dailyInstalled = true;
    useTerminal.setState({ open: false, pending: null, lastGameEnd: null });
    useSettings.setState({ onboarded: true, motion: 'reduce' });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetStudyStores();
    useTerminal.setState({ open: false, pending: null, lastGameEnd: null });
  });

  /** Run, the Daily screen and somewhere else, in one router, so the run can be left and come back to. */
  function renderApp() {
    const router = createMemoryRouter(
      [
        { path: '/run', element: <Run /> },
        { path: '/daily', element: <h1>Daily screen</h1> },
        { path: '/map', element: <h1>Syllabus map</h1> },
      ],
      { initialEntries: ['/run'] },
    );
    render(<RouterProvider router={router} />);
    return router;
  }

  async function go(router: ReturnType<typeof renderApp>, path: string) {
    await act(() => router.navigate(path));
  }

  const oneOfEach = () =>
    provideContent(fixtureIndex({ cards: [fxCard('c-u3o1-kk04-001', ['U3O1-KK04'])], mcq: [fxMcq('m-u3o1-kk04-001', ['U3O1-KK04'])] }));

  /** Rates the card and answers the one drill question, reaching the daily step. */
  function reachDaily() {
    press(' ');
    press('3');
    press('c');
    press('Enter');
    fireEvent.click(screen.getByRole('button', { name: 'Finish drill' }));
    expect(screen.getByRole('heading', { name: 'Step 3 of 3: Daily challenge' })).toBeInTheDocument();
  }

  it('comes back from "Do it on screen instead" to the daily step, not a new run', async () => {
    oneOfEach();
    const router = renderApp();
    reachDaily();
    fireEvent.click(screen.getByRole('link', { name: 'Do it on screen instead' }));
    expect(screen.getByRole('heading', { name: 'Daily screen' })).toBeInTheDocument();
    expect(JSON.parse(window.sessionStorage.getItem(RUN_KEY)!)).toMatchObject({ v: 1, step: 'daily' });

    await go(router, '/run');
    expect(screen.getByRole('heading', { name: 'Step 3 of 3: Daily challenge' })).toBeInTheDocument();
    expect(steps()[0]).toHaveTextContent('Done: 1 card reviewed, 1 of them new.');
    expect(steps()[1]).toHaveTextContent('Done: 1 of 1 correct.');
    expect(useAttempts.getState().log).toHaveLength(2);

    // Finishing the daily on the Daily screen completes the run when the student comes back.
    await go(router, '/daily');
    const today = melbourneDate(Date.now());
    useSession.getState().beginDaily(today, Array.from({ length: 10 }, (_, i) => `m-x-${i}`));
    for (let i = 0; i < 10; i++) useSession.getState().recordDaily(today, i, i < 7, Date.now());
    await go(router, '/run');
    expect(screen.getByRole('heading', { name: 'Run complete' })).toBeInTheDocument();
    expect(summary()).toEqual(['Done: 1 card reviewed, 1 of them new.', 'Done: 1 of 1 correct.', 'Done: 7 of 10 correct.']);
    // A finished run isn't kept: the next visit starts a new one.
    expect(window.sessionStorage.getItem(RUN_KEY)).toBeNull();
  });

  it('follows the daily challenge to the new Melbourne date when the run is resumed after midnight there', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-10-20T23:50:00+11:00'));
      oneOfEach();
      const router = renderApp();
      reachDaily();
      // The Daily screen begins the 20 October challenge, and three are answered before midnight.
      const ids = Array.from({ length: 10 }, (_, i) => `m-x-${i}`);
      fireEvent.click(screen.getByRole('link', { name: 'Do it on screen instead' }));
      useSession.getState().beginDaily('2026-10-20', ids);
      for (let i = 0; i < 3; i++) useSession.getState().recordDaily('2026-10-20', i, true, Date.now());
      expect(JSON.parse(window.sessionStorage.getItem(RUN_KEY)!)).toMatchObject({ step: 'daily', dailyDate: '2026-10-20', day: '2026-10-20' });

      // Half an hour later: a new daily challenge in Melbourne, but still the same study day (before 4 am).
      vi.setSystemTime(new Date('2026-10-21T00:20:00+11:00'));
      await go(router, '/run');
      // The terminal and the Daily screen now play the 21 October set, so the step describes that one.
      expect(screen.getByRole('heading', { name: 'Step 3 of 3: Daily challenge' })).toBeInTheDocument();
      expect(screen.getByText(/^Ten questions, the same for everyone today\./)).toBeInTheDocument();
      expect(screen.queryByText(/You've answered 3 of 10/)).toBeNull();

      // Finishing today's challenge on the Daily screen completes the run.
      await go(router, '/daily');
      useSession.getState().beginDaily('2026-10-21', ids);
      for (let i = 0; i < 10; i++) useSession.getState().recordDaily('2026-10-21', i, i < 7, Date.now());
      await go(router, '/run');
      expect(screen.getByRole('heading', { name: 'Run complete' })).toBeInTheDocument();
      expect(summary()[2]).toBe('Done: 7 of 10 correct.');
    } finally {
      vi.useRealTimers();
    }
  });

  it("completes from the day before's record when that challenge was finished before midnight", async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-10-20T23:40:00+11:00'));
      oneOfEach();
      const router = renderApp();
      reachDaily();
      fireEvent.click(screen.getByRole('link', { name: 'Do it on screen instead' }));
      useSession.getState().beginDaily('2026-10-20', Array.from({ length: 10 }, (_, i) => `m-x-${i}`));
      for (let i = 0; i < 10; i++) useSession.getState().recordDaily('2026-10-20', i, i < 6, Date.now());
      vi.setSystemTime(new Date('2026-10-21T00:20:00+11:00'));
      await go(router, '/run');
      expect(screen.getByRole('heading', { name: 'Run complete' })).toBeInTheDocument();
      expect(summary()[2]).toBe('Done: 6 of 10 correct.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('carries a drill on at the first unanswered question, with the same questions and answers', async () => {
    provideContent(
      fixtureIndex({
        mcq: [fxMcq('m-u3o1-kk04-001', ['U3O1-KK04']), fxMcq('m-u3o1-kk05-001', ['U3O1-KK05']), fxMcq('m-u3o1-kk06-001', ['U3O1-KK06'])],
      }),
    );
    const router = renderApp();
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    const first = screen.getByText(/^Which option is right for /).textContent;
    press('c');
    press('Enter');
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    const second = screen.getByText(/^Which option is right for /).textContent;
    // Answered, but left before moving on.
    press('a');
    press('Enter');
    await go(router, '/map');
    await go(router, '/run');
    expect(screen.getByRole('heading', { name: 'Step 2 of 3: Drill your weakest key knowledge' })).toBeInTheDocument();
    expect(screen.getByText('Question 3 of 3')).toBeInTheDocument();
    expect([first, second]).not.toContain(screen.getByText(/^Which option is right for /).textContent);
    expect(useAttempts.getState().log).toHaveLength(2);
    press('c');
    press('Enter');
    fireEvent.click(screen.getByRole('button', { name: 'Finish drill' }));
    expect(steps()[1]).toHaveTextContent('Done: 2 of 3 correct.');
    expect(useAttempts.getState().log).toHaveLength(3);
  });

  it('carries a review on with the ratings so far', async () => {
    provideContent(fixtureIndex({ cards: [fxCard('c-u3o1-kk04-001', ['U3O1-KK04']), fxCard('c-u3o1-kk05-001', ['U3O1-KK05'])] }));
    const router = renderApp();
    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
    press(' ');
    press('3');
    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument();
    await go(router, '/map');
    await go(router, '/run');
    expect(screen.getByRole('heading', { name: 'Step 1 of 3: Review cards' })).toBeInTheDocument();
    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument();
    press(' ');
    press('4');
    expect(steps()[0]).toHaveTextContent('Done: 2 cards reviewed, 2 of them new.');
  });

  it('moves on from a review finished elsewhere while the run was left', async () => {
    oneOfEach();
    const router = renderApp();
    await go(router, '/map');
    // The card is rated on the Review screen meanwhile.
    useSrs.getState().setCard('c-u3o1-kk04-001', { reps: 1, interval: 1, ease: 2.5, due: Date.now() + 86_400_000, lapses: 0, last: Date.now() });
    await go(router, '/run');
    expect(screen.getByRole('heading', { name: 'Step 2 of 3: Drill your weakest key knowledge' })).toBeInTheDocument();
    expect(steps()[0]).toHaveTextContent('Skipped: Nothing was left to review.');
  });

  it('starts afresh after a reset or an import clears the tab', async () => {
    oneOfEach();
    const router = renderApp();
    reachDaily();
    await go(router, '/map');
    clearTabState();
    expect(window.sessionStorage.getItem(RUN_KEY)).toBeNull();
    await go(router, '/run');
    // Nothing is due now, so a new run starts at the drill.
    expect(screen.getByRole('heading', { name: 'Step 2 of 3: Drill your weakest key knowledge' })).toBeInTheDocument();
    expect(steps()[0]).toHaveTextContent('Skipped: Nothing was due.');
  });

  it('never writes the old run back after a reset in another window', () => {
    provideContent(fixtureIndex({ cards: [fxCard('c-u3o1-kk04-001', ['U3O1-KK04']), fxCard('c-u3o1-kk05-001', ['U3O1-KK05'])] }));
    renderApp();
    press(' ');
    press('3');
    expect(window.sessionStorage.getItem(RUN_KEY)).not.toBeNull();
    act(() => clearTabState());
    press(' ');
    press('3');
    expect(screen.getByRole('heading', { name: 'Step 3 of 3: Daily challenge' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(RUN_KEY)).toBeNull();
  });

  it("ignores a saved run from another study day, or one it can't read", async () => {
    oneOfEach();
    const router = renderApp();
    reachDaily();
    const saved = JSON.parse(window.sessionStorage.getItem(RUN_KEY)!);
    for (const bad of [JSON.stringify({ ...saved, day: '2026-01-01' }), JSON.stringify({ ...saved, step: 'nap' }), JSON.stringify({ ...saved, v: 99 }), '{not json']) {
      await go(router, '/map');
      window.sessionStorage.setItem(RUN_KEY, bad);
      await go(router, '/run');
      expect(screen.getByRole('heading', { name: 'Step 2 of 3: Drill your weakest key knowledge' })).toBeInTheDocument();
    }
  });

  it('still runs when this tab refuses to store anything', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    oneOfEach();
    const router = renderApp();
    reachDaily();
    await go(router, '/map');
    await go(router, '/run');
    // Without storage the place can't be kept, so a new run starts; nothing breaks.
    expect(screen.getByRole('heading', { name: 'Step 2 of 3: Drill your weakest key knowledge' })).toBeInTheDocument();
  });
});
