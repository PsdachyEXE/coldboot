import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { kkLabel } from '../../content/studyDesign';
import { melbourneDate, studyDay } from '../../lib/time';
import { exportFilename } from '../../state/exportImport';
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
      { path: '/review', element: <h1>Review screen</h1> },
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

  describe('with a run under way in this tab', () => {
    /** A run left at its drill: the review done, two of ten drill questions answered. */
    const savedRun = (day = studyDay(NOW)) => ({
      v: 1,
      day,
      step: 'drill',
      outcomes: { review: { status: 'done', text: '1 card reviewed, 1 of them new.' } },
      review: { ratings: 1, cardIds: ['c-u3o1-kk04-001'], newCards: 1, again: 0 },
      drillIds: Array.from({ length: 10 }, (_, i) => `m-u3o1-kk14-${String(i + 1).padStart(3, '0')}`),
      drillAnswers: [
        { itemId: 'm-u3o1-kk14-001', kk: ['U3O1-KK14'], correct: true, answered: true },
        { itemId: 'm-u3o1-kk14-002', kk: ['U3O1-KK14'], correct: false, answered: true },
      ],
      drillResult: null,
      stepAt: NOW - 600_000,
      dailyDate: '',
    });

    it("offers to continue it, and says where it is up to instead of previewing a new run", () => {
      window.sessionStorage.setItem('coldboot:v1:run', JSON.stringify(savedRun()));
      const router = renderHome();
      expect(screen.queryByRole('link', { name: "Start today's run" })).toBeNull();
      const carryOn = screen.getByRole('link', { name: "Continue today's run" });
      expect(carryOn).toHaveAttribute('href', '/run');
      const run = screen.getByRole('list', { name: "Today's run" });
      expect(within(run).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
        'Review cards. Done: 1 card reviewed, 1 of them new.',
        'Next: drill your weakest key knowledge, 2 of 10 answered.',
        'Then: the daily challenge.',
      ]);
      // Not the new run's preview.
      expect(screen.queryByText(/^Learn \d+ new cards?\./)).toBeNull();
      fireEvent.click(carryOn);
      expect(router.state.location.pathname).toBe('/run');
    });

    it('says where a run left in its review or at the daily challenge is up to', () => {
      const atReview = { ...savedRun(), step: 'review', outcomes: {}, drillIds: [], drillAnswers: [] };
      window.sessionStorage.setItem('coldboot:v1:run', JSON.stringify(atReview));
      const first = render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <Home /> }], { initialEntries: ['/'] })} />);
      expect(within(screen.getByRole('list', { name: "Today's run" })).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
        'Next: review cards, 1 card reviewed so far.',
        'Then: drill, then the daily challenge.',
      ]);
      first.unmount();
      const atDaily = {
        ...savedRun(),
        step: 'daily',
        outcomes: { review: { status: 'skipped', text: 'Nothing was due.' }, drill: { status: 'done', text: '7 of 10 correct.' } },
        dailyDate: melbourneDate(NOW),
      };
      window.sessionStorage.setItem('coldboot:v1:run', JSON.stringify(atDaily));
      renderHome();
      expect(within(screen.getByRole('list', { name: "Today's run" })).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
        'Review cards. Skipped: Nothing was due.',
        'Drill your weakest key knowledge. Done: 7 of 10 correct.',
        'Next: the daily challenge.',
      ]);
      expect(screen.getByRole('link', { name: "Continue today's run" })).toBeInTheDocument();
    });

    it('previews a new run when the saved one is from another study day or unreadable', () => {
      for (const stored of [JSON.stringify(savedRun('2026-09-30')), '{not json']) {
        window.sessionStorage.setItem('coldboot:v1:run', stored);
        const { unmount } = render(
          <RouterProvider router={createMemoryRouter([{ path: '/', element: <Home /> }], { initialEntries: ['/'] })} />,
        );
        expect(screen.getByRole('link', { name: "Start today's run" })).toBeInTheDocument();
        expect(screen.getByText('Learn 2 new cards.')).toBeInTheDocument();
        unmount();
      }
    });
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

  it('opens the glossary flashcards from the Terms cell, which has no questions to drill', () => {
    const router = renderHome();
    fireEvent.click(screen.getByRole('button', { name: 'Terms used in this study, unseen' }));
    expect(router.state.location.pathname).toBe('/review');
    expect(router.state.location.search).toBe('?kk=TERMS');
  });
});

describe('Home on exam day', () => {
  // The default exam: Friday 13 November 2026, 3:00 pm in Melbourne (AEDT).
  beforeEach(() => {
    resetStudyStores();
    vi.useFakeTimers({ toFake: ['Date'] });
    useSettings.setState({ onboarded: true, motion: 'reduce' });
    provideContent(fixtureIndex({ cards: [fxCard('c-u3o1-kk04-001', ['U3O1-KK04'])], mcq: [fxMcq('m-u3o2-kk08-001', ['U3O2-KK08'])] }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    resetStudyStores();
  });

  function renderAt(iso: string) {
    vi.setSystemTime(new Date(iso).getTime());
    const router = createMemoryRouter(
      [
        { path: '/', element: <Home /> },
        { path: '*', element: <h1>Elsewhere</h1> },
      ],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);
    return router;
  }

  it('keeps the usual run until midnight in Melbourne on the exam date', () => {
    renderAt('2026-11-12T23:59:59+11:00');
    expect(screen.getByRole('link', { name: "Start today's run" })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Exam today/ })).toBeNull();
  });

  it('on the exam date, gives the Melbourne time, the time left and a calm suggestion instead of the run', () => {
    renderAt('2026-11-13T00:00:00+11:00');
    const notice = screen.getByRole('region', { name: 'Exam today at 3:00 pm (Melbourne time)' });
    expect(within(notice).getByText('15 hours to go.')).toBeInTheDocument();
    // A warm-up of the cards that are due, not today's new cards.
    expect(within(notice).getByRole('link', { name: 'Review a few cards' })).toHaveAttribute('href', '/review?due=1');
    expect(within(notice).getByRole('link', { name: 'Sit the mini paper' })).toHaveAttribute('href', '/exam?mini=1');
    expect(within(notice).getByText(/light warm-up, not new work/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: "Start today's run" })).toBeNull();
    expect(screen.queryByText('Reviews due')).toBeNull();
    // The coverage grid is still there to look at.
    expect(screen.getByRole('region', { name: 'Coverage' })).toBeInTheDocument();
  });

  it('counts down in hours and minutes through the morning', () => {
    renderAt('2026-11-13T10:48:00+11:00');
    expect(screen.getByText('4 hours and 12 minutes to go.')).toBeInTheDocument();
  });

  it('says less than a minute just before the start', () => {
    renderAt('2026-11-13T14:59:30+11:00');
    expect(screen.getByText('Less than a minute to go.')).toBeInTheDocument();
  });

  it.each([
    ['2026-11-13T15:00:00+11:00', 'Reading time ends at 3:15 pm, then writing time runs until 5:15 pm (Melbourne time).'],
    ['2026-11-13T15:14:59+11:00', 'Reading time ends at 3:15 pm, then writing time runs until 5:15 pm (Melbourne time).'],
    ['2026-11-13T15:15:00+11:00', 'Writing time ends at 5:15 pm (Melbourne time).'],
    ['2026-11-13T17:14:59+11:00', 'Writing time ends at 5:15 pm (Melbourne time).'],
  ])(
    'wishes luck with no study nags during reading and writing time (%s)',
    (iso, ends) => {
      renderAt(iso);
      expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
      const notice = screen.getByRole('region', { name: 'The exam is underway. Good luck.' });
      expect(notice).toHaveTextContent(ends);
      expect(screen.queryAllByRole('link')).toHaveLength(0);
      expect(screen.queryAllByRole('button')).toHaveLength(0);
      expect(screen.queryByText(/due|streak|daily|drill|review/i)).toBeNull();
      expect(screen.queryByRole('region', { name: 'Coverage' })).toBeNull();
    },
  );

  it('after the exam, says well done, keeps export and progress, and notes the caps have lifted', () => {
    URL.createObjectURL = vi.fn(() => 'blob:coldboot-export');
    URL.revokeObjectURL = vi.fn();
    const clicks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this);
    });
    renderAt('2026-11-13T17:15:00+11:00');
    const notice = screen.getByRole('region', { name: 'The exam is over. Well done.' });
    expect(notice).toHaveTextContent('the exam caps, which brought every card back at least two days before the exam, have lifted');
    expect(within(notice).getByRole('link', { name: 'See your stats' })).toHaveAttribute('href', '/stats');
    expect(within(notice).getByRole('link', { name: 'Open the syllabus map' })).toHaveAttribute('href', '/map');
    expect(within(notice).getByRole('link', { name: 'Change it in Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.queryByRole('link', { name: "Start today's run" })).toBeNull();
    expect(screen.getByRole('region', { name: 'Coverage' })).toBeInTheDocument();
    fireEvent.click(within(notice).getByRole('button', { name: 'Export progress' }));
    expect(clicks).toHaveLength(1);
    const name = exportFilename(Date.now());
    expect(clicks[0].download).toBe(name);
    expect(within(notice).getByText(`Progress exported as ${name}. Keep it somewhere safe, such as your school drive.`)).toBeInTheDocument();
  });

  it('follows an exam time changed in Settings', () => {
    useSettings.setState({ examAt: '2026-11-13T09:00:00+11:00' });
    renderAt('2026-11-13T08:30:00+11:00');
    expect(screen.getByRole('heading', { name: 'Exam today at 9:00 am (Melbourne time)' })).toBeInTheDocument();
    expect(screen.getByText('30 minutes to go.')).toBeInTheDocument();
  });
});
