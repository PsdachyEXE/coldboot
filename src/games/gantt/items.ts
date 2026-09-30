/**
 * `gantt` items. Each item shows a plan's task table and asks one thing about it: the total
 * duration, the critical path, how long a task can be delayed without delaying the project, a
 * sensible milestone, or how far the finish moves when a task runs late. Every answer comes from
 * computeSchedule (the critical path method in src/figures), and a text Gantt chart follows
 * every answer.
 *
 * The questions say "how many days a task can be delayed" rather than naming slack or float:
 * whether the study design names the term is unconfirmed (U3O2-KK03's verify note), so the term
 * appears only as an aside in the man page, and the chart's column is headed "Spare".
 *
 * Instances ("gantt:critical:seed=12:normal") regenerate an item exactly.
 */
import type { KkId } from '../../content/schema';
import { asciiGantt } from '../../figures/gantt/ascii';
import { computeSchedule, type Schedule } from '../../figures/gantt/schedule';
import { normaliseAnswer } from '../../lib/text';
import type { TerminalBlock } from '../../terminal/blocks';
import { formatAnd, LETTERS, parseChoice, parseCount } from '../answers';
import { childSeed, mulberry32, pick, randInt, shuffle, type Rng } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { planFor, type Plan, type PlanTask } from './plans';

export const GANTT_KINDS = ['duration', 'critical', 'delay', 'effect', 'milestone'] as const;
export type GanttKind = (typeof GANTT_KINDS)[number];

export const GANTT_KK: KkId[] = ['U3O2-KK03'];
export const EFFECT_KK: KkId[] = ['U3O2-KK03', 'U4O1-KK12'];

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export interface GanttSpec {
  kind: GanttKind;
  /** The plan's seed: every question on one plan shares it. */
  seed: number;
}

function days(n: number): string {
  return n === 1 ? '1 day' : `${n} days`;
}

function taskLabel(t: PlanTask): string {
  return `${t.id} (${t.name})`;
}

export function planTable(plan: Plan): TerminalBlock {
  return {
    kind: 'table',
    caption: `Project plan: ${plan.project} for ${plan.org}`,
    columns: ['Task', 'Description', 'Days', 'Depends on'],
    rows: plan.tasks.map((t) => [t.id, t.name, String(t.duration), t.dependsOn.length ? t.dependsOn.join(', ') : 'None']),
  };
}

const PLAN_RULES = 'Each task starts as soon as every task it depends on has finished. Tasks without a dependency start on day 1.';

/**
 * The text Gantt chart shown after an answer. `stage` decides how much it marks: bars only, then
 * the critical path, then the spare days (dots) as well.
 */
export function chartBlock(plan: Plan, schedule: Schedule, stage: 'bars' | 'critical' | 'full'): TerminalBlock {
  const text = asciiGantt(plan.tasks, schedule, { unit: 'day', showCritical: stage !== 'bars', showSlack: stage === 'full' });
  return { kind: 'pre', text: sparedWording(text), label: 'Gantt chart' };
}

/** Rewords the chart's slack column and key in the game's own terms (see the file comment). */
export function sparedWording(chart: string): string {
  const lines = chart.split('\n');
  lines[0] = lines[0].replace('Slack', 'Spare');
  return lines.join('\n').replace('. slack', '. days it can be delayed without delaying the project');
}

function chainSum(plan: Plan, ids: readonly string[]): string {
  const byId = new Map(plan.tasks.map((t) => [t.id, t]));
  const total = ids.reduce((sum, id) => sum + byId.get(id)!.duration, 0);
  return `${ids.map((id) => byId.get(id)!.duration).join(' + ')} = ${total}`;
}

/** Task ids typed leniently: "A B D", "a, b, d", "A-B-D", "A -> B -> D" or "ABD". Null when a token isn't a task. */
export function parseTaskList(input: string, ids: readonly string[]): string[] | null {
  const known = new Set(ids);
  const tokens = input
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean)
    .filter((t) => t !== 'THEN' && t !== 'AND' && t !== 'TO');
  if (!tokens.length) return null;
  const out: string[] = [];
  for (const token of tokens) {
    if (known.has(token)) out.push(token);
    else if ([...token].every((c) => known.has(c))) out.push(...token);
    else return null;
  }
  return out;
}

const NO_CHANGE = ['no', 'none', 'no change', 'not at all', 'it does not', "it doesn't", 'does not move', "doesn't move", 'it does not move', "it doesn't move", 'no delay', 'nil'];

/** A number of days, or 0 for "no" or "doesn't move". Null otherwise. */
export function parseDays(input: string, allowNo = false): number | null {
  const s = normaliseAnswer(input).replace(/^(by|about)\s+/, '');
  if (allowNo && NO_CHANGE.includes(s)) return 0;
  const n = parseCount(s);
  return n !== null && n >= 0 ? n : null;
}

interface Built {
  prompt: TerminalBlock[];
  expected: string;
  chips?: string[];
  check(input: string): { correct: boolean; reason: string } | { counted: false; reason: string };
  chart: 'bars' | 'critical' | 'full';
  kk: KkId[];
}

function durationQuestion(s: Schedule): Built {
  const last = s.tasks.filter((t) => t.earliestFinish === s.duration).map((t) => t.id);
  const reason = `Work forward through the table: each task finishes its own duration after the last of its dependencies finishes. ${formatAnd(last)} ${last.length === 1 ? 'finishes' : 'finish'} last, at the end of day ${s.duration}, so the project takes ${days(s.duration)}.`;
  return {
    prompt: [{ kind: 'text', text: 'How many days does the whole project take, if every task starts as early as it can?', tone: 'accent' }, { kind: 'text', text: 'Type a whole number of days.', tone: 'muted' }],
    expected: days(s.duration),
    check(input) {
      const n = parseDays(input);
      if (n === null) return { counted: false, reason: 'Type a whole number of days, such as 14.' };
      return { correct: n === s.duration, reason };
    },
    chart: 'bars',
    kk: GANTT_KK,
  };
}

function criticalQuestion(plan: Plan, s: Schedule): Built {
  const path = s.criticalPaths[0];
  const ids = plan.tasks.map((t) => t.id);
  const reason = `The critical path is the longest chain of dependent tasks: ${path.join(', ')} takes ${chainSum(plan, path)} days, the length of the whole project. A delay to any task on it delays the finish.`;
  const hint = 'Type the task letters in order, separated by spaces or commas.';
  return {
    prompt: [{ kind: 'text', text: 'Which tasks make up the critical path? List them in the order they run.', tone: 'accent' }, { kind: 'text', text: hint, tone: 'muted' }],
    expected: path.join(', '),
    check(input) {
      const got = parseTaskList(input, ids);
      if (!got) return { counted: false, reason: `Use the task letters ${ids[0]} to ${ids[ids.length - 1]}. ${hint}` };
      if (new Set(got).size !== got.length) return { counted: false, reason: `Name each task once. ${hint}` };
      const correct = got.length === path.length && got.every((id, i) => id === path[i]);
      const sameSet = !correct && got.length === path.length && got.every((id) => path.includes(id));
      return { correct, reason: sameSet ? `Those are the right tasks, but list them in the order they run. ${reason}` : reason };
    },
    chart: 'critical',
    kk: GANTT_KK,
  };
}

function delayReason(plan: Plan, s: Schedule, task: PlanTask): string {
  const t = s.byId[task.id];
  if (t.slack === 0) return `${task.id} is on the critical path: it must finish at the end of day ${t.earliestFinish} for the project to finish on day ${s.duration}, so it can't be delayed at all.`;
  const dependants = plan.tasks.filter((u) => u.dependsOn.includes(task.id)).map((u) => u.id);
  const limit = dependants.length
    ? `${formatAnd(dependants)} ${dependants.length === 1 ? 'needs' : 'need'} it finished by the end of day ${t.latestFinish}`
    : `nothing depends on it, and the project finishes at the end of day ${t.latestFinish}`;
  return `${task.id} finishes at the end of day ${t.earliestFinish} at the earliest, and ${limit}. So it can be delayed by ${t.latestFinish} - ${t.earliestFinish} = ${days(t.slack)} without delaying the project.`;
}

function delayQuestion(plan: Plan, s: Schedule, rng: Rng, difficulty: Difficulty): Built {
  const spare = plan.tasks.filter((t) => s.byId[t.id].slack > 0);
  const critical = plan.tasks.filter((t) => s.byId[t.id].critical);
  // Easy asks only about tasks with time to spare; otherwise a critical task comes up one time in four.
  const task = difficulty !== 'easy' && rng() < 0.25 ? pick(rng, critical) : pick(rng, spare);
  const t = s.byId[task.id];
  return {
    prompt: [
      { kind: 'text', text: `How many days can task ${taskLabel(task)} be delayed without delaying the whole project?`, tone: 'accent' },
      { kind: 'text', text: "Type a whole number of days (0 if it can't be delayed at all).", tone: 'muted' },
    ],
    expected: days(t.slack),
    check(input) {
      const n = parseDays(input, true);
      if (n === null) return { counted: false, reason: 'Type a whole number of days, such as 2, or 0.' };
      return { correct: n === t.slack, reason: delayReason(plan, s, task) };
    },
    chart: 'full',
    kk: GANTT_KK,
  };
}

/** How far the finish moves when `task` finishes `late` days after its earliest finish: recomputed, never assumed. */
export function finishShift(plan: Plan, taskId: string, late: number): number {
  const before = computeSchedule(plan.tasks).duration;
  const after = computeSchedule(plan.tasks.map((t) => (t.id === taskId ? { ...t, duration: t.duration + late } : t))).duration;
  return after - before;
}

function effectQuestion(plan: Plan, s: Schedule, rng: Rng, difficulty: Difficulty): Built {
  const spare = plan.tasks.filter((t) => s.byId[t.id].slack > 0);
  const critical = plan.tasks.filter((t) => s.byId[t.id].critical);
  // A task with time to spare most of the time, delayed by less than, exactly or more than its spare days.
  const task = rng() < 0.35 ? pick(rng, critical) : pick(rng, spare);
  const t = s.byId[task.id];
  const late = t.slack === 0 ? randInt(rng, 1, 4) : pick(rng, difficulty === 'easy' ? [t.slack + randInt(rng, 1, 3), Math.max(1, t.slack - 1)] : [t.slack, t.slack + randInt(rng, 1, 3), Math.max(1, t.slack - randInt(rng, 1, 2))]);
  const shift = finishShift(plan, task.id, late);
  const reason =
    t.slack === 0
      ? `${task.id} is on the critical path, so every day it runs late pushes the finish back: from day ${s.duration} to day ${s.duration + shift}.`
      : shift === 0
        ? `${task.id} can be delayed by ${days(t.slack)} without delaying the project, so ${days(late)} late doesn't move the finish. The project still takes ${days(s.duration)}.`
        : `${task.id} can be delayed by only ${days(t.slack)}, so finishing ${days(late)} late pushes the finish back ${late} - ${t.slack} = ${days(shift)}: from day ${s.duration} to day ${s.duration + shift}. ${task.id} is now on the critical path.`;
  return {
    prompt: [
      { kind: 'text', text: `Task ${taskLabel(task)} finishes ${days(late)} later than planned. By how many days does the project's finish move?`, tone: 'accent' },
      { kind: 'text', text: "Type a whole number of days, or 0 if the finish doesn't move.", tone: 'muted' },
    ],
    expected: shift === 0 ? "0 days: the finish doesn't move" : days(shift),
    check(input) {
      const n = parseDays(input, true);
      if (n === null) return { counted: false, reason: "Type a whole number of days, such as 2, or 0 if the finish doesn't move." };
      return { correct: n === shift, reason };
    },
    chart: 'full',
    kk: EFFECT_KK,
  };
}

interface MilestoneOption {
  text: string;
  correct: boolean;
  why: string;
}

function milestoneQuestion(plan: Plan, s: Schedule, rng: Rng): Built {
  const marked = plan.tasks.filter((t) => t.event);
  const target = pick(rng, marked);
  const tt = s.byId[target.id];
  const others = plan.tasks.filter((t) => t.id !== target.id);
  const long = shuffle(rng, others).sort((a, b) => b.duration - a.duration);
  const asTask = long[0];
  const halfway = long.find((t) => t.id !== asTask.id && t.duration >= 2) ?? long[1];
  const options: MilestoneOption[] = shuffle(rng, [
    { text: `${target.event}, at the end of day ${tt.earliestFinish}`, correct: true, why: '' },
    {
      text: `${target.event}, at the end of day ${tt.earliestStart}`,
      correct: false,
      why: `the end of day ${tt.earliestStart} is when ${target.id} can start, not when it finishes`,
    },
    {
      text: `${asTask.name}, lasting ${days(asTask.duration)}`,
      correct: false,
      why: `task ${asTask.id} (${asTask.name}) takes ${days(asTask.duration)}, but a milestone takes no time`,
    },
    {
      text: `Halfway through task ${halfway.id} (${halfway.name})`,
      correct: false,
      why: 'halfway through a task marks no finished piece of work, so nobody can check it has been reached',
    },
  ]);
  const answer = options.findIndex((o) => o.correct);
  const wrong = options.filter((o) => !o.correct).map((o) => o.why);
  const reason = `A milestone is a point in time with no duration that marks a significant event, such as a stage or deliverable being finished. ${target.id} finishes at the end of day ${tt.earliestFinish} at the earliest. The others don't work: ${wrong.join('; ')}.`;
  return {
    prompt: [
      { kind: 'text', text: 'Which of these would be a sensible milestone for this plan, placed at the right time?', tone: 'accent' },
      { kind: 'choices', options: options.map((o) => o.text), labels: 'letters' },
    ],
    expected: `${LETTERS[answer]}. ${options[answer].text}`,
    chips: [...LETTERS.slice(0, 4)],
    check(input) {
      const chosen = parseChoice(input, 4);
      if (chosen === null) return { counted: false, reason: 'Type a letter from A to D.' };
      return { correct: chosen === answer, reason };
    },
    chart: 'full',
    kk: GANTT_KK,
  };
}

export function ganttItem(spec: GanttSpec, difficulty: Difficulty): QuizItem {
  const seed = spec.seed >>> 0;
  const plan = planFor(seed, difficulty);
  const schedule = computeSchedule(plan.tasks);
  const rng = mulberry32(childSeed(seed, spec.kind));
  const built =
    spec.kind === 'duration'
      ? durationQuestion(schedule)
      : spec.kind === 'critical'
        ? criticalQuestion(plan, schedule)
        : spec.kind === 'delay'
          ? delayQuestion(plan, schedule, rng, difficulty)
          : spec.kind === 'effect'
            ? effectQuestion(plan, schedule, rng, difficulty)
            : milestoneQuestion(plan, schedule, rng);
  const chart = chartBlock(plan, schedule, built.chart);
  return {
    id: `gen-gantt-${spec.kind}`,
    kk: built.kk,
    instance: `gantt:${spec.kind}:seed=${seed}:${difficulty}`,
    chips: built.chips,
    prompt: [planTable(plan), { kind: 'text', text: PLAN_RULES, tone: 'muted' }, ...built.prompt],
    check(input) {
      const r = built.check(input);
      if ('counted' in r) return { correct: false, expected: built.expected, reason: r.reason, counted: false };
      return { correct: r.correct, expected: built.expected, reason: r.reason, followUp: [chart] };
    },
  };
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromGanttInstance(instance: string): QuizItem | null {
  const m = /^gantt:([a-z]+):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (!m || !(GANTT_KINDS as readonly string[]).includes(m[1]) || !DIFFICULTIES.includes(m[3] as Difficulty)) return null;
  return ganttItem({ kind: m[1] as GanttKind, seed: Number(m[2]) }, m[3] as Difficulty);
}

/** A round: two plans, five questions on each in a fixed order, so each chart reveals only what has been asked. */
export function planGanttRound(seed: number, count = 10): GanttSpec[] {
  const specs: GanttSpec[] = [];
  for (let p = 0; specs.length < count; p++) {
    const planSeed = childSeed(seed, `plan-${p}`);
    for (const kind of GANTT_KINDS) specs.push({ kind, seed: planSeed });
  }
  return specs.slice(0, count);
}

/** Game.generate: one self-contained question of any kind. */
export function generateGanttItem(seed: number, difficulty: Difficulty): QuizItem {
  const kind = pick(mulberry32(childSeed(seed, 'kind')), GANTT_KINDS);
  return ganttItem({ kind, seed }, difficulty);
}
