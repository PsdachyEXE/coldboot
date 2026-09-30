import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FULL_TIMING,
  MINI_TIMING,
  activeWarning,
  applicableWarnings,
  formatDuration,
  formatTimer,
  formatTimerWords,
  startTimer,
  submitTimer,
  timerState,
  warningText,
  warningsDue,
} from './timer';

const MIN = 60_000;
const T0 = Date.parse('2026-10-01T09:00:00+10:00');

describe('exam timer state machine', () => {
  it('is idle until the paper starts', () => {
    const s = timerState({ startedAt: null, submittedAt: null }, FULL_TIMING, T0);
    expect(s).toMatchObject({ phase: 'idle', phaseLeft: 0, expired: false, submittedAt: null });
    expect(submitTimer({ startedAt: null, submittedAt: null }, FULL_TIMING, T0)).toEqual({ startedAt: null, submittedAt: null });
  });

  it('runs 15 minutes of reading, then 2 hours of writing', () => {
    const stamps = startTimer(T0);
    expect(timerState(stamps, FULL_TIMING, T0)).toMatchObject({ phase: 'reading', phaseLeft: 15 * MIN, writingLeft: 120 * MIN });
    expect(timerState(stamps, FULL_TIMING, T0 + 15 * MIN - 1)).toMatchObject({ phase: 'reading', phaseLeft: 1 });
    expect(timerState(stamps, FULL_TIMING, T0 + 15 * MIN)).toMatchObject({ phase: 'writing', phaseLeft: 120 * MIN, writingLeft: 120 * MIN });
    expect(timerState(stamps, FULL_TIMING, T0 + 75 * MIN)).toMatchObject({ phase: 'writing', phaseLeft: 60 * MIN, usedMs: 75 * MIN });
    expect(timerState(stamps, FULL_TIMING, T0 + 135 * MIN - 1)).toMatchObject({ phase: 'writing', phaseLeft: 1 });
  });

  it('submits only during writing time', () => {
    const stamps = startTimer(T0);
    expect(submitTimer(stamps, FULL_TIMING, T0 + 5 * MIN)).toBe(stamps);
    const submitted = submitTimer(stamps, FULL_TIMING, T0 + 100 * MIN);
    expect(submitted.submittedAt).toBe(T0 + 100 * MIN);
    const s = timerState(submitted, FULL_TIMING, T0 + 200 * MIN);
    expect(s).toMatchObject({ phase: 'submitted', expired: false, submittedAt: T0 + 100 * MIN, usedMs: 100 * MIN });
    expect(submitTimer(submitted, FULL_TIMING, T0 + 110 * MIN)).toBe(submitted);
  });

  it('expires at the end of writing time and stamps the automatic submission then, not when noticed', () => {
    const stamps = startTimer(T0);
    const late = T0 + 9 * 60 * MIN;
    expect(timerState(stamps, FULL_TIMING, T0 + 135 * MIN)).toMatchObject({ phase: 'submitted', expired: true, submittedAt: T0 + 135 * MIN });
    expect(timerState(stamps, FULL_TIMING, late)).toMatchObject({ phase: 'submitted', expired: true, usedMs: 135 * MIN });
    expect(submitTimer(stamps, FULL_TIMING, late).submittedAt).toBe(T0 + 135 * MIN);
  });

  it('treats a clock that has gone backwards as the start of reading time', () => {
    expect(timerState(startTimer(T0), FULL_TIMING, T0 - 30 * MIN)).toMatchObject({ phase: 'reading', phaseLeft: 15 * MIN, usedMs: 0 });
  });

  it('runs the mini paper as 3 minutes of reading and 27 of writing, 30 in all', () => {
    const stamps = startTimer(T0);
    expect(MINI_TIMING.readingMs + MINI_TIMING.writingMs).toBe(30 * MIN);
    expect(timerState(stamps, MINI_TIMING, T0 + 2 * MIN)).toMatchObject({ phase: 'reading', phaseLeft: MIN });
    expect(timerState(stamps, MINI_TIMING, T0 + 3 * MIN)).toMatchObject({ phase: 'writing', phaseLeft: 27 * MIN });
    expect(timerState(stamps, MINI_TIMING, T0 + 30 * MIN)).toMatchObject({ phase: 'submitted', expired: true });
  });
});

describe('time warnings', () => {
  const stamps = startTimer(T0);
  const writingEnds = T0 + 135 * MIN;
  const at = (left: number) => timerState(stamps, FULL_TIMING, writingEnds - left);

  it('warns at 30, 10, 5 and 1 minutes left, and only the marks that fit the writing time', () => {
    expect(applicableWarnings(FULL_TIMING)).toEqual([30, 10, 5, 1]);
    expect(applicableWarnings(MINI_TIMING)).toEqual([10, 5, 1]);
    expect(warningsDue(at(31 * MIN), FULL_TIMING, [])).toEqual({ marks: [], announce: null, late: false });
    expect(warningsDue(at(30 * MIN), FULL_TIMING, [])).toEqual({ marks: [30], announce: 30, late: false });
    expect(warningsDue(at(29.5 * MIN), FULL_TIMING, [])).toEqual({ marks: [30], announce: 30, late: false });
    expect(warningsDue(at(29.5 * MIN), FULL_TIMING, [30]).announce).toBeNull();
    expect(warningsDue(at(59_000), FULL_TIMING, [30, 10, 5])).toEqual({ marks: [1], announce: 1, late: false });
  });

  it('gives only the most urgent missed warning after a reload or a sleeping tab, and says it is late', () => {
    expect(warningsDue(at(4 * MIN - 1), FULL_TIMING, [30])).toEqual({ marks: [10, 5], announce: 5, late: true });
    expect(warningText(5, true)).toBe('Less than 5 minutes of writing time left.');
    expect(warningText(10, false)).toBe('10 minutes of writing time left.');
    expect(warningText(1, false)).toBe('1 minute of writing time left.');
  });

  it('shows the most urgent warning reached, and nothing during reading time', () => {
    expect(activeWarning(timerState(stamps, FULL_TIMING, T0 + MIN), FULL_TIMING)).toBeNull();
    expect(activeWarning(at(45 * MIN), FULL_TIMING)).toBeNull();
    expect(activeWarning(at(25 * MIN), FULL_TIMING)).toBe(30);
    expect(activeWarning(at(7 * MIN), FULL_TIMING)).toBe(10);
    expect(activeWarning(at(30_000), FULL_TIMING)).toBe(1);
  });
});

describe('timer formatting', () => {
  it('prints the clock and the same in words', () => {
    expect(formatTimer(120 * MIN)).toBe('2:00:00');
    expect(formatTimer(15 * MIN - 1)).toBe('15:00');
    expect(formatTimer(14 * MIN + 59_000)).toBe('14:59');
    expect(formatTimer(40_000)).toBe('0:40');
    expect(formatTimerWords(119 * MIN)).toBe('1 hour 59 minutes');
    expect(formatTimerWords(14 * MIN + 1000)).toBe('14 minutes 1 second');
    expect(formatTimerWords(40_000)).toBe('40 seconds');
    expect(formatDuration(112 * MIN)).toBe('1 hour 52 minutes');
    expect(formatDuration(20_000)).toBe('less than a minute');
  });
});

describe('the timer survives a reload', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  /** A fresh module graph, as after a reload: the store hydrates from what was saved. */
  async function reload() {
    vi.resetModules();
    const store = await import('./store');
    const timer = await import('./timer');
    const { examActions: actions } = await import('./actions');
    return { store, timer, actions };
  }

  it('restores reading time mid-reading and writing time mid-writing from the saved timestamps', async () => {
    let { store, timer, actions } = await reload();
    const started = actions.start({
      mode: 'full',
      seed: 42,
      sections: { a: ['m-u3o1-kk04-001'], b: ['s-u3o1-kk04-001'], c: [] },
      caseStudyId: null,
      timing: timer.FULL_TIMING,
    });
    expect(started).toBe(true);
    store.examPersistence.flush();

    // Six minutes into reading time, the tab reloads.
    vi.setSystemTime(T0 + 6 * MIN);
    ({ store, timer, actions } = await reload());
    let paper = store.useExam.getState().paper!;
    expect(paper.startedAt).toBe(T0);
    let state = timer.timerState(paper, store.paperTiming(paper), Date.now());
    expect(state).toMatchObject({ phase: 'reading', phaseLeft: 9 * MIN });

    // Answers are locked during reading time.
    actions.answer('s-u3o1-kk04-001', 'Too early');
    expect(store.useExam.getState().paper!.answers).toEqual({});

    // Forty minutes into writing time: answer, then the laptop sleeps and the page reloads.
    vi.setSystemTime(T0 + 55 * MIN);
    actions.answer('s-u3o1-kk04-001', 'Keeps the leading zero.');
    actions.answer('m-u3o1-kk04-001', 2);
    store.examPersistence.flush();
    vi.setSystemTime(T0 + 100 * MIN);
    ({ store, timer } = await reload());
    paper = store.useExam.getState().paper!;
    state = timer.timerState(paper, store.paperTiming(paper), Date.now());
    expect(state).toMatchObject({ phase: 'writing', phaseLeft: 35 * MIN, writingLeft: 35 * MIN });
    expect(paper.answers).toEqual({ 's-u3o1-kk04-001': 'Keeps the leading zero.', 'm-u3o1-kk04-001': 2 });

    // Reopened long after writing time ended: submitted automatically, stamped at the end.
    vi.setSystemTime(T0 + 300 * MIN);
    ({ store, timer, actions } = await reload());
    paper = store.useExam.getState().paper!;
    expect(timer.timerState(paper, store.paperTiming(paper), Date.now())).toMatchObject({ phase: 'submitted', expired: true });
    actions.submit();
    expect(store.useExam.getState().paper).toMatchObject({ submittedAt: T0 + 135 * MIN, autoSubmitted: true });
  });
});
