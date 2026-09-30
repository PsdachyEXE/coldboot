/**
 * Terminal commands (Section 7.1). Each command prints blocks into the shared session; commands
 * that open a study screen navigate there and close the drawer. User-typed words only ever appear
 * in plain `text` blocks, never in Markdown.
 */
import { AREA_IDS, isKkId, type KkId } from '../content/schema';
import { useContent } from '../content/store';
import { ALL_KK_IDS, areaById, kkLabel } from '../content/studyDesign';
import { DRILL_ID } from '../games/drill/meta';
import { isAreaId, kksInArea, mcqsForKk, weakestDrillKks } from '../games/drill/select';
import { DRILL_GAME, GAMES, findGame } from '../games/registry';
import type { Difficulty } from '../games/types';
import { examPath, paths, reviewPath } from '../app/paths';
import { nearest } from '../lib/text';
import { addDays, countdown, examPhase, formatInstant, studyDay, studyDayStart } from '../lib/time';
import { computeMastery } from '../srs/mastery';
import { useAttempts } from '../state/attempts';
import { streak, useSession } from '../state/session';
import { examAtMs, useSettings } from '../state/settings';
import { countDue, useSrs } from '../state/srs';
import { openReport } from '../ui/report';
import type { TerminalBlock, Tone } from './blocks';
import type { CompletionSources } from './complete';
import { CONTENT_ERROR, startGame } from './host';
import type { ParsedCommand } from './parse';
import { useTerminalSession, type ItemRef } from './session';

export interface TerminalEnv {
  /** Which presentation the command was typed in. */
  presentation: 'drawer' | 'route';
  navigate(to: string): void;
  closeDrawer(): void;
}

export interface CommandSpec {
  name: string;
  usage: string;
  summary: string;
  /** Flags the command accepts, with dashes (for completion). */
  flags?: readonly string[];
  /** Hidden from help and completion (aliases and the sudo joke). */
  hidden?: boolean;
  run(cmd: ParsedCommand, env: TerminalEnv): void | Promise<void>;
}

export const SUDO_MESSAGE = 'Permission denied. This terminal runs with least privilege.';
export const DAILY_MISSING = "The daily challenge isn't installed in this build yet.";

const out = (...blocks: TerminalBlock[]) => useTerminalSession.getState().print(blocks);
const say = (text: string, tone?: Tone): TerminalBlock => ({ kind: 'text', text, tone });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

const DIFFICULTY_FLAGS = ['--easy', '--hard'] as const;

function difficultyFrom(cmd: ParsedCommand): { difficulty: Difficulty } | { error: string } {
  const unknown = cmd.flags.find((f) => f !== 'easy' && f !== 'hard');
  if (unknown) return { error: `${cmd.name} doesn't have an option --${unknown}. Use --easy or --hard, or leave it out for normal.` };
  const easy = cmd.flags.includes('easy');
  const hard = cmd.flags.includes('hard');
  if (easy && hard) return { error: 'Choose one difficulty: --easy or --hard.' };
  return { difficulty: easy ? 'easy' : hard ? 'hard' : 'normal' };
}

function notInstalled(id: string): void {
  if (id === 'daily') {
    out(say(DAILY_MISSING, 'warning'), say('Type ls to see the games you can play now.', 'muted'));
    return;
  }
  const near = nearest(id, GAMES.map((g) => g.id));
  out(
    say(`The game "${id}" isn't installed in this build yet.`, 'warning'),
    say(near ? `Did you mean ${near}? Type play ${near} to start it.` : 'Type ls to see the games you can play now.', 'muted'),
  );
}

async function playGame(id: string, cmd: ParsedCommand, where: string): Promise<void> {
  const level = difficultyFrom(cmd);
  if ('error' in level) {
    out(say(level.error, 'warning'));
    return;
  }
  const meta = findGame(id);
  if (!meta) {
    notInstalled(id);
    return;
  }
  if (meta.fixedDifficulty && cmd.flags.length) {
    const start = id === 'daily' ? 'daily' : `play ${id}`;
    const why = id === 'daily' ? 'The daily challenge is the same set for everyone, so it' : `${id} has one level, so it`;
    out(say(`${why} has no --easy or --hard option. Type ${start} to start it.`, 'warning'));
    return;
  }
  await startGame(meta, { difficulty: level.difficulty, where, showDifficulty: !meta.fixedDifficulty });
}

async function play(cmd: ParsedCommand): Promise<void> {
  const id = cmd.args[0]?.toLowerCase();
  if (!id) {
    out(say('Name a game to play, for example play sort.', 'warning'), say('Type ls to list the games.', 'muted'));
    return;
  }
  if (cmd.args.length > 1) {
    out(say(`play takes one game name. To choose a difficulty, type play ${id} --easy or play ${id} --hard.`, 'warning'));
    return;
  }
  await playGame(id, cmd, `terminal: ${cmd.raw}`);
}

// ---------------------------------------------------------------------------
// Drill
// ---------------------------------------------------------------------------

const DRILL_TARGETS: readonly string[] = [...ALL_KK_IDS, ...AREA_IDS];

/** The next KK after `from` (in study design order, wrapping) that has MCQs. */
function suggestKk(from: KkId, has: (kk: KkId) => boolean): KkId | null {
  const start = ALL_KK_IDS.indexOf(from);
  for (let i = 1; i <= ALL_KK_IDS.length; i++) {
    const kk = ALL_KK_IDS[(start + i) % ALL_KK_IDS.length];
    if (kk !== from && has(kk)) return kk;
  }
  return null;
}

async function drill(cmd: ParsedCommand): Promise<void> {
  if (cmd.args.length > 1 || cmd.flags.length) {
    out(say('drill takes one key knowledge id or area, for example drill U3O1-KK12 or drill U3O2.', 'warning'));
    return;
  }
  const typed = cmd.args[0];
  const target = typed?.toUpperCase();
  let kks: KkId[] | null = null;
  let intro = '';
  if (target !== undefined) {
    if (isKkId(target) && ALL_KK_IDS.includes(target)) {
      kks = [target];
      intro = `Drilling ${kkLabel(target)}.`;
    } else if (isAreaId(target)) {
      kks = kksInArea(target);
      intro = `Drilling ${target} ${areaById.get(target)?.title ?? ''}.`.replace(' .', '.');
    } else {
      const near = nearest(target, DRILL_TARGETS);
      out(
        say(`There's no key knowledge point or area called "${typed}".`, 'warning'),
        say(
          near ? `Did you mean ${near}? Type drill ${near}.` : 'Type drill followed by a key knowledge id such as U3O1-KK12, or an area such as U3O2.',
          'muted',
        ),
      );
      return;
    }
  }
  if (useContent.getState().status !== 'ready') out(say('Loading the study content.', 'muted'));
  const content = await useContent.getState().load();
  if (!content) {
    out(say(useContent.getState().error ?? CONTENT_ERROR, 'warning'));
    return;
  }
  const has = (kk: KkId) => mcqsForKk(content, kk).length > 0;
  if (!kks) {
    const mastery = computeMastery(useAttempts.getState(), Date.now());
    kks = weakestDrillKks(content, (kk) => mastery.get(kk)?.value ?? null);
    if (!kks.length) {
      out(say('No multiple-choice questions are installed yet.', 'warning'), say('Type play sort or play search to practise with generated questions.', 'muted'));
      return;
    }
    intro = `Drilling your weakest key knowledge: ${kks.map(kkLabel).join('; ')}.`;
  }
  if (!kks.some(has)) {
    const suggestion = suggestKk(kks[0], has);
    const label = kks.length === 1 ? kks[0] : target;
    out(
      say(`There are no multiple-choice questions for ${label} yet.`, 'warning'),
      say(
        suggestion
          ? `Try drill ${suggestion}, which has ${plural(mcqsForKk(content, suggestion).length, 'question')}.`
          : 'Type play sort or play search to practise with generated questions.',
        'muted',
      ),
    );
    return;
  }
  out(say(intro, 'muted'));
  await startGame(DRILL_GAME, { difficulty: 'normal', kk: kks, where: `terminal: ${cmd.raw}` });
}

// ---------------------------------------------------------------------------
// Information
// ---------------------------------------------------------------------------

function help(cmd: ParsedCommand): void {
  const topic = cmd.args[0]?.toLowerCase();
  if (topic) {
    man({ ...cmd, args: [topic] });
    return;
  }
  out(
    {
      kind: 'table',
      caption: 'Commands',
      columns: ['Command', 'What it does'],
      rows: COMMANDS.filter((c) => !c.hidden).map((c) => [c.usage, c.summary]),
    },
    say('Keys: Tab completes a command, Up and Down recall earlier ones, Ctrl+C stops a game, Ctrl+L clears the screen, and Esc closes the drawer.', 'muted'),
  );
}

function ls(): void {
  out(
    { kind: 'table', caption: 'Games', columns: ['Game', 'What you practise'], rows: GAMES.map((g) => [g.id, g.summary]) },
    say('Type play followed by a game name to start, or man followed by a game name to read how it works.', 'muted'),
    say('drill runs Section A questions from the study content.', 'muted'),
  );
}

function man(cmd: ParsedCommand): void {
  const topic = cmd.args[0]?.toLowerCase();
  if (!topic) {
    out(say('Name a game, for example man sort.', 'warning'), say('Type ls to list the games.', 'muted'));
    return;
  }
  const meta = topic === DRILL_ID ? DRILL_GAME : findGame(topic);
  if (meta) {
    out(say(`${meta.id}: ${meta.title}`, 'accent'), say(meta.man));
    return;
  }
  const command = findCommand(topic);
  if (command && !command.hidden) {
    out(say(`Usage: ${command.usage}`, 'accent'), say(`${command.summary}.`));
    return;
  }
  if (topic === 'daily') {
    out(say(DAILY_MISSING, 'warning'));
    return;
  }
  const near = nearest(topic, [...GAMES.map((g) => g.id), DRILL_ID]);
  out(
    say(`There's no manual page for "${cmd.args[0]}".`, 'warning'),
    say(near ? `Did you mean ${near}? Type man ${near}.` : 'Type ls to list the games.', 'muted'),
  );
}

const dayLabel = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
/** "Thu 1 Oct", built from parts so ICU punctuation differences don't matter. */
function labelDay(day: string): string {
  const parts = dayLabel.formatToParts(new Date(`${day}T00:00:00Z`));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('weekday')} ${get('day')} ${get('month')}`;
}

function due(): void {
  const { cards } = useSrs.getState();
  const known = useContent.getState().index?.cardIds;
  const now = Date.now();
  const ids = Object.keys(cards).filter((id) => !known || known.has(id));
  if (!ids.length) {
    out(say('No cards are due yet. Review brings in new cards each day.', 'muted'), say('Type review to start.', 'muted'));
    return;
  }
  const dueNow = countDue(cards, now, known);
  const today = studyDay(now);
  const rows = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i);
    const start = i === 0 ? -Infinity : studyDayStart(day);
    const end = studyDayStart(addDays(day, 1));
    const n = ids.filter((id) => cards[id].due >= start && cards[id].due < end).length;
    const label = i === 0 ? `Today (${labelDay(day)})` : i === 1 ? `Tomorrow (${labelDay(day)})` : labelDay(day);
    return [label, String(n)];
  });
  out(
    say(`${plural(dueNow, 'card is', 'cards are')} due now.`, 'accent'),
    { kind: 'table', caption: 'Cards due over the next 7 days (today includes overdue cards)', columns: ['Day', 'Cards due'], rows },
    say(dueNow ? 'Type review to start.' : 'Nothing is due right now. Type drill to practise instead.', 'muted'),
  );
}

function countdownCommand(): void {
  const examAt = examAtMs(useSettings.getState());
  const now = Date.now();
  const phase = examPhase(now, examAt);
  if (phase === 'before') {
    const c = countdown(now, examAt);
    out(say(`${plural(c.days, 'day')}, ${plural(c.hours, 'hour')} and ${plural(c.minutes, 'minute')} until the exam starts.`, 'accent'));
  } else if (phase === 'reading') out(say('The exam is in reading time now.', 'accent'));
  else if (phase === 'writing') out(say('The exam is under way.', 'accent'));
  else out(say('The exam has finished.', 'accent'));
  const lines: TerminalBlock[] = [say(`Melbourne: ${formatInstant(examAt)}`)];
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    lines.push(say(`Your time (${zone}): ${formatInstant(examAt, zone)}`));
  } catch {
    lines.push(say(`Your time: ${new Date(examAt).toString()}`));
  }
  lines.push(say('Reading time is 15 minutes, then writing runs for 2 hours.', 'muted'));
  out(...lines);
}

function whoami(): void {
  const { name } = useSettings.getState();
  const now = Date.now();
  const days = streak(useSession.getState().activity, studyDay(now));
  const attempts = useAttempts.getState();
  const rolled = Object.values(attempts.rollup).reduce((sum, r) => sum + (r?.n ?? 0), 0);
  const total = attempts.log.length + rolled;
  const mastery = [...computeMastery(attempts, now).entries()].sort((a, b) => a[1].value - b[1].value);
  const blocks: TerminalBlock[] = [
    say(name || 'student', 'accent'),
    say(`Streak: ${plural(days, 'day')}`),
    say(`Answers recorded: ${total}`),
    say(
      mastery.length
        ? `Weakest key knowledge: ${kkLabel(mastery[0][0])} (mastery ${Math.round(mastery[0][1].value)})`
        : 'Weakest key knowledge: none yet. Answer a few questions first, for example with play sort.',
    ),
  ];
  if (!name) blocks.push(say('You appear as student until you set a name.', 'muted'), { kind: 'link', label: 'Set your name in Settings', to: paths.settings });
  out(...blocks);
}

function history(): void {
  const items = useSession.getState().terminalHistory;
  if (!items.length) {
    out(say('No commands yet. Type help to get started.', 'muted'));
    return;
  }
  out({ kind: 'list', ordered: true, items: [...items] });
}

function about(): void {
  out(
    say('COLDBOOT is a revision app for VCE Applied Computing: Software Development, Units 3 and 4. It works offline and keeps your progress in this browser only.'),
    say('It is not affiliated with or endorsed by the VCAA.', 'muted'),
    { kind: 'link', label: 'About COLDBOOT', to: paths.about },
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function open(label: string, to: string, env: TerminalEnv): void {
  out(say(`Opening ${label}.`, 'muted'), { kind: 'link', label: `Open ${label}`, to });
  env.navigate(to);
  env.closeDrawer();
}

function exam(cmd: ParsedCommand, env: TerminalEnv): void {
  const unknown = cmd.flags.find((f) => f !== 'mini');
  if (unknown) {
    out(say(`exam doesn't have an option --${unknown}. Type exam, or exam --mini for the 30-minute paper.`, 'warning'));
    return;
  }
  const mini = cmd.flags.includes('mini');
  open(mini ? 'the mini exam' : 'the exam simulator', examPath({ mini }), env);
}

function exit(env: TerminalEnv): void {
  if (env.presentation === 'route') env.navigate(paths.home);
  else env.closeDrawer();
}

// ---------------------------------------------------------------------------
// Reports and sharing
// ---------------------------------------------------------------------------

/**
 * `report` opens a report for the last question answered (the one whose feedback is on screen),
 * or for the current question when none has been answered yet; `report current` always reports
 * the question waiting for an answer.
 */
export function reportCommand(args: readonly string[]): void {
  const s = useTerminalSession.getState();
  const current = s.game?.session.current?.() ?? null;
  const currentRef: ItemRef | null = current && s.game ? { ...current, where: s.game.where } : null;
  const wantCurrent = args[0]?.toLowerCase() === 'current';
  const ref = wantCurrent ? currentRef : (s.lastAnswered ?? currentRef);
  if (!ref) {
    out(say(wantCurrent ? 'No question is waiting for an answer.' : 'There is no question to report yet.', 'warning'), say('Answer a question first, then type report.', 'muted'));
    return;
  }
  openReport({ itemId: ref.itemId, instance: ref.instance, where: ref.where });
  out(say(`Opening a report for ${ref.itemId}${ref.instance ? ` (${ref.instance})` : ''}.`, 'muted'));
}

async function share(): Promise<void> {
  const text = useTerminalSession.getState().lastShare;
  if (!text) {
    out(say('Nothing to share yet. Finish the daily challenge, then type share.', 'warning'));
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    out(say('Share line copied to the clipboard.', 'muted'));
  } catch {
    out(say("Couldn't copy to the clipboard. Select the share line above and copy it yourself.", 'warning'));
  }
}

// ---------------------------------------------------------------------------
// The command table
// ---------------------------------------------------------------------------

export const COMMANDS: readonly CommandSpec[] = [
  { name: 'help', usage: 'help', summary: 'List the commands', run: help },
  { name: 'ls', usage: 'ls', summary: 'List the games', run: ls },
  { name: 'man', usage: 'man <game>', summary: 'Show how a game works', run: man },
  { name: 'play', usage: 'play <game> [--easy|--hard]', summary: 'Start a game', flags: DIFFICULTY_FLAGS, run: play },
  { name: 'daily', usage: 'daily', summary: "Start today's daily challenge", run: (cmd) => playGame('daily', cmd, `terminal: ${cmd.raw}`) },
  { name: 'drill', usage: 'drill [kk|area]', summary: 'Answer up to 10 Section A questions', run: drill },
  { name: 'due', usage: 'due', summary: 'Show the cards due now and over the week', run: due },
  { name: 'review', usage: 'review', summary: 'Open flashcard review', run: (_c, env) => open('review', reviewPath(), env) },
  { name: 'exam', usage: 'exam [--mini]', summary: 'Open the exam simulator', flags: ['--mini'], run: exam },
  { name: 'map', usage: 'map', summary: 'Open the syllabus map', run: (_c, env) => open('the syllabus map', paths.map, env) },
  { name: 'stats', usage: 'stats', summary: 'Open your stats', run: (_c, env) => open('your stats', paths.stats, env) },
  { name: 'countdown', usage: 'countdown', summary: 'Show the time until the exam', run: countdownCommand },
  { name: 'whoami', usage: 'whoami', summary: 'Show your name, streak and weakest key knowledge', run: whoami },
  { name: 'history', usage: 'history', summary: 'List the commands you have typed', run: history },
  { name: 'report', usage: 'report [current]', summary: 'Report a problem with the last question', run: (cmd) => reportCommand(cmd.args) },
  { name: 'share', usage: 'share', summary: 'Copy the last share line', run: share },
  { name: 'clear', usage: 'clear', summary: 'Clear the screen', run: () => useTerminalSession.getState().clear() },
  { name: 'about', usage: 'about', summary: 'About COLDBOOT', run: about },
  { name: 'exit', usage: 'exit', summary: 'Close the terminal', run: (_c, env) => exit(env) },
  { name: 'sudo', usage: 'sudo', summary: 'Run as administrator', hidden: true, run: () => void out(say(SUDO_MESSAGE, 'warning')) },
  { name: 'quit', usage: 'quit', summary: 'Close the terminal', hidden: true, run: (_c, env) => exit(env) },
  { name: 'cls', usage: 'cls', summary: 'Clear the screen', hidden: true, run: () => useTerminalSession.getState().clear() },
];

export function findCommand(name: string): CommandSpec | undefined {
  return COMMANDS.find((c) => c.name === name);
}

export const VISIBLE_COMMANDS: readonly string[] = COMMANDS.filter((c) => !c.hidden).map((c) => c.name);

export function completionSources(): CompletionSources {
  const games = GAMES.map((g) => g.id);
  return {
    commands: VISIBLE_COMMANDS,
    games,
    manTopics: [...games, DRILL_ID],
    drillTargets: DRILL_TARGETS,
    flags: Object.fromEntries(COMMANDS.filter((c) => c.flags).map((c) => [c.name, c.flags!])),
  };
}
