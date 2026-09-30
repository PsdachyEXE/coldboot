import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContent } from '../content/store';
import { fixtureContent } from '../games/drill/fixture';
import { GAMES } from '../games/registry';
import { fromSortInstance } from '../games/sort/items';
import { useAttempts } from '../state/attempts';
import { useSession } from '../state/session';
import { useSettings } from '../state/settings';
import { useSrs } from '../state/srs';
import { useAnnouncer } from '../ui/announce';
import { useReportDialog } from '../ui/report';
import { DAILY_MISSING, SUDO_MESSAGE } from './commands';
import { abortGame, finishGame, startGame } from './host';
import { useTerminalSession, walkHistory } from './session';
import { completeAt, historyDown, historyUp, interrupt, promptFor, submitLine, suggestCommand } from './shell';
import { fakeGame, mockEnv, numberItem, printed, resetStores } from './testing';
import { useTerminal } from './useTerminal';

const NOW = new Date('2026-10-01T10:00:00+10:00').getTime();

beforeEach(() => {
  resetStores();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  GAMES.splice(2);
});

const term = () => useTerminalSession.getState();

describe('prompt', () => {
  it('uses the name, or student when it is empty', () => {
    expect(promptFor('Lachie')).toBe('Lachie@coldboot:~$');
    expect(promptFor('')).toBe('student@coldboot:~$');
    expect(promptFor('  ')).toBe('student@coldboot:~$');
  });
});

describe('commands', () => {
  it('echoes the command with the prompt and records it in history', async () => {
    useSettings.getState().setName('Ana');
    await submitLine('help', mockEnv());
    expect(term().entries.some((e) => e.block.kind === 'command' && e.block.prompt === 'Ana@coldboot:~$' && e.block.input === 'help')).toBe(true);
    expect(useSession.getState().terminalHistory).toEqual(['help']);
    expect(printed()).toContain('play <game> [--easy|--hard]');
    expect(printed()).not.toContain('sudo');
  });

  it('prints exactly the sudo message', async () => {
    await submitLine('sudo rm -rf /', mockEnv());
    expect(term().entries.at(-1)?.block).toEqual({ kind: 'text', text: SUDO_MESSAGE, tone: 'warning' });
    expect(SUDO_MESSAGE).toBe('Permission denied. This terminal runs with least privilege.');
  });

  it('suggests the nearest command within edit distance 2', async () => {
    await submitLine('hlep', mockEnv());
    expect(printed()).toContain('Did you mean help?');
    await submitLine('revew', mockEnv());
    expect(printed()).toContain('Did you mean review?');
    await submitLine('xyzzy', mockEnv());
    expect(printed()).toContain('Type help to list the commands.');
    expect(suggestCommand('dialy')).toBe('daily');
    expect(suggestCommand('lss')).toBe('ls');
    expect(suggestCommand('q')).toBeNull();
  });

  it('explains that there is nothing to answer when no game is running', async () => {
    await submitLine('3 1 2', mockEnv());
    expect(printed()).toContain('No game is running, so there is nothing to answer.');
    await submitLine('[1] [2]', mockEnv());
    expect(printed()).not.toContain('Did you mean');
  });

  it('reports a bad quote instead of running anything', async () => {
    await submitLine('man "sort', mockEnv());
    expect(printed()).toContain('without a closing one');
  });

  it('lists the games and shows man pages', async () => {
    await submitLine('ls', mockEnv());
    expect(printed()).toContain('sort | Trace selection sort');
    await submitLine('man search', mockEnv());
    expect(printed()).toContain('Usage: play search [--easy|--hard]');
    await submitLine('man srot', mockEnv());
    expect(printed()).toContain('Did you mean sort?');
  });

  it('treats daily and unknown games the same friendly way', async () => {
    await submitLine('daily', mockEnv());
    expect(printed()).toContain(DAILY_MISSING);
    await submitLine('play daily', mockEnv());
    expect(printed().split(DAILY_MISSING)).toHaveLength(3);
    await submitLine('play chess', mockEnv());
    expect(printed()).toContain('The game "chess" isn\'t installed in this build yet.');
    await submitLine('play serch', mockEnv());
    expect(printed()).toContain('Did you mean search? Type play search to start it.');
  });

  it('rejects conflicting and unknown difficulty flags', async () => {
    await submitLine('play sort --easy --hard', mockEnv());
    expect(printed()).toContain('Choose one difficulty');
    await submitLine('play sort --expert', mockEnv());
    expect(printed()).toContain("doesn't have an option --expert");
    expect(term().game).toBeNull();
  });

  it('navigates for review, exam, map and stats and closes the drawer', async () => {
    const env = mockEnv();
    await submitLine('review', env);
    await submitLine('exam --mini', env);
    await submitLine('map', env);
    await submitLine('stats', env);
    expect(env.navigate.mock.calls.map((c) => c[0])).toEqual(['/review', '/exam?mini=1', '/map', '/stats']);
    expect(env.closeDrawer).toHaveBeenCalledTimes(4);
    expect(term().entries.filter((e) => e.block.kind === 'link')).toHaveLength(4);
  });

  it('exit closes the drawer, or goes home from the route', async () => {
    const drawer = mockEnv('drawer');
    await submitLine('exit', drawer);
    expect(drawer.closeDrawer).toHaveBeenCalled();
    const route = mockEnv('route');
    await submitLine('exit', route);
    expect(route.navigate).toHaveBeenCalledWith('/');
  });

  it('prints the countdown with Melbourne and local times', async () => {
    await submitLine('countdown', mockEnv());
    const text = printed();
    expect(text).toMatch(/43 days, \d+ hours? and \d+ minutes? until the exam starts\./);
    expect(text).toContain('Melbourne: Friday 13 November 2026');
    expect(text).toContain('Your time (Australia/Melbourne)');
  });

  it('shows whoami with the streak, attempts and weakest KK', async () => {
    await submitLine('whoami', mockEnv());
    expect(printed()).toContain('student');
    expect(printed()).toContain('Weakest key knowledge: none yet');
    useSettings.getState().setName('Ana');
    useAttempts.getState().record({ itemId: 'gen-sort-selection', kk: ['U3O1-KK12'], score: 0, timestamp: NOW - 1000, ms: 1000 });
    useAttempts.getState().record({ itemId: 'gen-x', kk: ['U3O1-KK04'], score: 1, timestamp: NOW - 1000, ms: 1000 });
    useSession.getState().noteActivity('2026-10-01', { kk: ['U3O1-KK12'], score: 1, ms: 1 }, false);
    await submitLine('whoami', mockEnv());
    expect(printed()).toContain('Streak: 1 day');
    expect(printed()).toContain('Answers recorded: 2');
    expect(printed()).toContain('Weakest key knowledge: U3O1-KK12 Sorting and searching (mastery 0)');
  });

  it('numbers the history', async () => {
    await submitLine('history', mockEnv());
    await submitLine('ls', mockEnv());
    await submitLine('history', mockEnv());
    const list = term().entries.at(-1)?.block;
    expect(list).toEqual({ kind: 'list', ordered: true, items: ['history', 'ls', 'history'] });
  });

  it('shows cards due and a 7-day forecast', async () => {
    await submitLine('due', mockEnv());
    expect(printed()).toContain('No cards are due yet');
    const card = { reps: 1, interval: 1, ease: 2.5, lapses: 0, last: NOW - 86_400_000 };
    useSrs.getState().setCard('c-a', { ...card, due: NOW - 60_000 });
    useSrs.getState().setCard('c-b', { ...card, due: NOW + 86_400_000 });
    useSrs.getState().setCard('c-c', { ...card, due: NOW + 3 * 86_400_000 });
    await submitLine('due', mockEnv());
    expect(printed()).toContain('1 card is due now.');
    const table = term().entries.findLast((e) => e.block.kind === 'table')!.block;
    expect(table.kind === 'table' && table.rows.map((r) => r[1])).toEqual(['1', '1', '0', '1', '0', '0', '0']);
    expect(table.kind === 'table' && table.rows[0][0]).toMatch(/^Today \(Thu 1 Oct\)$/);
  });

  it('clears the screen and prints the about text with a link', async () => {
    await submitLine('about', mockEnv());
    expect(printed()).toContain('About COLDBOOT -> /about');
    await submitLine('clear', mockEnv());
    expect(term().entries).toEqual([]);
  });

  it('announces what a command printed through the live region', async () => {
    await submitLine('sudo make me a sandwich', mockEnv());
    expect(useAnnouncer.getState().polite).toBe(SUDO_MESSAGE);
  });
});

describe('games in the terminal', () => {
  it('plays a game, records attempts with timing and publishes the end', async () => {
    GAMES.push(fakeGame());
    await submitLine('play fake', mockEnv());
    expect(term().game?.gameId).toBe('fake');
    expect(printed()).toContain('Normal difficulty, 3 questions.');
    expect(term().game?.chips).toEqual(['1', 'other']);
    vi.advanceTimersByTime(4000);
    await submitLine('1', mockEnv());
    expect(useAnnouncer.getState().polite).toMatch(/^Correct\. The answer is 1\. Question 2 of 3\. Type 2\./);
    await submitLine('nope', mockEnv());
    expect(printed()).toContain('Type a number.');
    await submitLine('9', mockEnv());
    expect(useAnnouncer.getState().polite).toMatch(/^Incorrect\. Expected: 2\./);
    await submitLine('3', mockEnv());
    expect(term().game).toBeNull();
    const log = useAttempts.getState().log;
    expect(log.map((t) => [t[0], t[2]])).toEqual([
      ['gen-fake-1', 1],
      ['gen-fake-2', 0],
      ['gen-fake-3', 1],
    ]);
    expect(log[0][4]).toBe(4000);
    expect(useTerminal.getState().lastGameEnd).toEqual({ gameId: 'fake', score: 2, total: 3, at: NOW + 4000 });
    expect(printed()).toContain('Round complete: 2 of 3 correct.');
    expect(useSession.getState().terminalHistory).toEqual(['play fake']);
  });

  it('aborts with Ctrl+C, keeping recorded attempts', async () => {
    GAMES.push(fakeGame());
    await submitLine('play fake', mockEnv());
    await submitLine('1', mockEnv());
    term().setDraft('2');
    interrupt();
    expect(term().game).toBeNull();
    expect(printed()).toContain('student@coldboot:~$ 2^C');
    expect(printed()).toContain('Game aborted.');
    expect(useAttempts.getState().log).toHaveLength(1);
    expect(useTerminal.getState().lastGameEnd).toBeNull();
    interrupt();
    expect(printed().match(/Game aborted\./g)).toHaveLength(1);
  });

  it('ends a timed game at its deadline without input', async () => {
    GAMES.push(fakeGame({ timedMs: 60_000 }));
    await submitLine('play fake', mockEnv());
    expect(printed()).toContain('You have 60 seconds.');
    await submitLine('0', mockEnv());
    vi.advanceTimersByTime(60_100);
    expect(term().game).toBeNull();
    expect(printed()).toContain("Time's up: 1 of 1 correct.");
    expect(useTerminal.getState().lastGameEnd?.score).toBe(1);
    expect(useAnnouncer.getState().polite).toContain("Time's up");
  });

  it('follows the daily protocol and prints the share line', async () => {
    const items = [numberItem(1, 'm-u3o1-kk12-001'), numberItem(2, 'gen-daily-sort:42')];
    GAMES.push(fakeGame({ id: 'daily', items, exposeItemIds: true, share: true }));
    await submitLine('daily', mockEnv());
    expect(useSession.getState().daily['2026-10-01']).toEqual({ itemIds: ['m-u3o1-kk12-001', 'gen-daily-sort:42'], results: [], completedAt: null });
    await submitLine('1', mockEnv());
    await submitLine('5', mockEnv());
    expect(useSession.getState().daily['2026-10-01']).toMatchObject({ results: [1, 0], completedAt: NOW });
    expect(printed()).toContain('Share line COLDBOOT fake 1/2');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await submitLine('share', mockEnv());
    expect(writeText).toHaveBeenCalledWith('COLDBOOT fake 1/2');
    expect(printed()).toContain('Share line copied to the clipboard.');
  });

  it('tells the student when there is nothing to share', async () => {
    await submitLine('share', mockEnv());
    expect(printed()).toContain('Nothing to share yet.');
  });

  it('reports the last answered item, or the current one', async () => {
    await submitLine('report', mockEnv());
    expect(printed()).toContain('There is no question to report yet.');
    GAMES.push(fakeGame());
    await submitLine('play fake --hard', mockEnv());
    await submitLine('report', mockEnv());
    expect(useReportDialog.getState().request).toEqual({ itemId: 'gen-fake-1', instance: 'fake:n=1', where: 'terminal: play fake --hard' });
    await submitLine('1', mockEnv());
    await submitLine('report', mockEnv());
    expect(useReportDialog.getState().request?.itemId).toBe('gen-fake-1');
    await submitLine('report current', mockEnv());
    expect(useReportDialog.getState().request?.itemId).toBe('gen-fake-2');
    // "report" is not taken as an answer.
    expect(term().game?.session.progress).toEqual({ current: 2, total: 3 });
  });

  it('explains that a command typed during a game is read as an answer', async () => {
    GAMES.push(fakeGame());
    await submitLine('play fake', mockEnv());
    await submitLine('play search', mockEnv());
    expect(printed()).toContain('Type a number.');
    expect(printed()).toContain('A game is running, so that was read as an answer. To run play, stop the game first with Ctrl+C or Abort game.');
    expect(term().game?.gameId).toBe('fake');
  });

  it('runs a pending command as a command, aborting a game in progress', async () => {
    GAMES.push(fakeGame());
    await submitLine('play fake', mockEnv());
    await submitLine('ls', mockEnv(), { fromPending: true });
    expect(term().game).toBeNull();
    expect(printed()).toContain('Game aborted.');
    expect(printed()).toContain('What you practise');
  });

  it('plays a real sort round through the shell', async () => {
    await submitLine('play sort --easy', mockEnv());
    expect(term().game?.gameId).toBe('sort');
    for (let guard = 0; term().game && guard < 12; guard++) {
      const instance = term().game!.session.current!()!.instance!;
      const expected = fromSortInstance(instance)!.check('?').expected;
      await submitLine(/^[A-D]\. /.test(expected) ? expected[0] : expected, mockEnv());
    }
    expect(printed()).toContain('Round complete: 10 of 10 correct.');
    expect(useAttempts.getState().log).toHaveLength(10);
    expect(useTerminal.getState().lastGameEnd).toMatchObject({ gameId: 'sort', score: 10, total: 10 });
  });

  it('ignores input while a game is loading and can abort the load', async () => {
    let release: () => void = () => {};
    const slow = fakeGame({ id: 'slow' });
    const load = slow.load;
    slow.load = () => new Promise((resolve) => (release = () => resolve(load())));
    GAMES.push(slow);
    const started = startGame(slow, { difficulty: 'normal', where: 'test' });
    expect(term().busy).toBe(true);
    await submitLine('1', mockEnv());
    expect(printed()).toContain('Still loading.');
    expect(abortGame()).toBe(true);
    release();
    expect(await started).toBe(false);
    expect(term().game).toBeNull();
    expect(term().busy).toBe(false);
    finishGame();
  });
});

describe('drill', () => {
  it('drills a KK from the content with MCQ feedback', async () => {
    useContent.setState({ index: fixtureContent(), status: 'ready' });
    await submitLine('drill u3o1-kk12', mockEnv());
    expect(printed()).toContain('Drilling U3O1-KK12 Sorting and searching.');
    expect(term().game?.gameId).toBe('drill');
    expect(term().game?.chips).toEqual(['A', 'B', 'C', 'D']);
    const choices = term().entries.findLast((e) => e.block.kind === 'choices')!.block;
    expect(choices).toEqual({ kind: 'choices', options: ['One', 'Two', 'Three', 'Four'], labels: 'letters', markdown: true });
    await submitLine('a', mockEnv());
    const feedback = term().entries.findLast((e) => e.block.kind === 'feedback')!.block;
    expect(feedback).toMatchObject({ kind: 'feedback', correct: false, expected: 'C. Three', markdown: true });
    expect(feedback.kind === 'feedback' && feedback.reason).toContain('**Why not A:** Not one.');
    await submitLine('3', mockEnv());
    expect(term().entries.findLast((e) => e.block.kind === 'feedback')!.block).toMatchObject({ correct: true });
  });

  it('drills an area and the weakest KKs', async () => {
    useContent.setState({ index: fixtureContent(), status: 'ready' });
    await submitLine('drill U4O2', mockEnv());
    expect(printed()).toContain('Drilling U4O2 Cyber security');
    expect(term().game?.session.progress?.total).toBe(5);
    interrupt();
    await submitLine('drill', mockEnv());
    expect(printed()).toContain('Drilling your weakest key knowledge: U3O1-KK04');
    expect(term().game?.session.progress?.total).toBe(10);
  });

  it('says when a KK has no questions and suggests another', async () => {
    useContent.setState({ index: fixtureContent(), status: 'ready' });
    await submitLine('drill U3O1-KK11', mockEnv());
    expect(printed()).toContain('There are no multiple-choice questions for U3O1-KK11 yet.');
    expect(printed()).toContain('Try drill U3O1-KK12, which has 6 questions.');
    expect(term().game).toBeNull();
  });

  it('suggests the nearest id for a typo and explains the format otherwise', async () => {
    await submitLine('drill U3O1-KK1', mockEnv());
    expect(printed()).toContain('Did you mean U3O1-KK01?');
    await submitLine('drill sorting', mockEnv());
    expect(printed()).toContain('Type drill followed by a key knowledge id such as U3O1-KK12');
  });

  it('says so when no MCQs are installed', async () => {
    await submitLine('drill', mockEnv());
    expect(printed()).toContain('No multiple-choice questions are installed yet.');
  });
});

describe('history and completion', () => {
  it('walks history with Up and Down and restores the draft', () => {
    const history = ['help', 'ls', 'play sort'];
    let s = walkHistory({ index: null, draft: 'pl', stash: '' }, history, -1);
    expect(s).toEqual({ index: 2, draft: 'play sort', stash: 'pl' });
    s = walkHistory(s, history, -1);
    s = walkHistory(s, history, -1);
    s = walkHistory(s, history, -1);
    expect(s).toEqual({ index: 0, draft: 'help', stash: 'pl' });
    s = walkHistory(s, history, 1);
    expect(s.draft).toBe('ls');
    s = walkHistory(s, history, 1);
    s = walkHistory(s, history, 1);
    expect(s).toEqual({ index: null, draft: 'pl', stash: '' });
    expect(walkHistory(s, history, 1)).toBe(s);
    expect(walkHistory(s, [], -1)).toBe(s);
  });

  it('walks the persisted history through the store, and game answers during a game', async () => {
    useSession.getState().pushHistory('help');
    useSession.getState().pushHistory('ls');
    historyUp();
    expect(term().draft).toBe('ls');
    historyUp();
    expect(term().draft).toBe('help');
    historyDown();
    historyDown();
    expect(term().draft).toBe('');
    GAMES.push(fakeGame());
    await submitLine('play fake', mockEnv());
    await submitLine('7', mockEnv());
    historyUp();
    expect(term().draft).toBe('7');
  });

  it('completes at the cursor and prints several options', () => {
    expect(completeAt('pla', 3)).toEqual({ value: 'play ', cursor: 5 });
    expect(term().draft).toBe('play ');
    expect(completeAt('play so --hard', 7)).toEqual({ value: 'play sort  --hard', cursor: 10 });
    completeAt('d', 1);
    expect(printed()).toContain('daily   drill   due');
    expect(completeAt('drill u3o1-kk1', 14).value).toBe('drill U3O1-KK1');
  });
});
