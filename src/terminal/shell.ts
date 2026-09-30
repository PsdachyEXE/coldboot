/**
 * The shell: turns submitted lines into commands or game answers, and handles the terminal keys
 * that act on the session (Ctrl+C, Ctrl+L, Tab, Up and Down). The drawer and the route both call
 * these, so the two presentations behave identically.
 */
import { nearest } from '../lib/text';
import { HISTORY_ENTRY_MAX, useSession } from '../state/session';
import { useSettings } from '../state/settings';
import { VISIBLE_COMMANDS, completionSources, findCommand, reportCommand, type TerminalEnv } from './commands';
import { complete } from './complete';
import { abortGame, submitAnswer } from './host';
import { parseCommandLine } from './parse';
import { useTerminalSession } from './session';
import { announceSince } from './speech';

export type { TerminalEnv } from './commands';

/** `<name>@coldboot:~$`, with "student" until a name is set. */
export function promptFor(name: string): string {
  return `${name.trim() || 'student'}@coldboot:~$`;
}

export function currentPrompt(): string {
  return promptFor(useSettings.getState().name);
}

const term = () => useTerminalSession.getState();

/**
 * The nearest command within edit distance 2, tightened for very short words so "1" doesn't
 * suggest "ls": at most half the word's length, and at least 1.
 */
export function suggestCommand(word: string): string | null {
  return nearest(word, VISIBLE_COMMANDS, Math.min(2, Math.max(1, Math.floor(word.length / 2))));
}

async function runCommand(line: string, env: TerminalEnv): Promise<void> {
  const trimmed = line.trim();
  if (!trimmed) return;
  useSession.getState().pushHistory(trimmed);
  const parsed = parseCommandLine(trimmed);
  if (!parsed.ok) {
    term().print({ kind: 'text', text: parsed.error, tone: 'warning' });
    return;
  }
  if (!parsed.command) return;
  const spec = findCommand(parsed.command.name);
  if (!spec && /^[\d[({-]/.test(parsed.command.name)) {
    term().print([
      { kind: 'text', text: 'No game is running, so there is nothing to answer.', tone: 'warning' },
      { kind: 'text', text: 'Type play sort, or ls to list the games.', tone: 'muted' },
    ]);
    return;
  }
  if (!spec) {
    const near = suggestCommand(parsed.command.name);
    term().print([
      { kind: 'text', text: `There's no command called "${parsed.command.name}".`, tone: 'warning' },
      { kind: 'text', text: near ? `Did you mean ${near}?` : 'Type help to list the commands.', tone: 'muted' },
    ]);
    return;
  }
  await spec.run(parsed.command, env);
}

export interface SubmitOptions {
  /**
   * A command another screen asked for (useTerminal.run). It always runs as a command: a game in
   * progress is aborted first rather than receiving the command as an answer.
   */
  fromPending?: boolean;
}

/** Echoes and runs one submitted line, then announces what it printed. */
export async function submitLine(raw: string, env: TerminalEnv, opts: SubmitOptions = {}): Promise<void> {
  const line = raw.replace(/[\r\n]+/g, ' ').slice(0, HISTORY_ENTRY_MAX);
  const s = term();
  const from = s.nextId + 1;
  s.print({ kind: 'command', prompt: currentPrompt(), input: line });
  s.setDraft('');
  try {
    if (opts.fromPending) {
      if (s.game || s.busy) abortGame();
      await runCommand(line, env);
    } else if (s.busy) {
      term().print({ kind: 'text', text: 'Still loading. Try again when the first question appears.', tone: 'muted' });
    } else if (s.game) {
      if (/^\s*report(\s+current)?\s*$/i.test(line)) reportCommand(line.trim().split(/\s+/).slice(1));
      else if (line.trim()) {
        const result = submitAnswer(line);
        const word = line.trim().split(/\s+/)[0].toLowerCase();
        if (result?.counted === false && VISIBLE_COMMANDS.includes(word)) {
          term().print({ kind: 'text', text: `A game is running, so that was read as an answer. To run ${word}, stop the game first with Ctrl+C or Abort game.`, tone: 'muted' });
        }
      }
    } else {
      await runCommand(line, env);
    }
  } finally {
    announceSince(from);
  }
}

/** Ctrl+C: echoes the line with ^C and aborts a running game. */
export function interrupt(): void {
  const s = term();
  const from = s.nextId + 1;
  s.print({ kind: 'command', prompt: currentPrompt(), input: `${s.draft}^C` });
  s.setDraft('');
  abortGame();
  announceSince(from);
}

/** Ctrl+L. */
export function clearScreen(): void {
  term().clear();
}

/** The list Up and Down walk: this game's answers during a game, otherwise the command history. */
export function historySource(): readonly string[] {
  const { game } = term();
  return game ? game.answers : useSession.getState().terminalHistory;
}

export function historyUp(): void {
  term().historyUp(historySource());
}

export function historyDown(): void {
  term().historyDown(historySource());
}

/**
 * Tab: completes the word before the cursor. Several matches are printed as options. Returns the
 * new value and cursor position.
 */
export function completeAt(value: string, cursor: number): { value: string; cursor: number } {
  const before = value.slice(0, cursor);
  const after = value.slice(cursor);
  const result = complete(before, completionSources());
  if (result.options.length > 1) {
    const from = term().nextId;
    term().print({ kind: 'text', text: result.options.join('   '), tone: 'muted' });
    announceSince(from);
  }
  const next = result.line + after;
  term().setDraft(next);
  return { value: next, cursor: result.line.length };
}

/** Suggested taps when no game is running. */
export const IDLE_CHIPS = ['help', 'ls', 'daily', 'due', 'play sort'];
