/**
 * The gantt game over 500 seeds at every difficulty. Every answer is checked against an
 * independent brute-force reference written here: it enumerates every chain of dependent tasks
 * from a task with no dependencies to a task nothing depends on, and reads the project length,
 * the critical path, each task's spare days and the effect of a delay straight off those chains.
 */
import { describe, expect, it } from 'vitest';
import { computeSchedule } from '../../figures';
import type { TerminalBlock } from '../../terminal/blocks';
import type { Difficulty, QuizItem } from '../types';
import game from './index';
import { finishShift, fromGanttInstance, GANTT_KINDS, ganttItem, generateGanttItem, parseDays, parseTaskList, planGanttRound, sparedWording } from './items';
import { planFor, TEMPLATES, type Plan, type PlanTask } from './plans';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 3);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

// ---------------------------------------------------------------------------
// Brute-force reference
// ---------------------------------------------------------------------------

interface Reference {
  duration: number;
  /** Every heaviest root-to-sink chain, as "A B D". */
  critical: string[];
  spare: Map<string, number>;
  earliestFinish: Map<string, number>;
  earliestStart: Map<string, number>;
}

function chains(tasks: readonly PlanTask[]): string[][] {
  const dependants = (id: string) => tasks.filter((t) => t.dependsOn.includes(id)).map((t) => t.id);
  const out: string[][] = [];
  const walk = (path: string[]) => {
    const next = dependants(path[path.length - 1]);
    if (!next.length) out.push(path);
    for (const n of next) walk([...path, n]);
  };
  for (const root of tasks.filter((t) => !t.dependsOn.length)) walk([root.id]);
  return out;
}

function reference(tasks: readonly PlanTask[]): Reference {
  const dur = new Map(tasks.map((t) => [t.id, t.duration]));
  const all = chains(tasks);
  const weight = (c: readonly string[]) => c.reduce((s, id) => s + dur.get(id)!, 0);
  const duration = Math.max(...all.map(weight));
  const critical = [...new Set(all.filter((c) => weight(c) === duration).map((c) => c.join(' ')))];
  const spare = new Map<string, number>();
  const earliestFinish = new Map<string, number>();
  const earliestStart = new Map<string, number>();
  for (const t of tasks) {
    const through = all.filter((c) => c.includes(t.id));
    spare.set(t.id, duration - Math.max(...through.map(weight)));
    // The heaviest chain prefix that ends with this task.
    const ef = Math.max(...through.map((c) => weight(c.slice(0, c.indexOf(t.id) + 1))));
    earliestFinish.set(t.id, ef);
    earliestStart.set(t.id, ef - t.duration);
  }
  return { duration, critical, spare, earliestFinish, earliestStart };
}

function referenceShift(tasks: readonly PlanTask[], id: string, late: number): number {
  return reference(tasks.map((t) => (t.id === id ? { ...t, duration: t.duration + late } : t))).duration - reference(tasks).duration;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function promptText(item: QuizItem): string {
  return item.prompt.map((b) => (b.kind === 'text' ? b.text : '')).join('\n');
}

function choices(item: QuizItem): string[] {
  const block = item.prompt.find((b): b is Extract<TerminalBlock, { kind: 'choices' }> => b.kind === 'choices');
  return block ? block.options : [];
}

/** The answer the reference gives for an item, typed as a student would. */
function referenceAnswer(plan: Plan, item: QuizItem, kind: (typeof GANTT_KINDS)[number]): string {
  const ref = reference(plan.tasks);
  const text = promptText(item);
  switch (kind) {
    case 'duration':
      return String(ref.duration);
    case 'critical':
      return ref.critical[0];
    case 'delay': {
      const id = /task ([A-I]) \(/.exec(text)![1];
      return String(ref.spare.get(id));
    }
    case 'effect': {
      const m = /Task ([A-I]) \(.*\) finishes (\d+) days? later/.exec(text)!;
      return String(referenceShift(plan.tasks, m[1], Number(m[2])));
    }
    case 'milestone': {
      const right = plan.tasks.filter((t) => t.event).flatMap((t) => [`${t.event}, at the end of day ${ref.earliestFinish.get(t.id)}`]);
      const options = choices(item);
      const hits = options.flatMap((o, i) => (right.includes(o) ? [i] : []));
      expect(hits).toHaveLength(1);
      return 'ABCD'[hits[0]];
    }
  }
}

function wrongAnswer(plan: Plan, kind: (typeof GANTT_KINDS)[number], right: string): string {
  switch (kind) {
    case 'critical': {
      const ids = right.split(' ');
      return ids.length > 1 ? [...ids.slice(0, -2), ids[ids.length - 1], ids[ids.length - 2]].join(' ') : plan.tasks.map((t) => t.id).join(' ');
    }
    case 'milestone':
      return right === 'A' ? 'B' : 'A';
    default:
      return String(Number(right) + 1);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('gantt plans', () => {
  it.each(LEVELS)('are well formed, and computeSchedule matches the brute-force reference (%s, 500 seeds)', (level) => {
    const [lo, hi] = { easy: [5, 6], normal: [6, 8], hard: [8, 9] }[level];
    for (const seed of SEEDS) {
      const plan = planFor(seed, level);
      const label = `seed ${seed} ${level}`;
      expect(plan.tasks.length, label).toBeGreaterThanOrEqual(lo);
      expect(plan.tasks.length, label).toBeLessThanOrEqual(hi);
      plan.tasks.forEach((t, i) => {
        expect(t.id).toBe('ABCDEFGHI'[i]);
        expect(t.duration).toBeGreaterThanOrEqual(1);
        for (const d of t.dependsOn) expect(d < t.id, label).toBe(true);
      });
      const s = computeSchedule(plan.tasks);
      const ref = reference(plan.tasks);
      expect(s.duration, label).toBe(ref.duration);
      expect(ref.critical, label).toHaveLength(1);
      expect(s.criticalPaths.map((p) => p.join(' ')), label).toEqual(ref.critical);
      for (const t of plan.tasks) {
        expect(s.byId[t.id].slack, `${label} ${t.id}`).toBe(ref.spare.get(t.id));
        expect(s.byId[t.id].earliestFinish, `${label} ${t.id}`).toBe(ref.earliestFinish.get(t.id));
        for (const late of [1, 2, 5]) expect(finishShift(plan, t.id, late)).toBe(referenceShift(plan.tasks, t.id, late));
      }
      expect([...ref.spare.values()].filter((v) => v > 0).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('draws on every project template', () => {
    const used = new Set(SEEDS.slice(0, 200).map((seed) => planFor(seed, 'normal').template));
    expect([...used].sort()).toEqual(TEMPLATES.map((t) => t.id).sort());
  });
});

describe('gantt items', () => {
  it.each(LEVELS)('accept the reference answer and reject a wrong one (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const plan = planFor(seed, level);
      for (const kind of GANTT_KINDS) {
        const item = ganttItem({ kind, seed }, level);
        const label = `${kind} seed ${seed} ${level}`;
        const right = referenceAnswer(plan, item, kind);
        const result = item.check(right);
        expect(result.correct, `${label}: ${right} vs ${result.expected}`).toBe(true);
        const wrong = item.check(wrongAnswer(plan, kind, right));
        expect(wrong.correct, label).toBe(false);
        expect(wrong.counted, label).not.toBe(false);
        expect(item.check('banana').counted, label).toBe(false);
        // The expected answer, typed back, is accepted.
        const typedBack = kind === 'milestone' ? result.expected.charAt(0) : result.expected.replace(/:.*$/, '');
        expect(item.check(typedBack).correct, `${label}: ${typedBack}`).toBe(true);
        // A text Gantt chart follows every counted answer, in ASCII and without the word slack.
        const chart = result.followUp?.[0];
        expect(chart?.kind, label).toBe('pre');
        if (chart?.kind === 'pre') {
          expect(chart.text).toMatch(/^[\x20-\x7e\n]+$/);
          expect(chart.text).not.toMatch(/slack|float/i);
        }
        expect(fromGanttInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
  });

  it('never names slack or float in a question or a reason', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      for (const kind of GANTT_KINDS) {
        const item = ganttItem({ kind, seed }, 'hard');
        expect(JSON.stringify(item.prompt)).not.toMatch(/slack|float/i);
        expect(item.check('0').reason + item.check('A').reason).not.toMatch(/slack|float/i);
      }
    }
  });

  it('asks about critical tasks and every kind of delay', () => {
    const delays = new Set<string>();
    const effects = new Set<string>();
    for (const seed of SEEDS) {
      const plan = planFor(seed, 'normal');
      const ref = reference(plan.tasks);
      const delay = ganttItem({ kind: 'delay', seed }, 'normal');
      const id = /task ([A-I]) \(/.exec(promptText(delay))![1];
      delays.add(ref.spare.get(id) === 0 ? 'critical' : 'spare');
      const effect = ganttItem({ kind: 'effect', seed }, 'normal');
      const m = /Task ([A-I]) \(.*\) finishes (\d+) days? later/.exec(promptText(effect))!;
      const spare = ref.spare.get(m[1])!;
      const late = Number(m[2]);
      effects.add(spare === 0 ? 'critical' : late < spare ? 'within' : late === spare ? 'exactly' : 'beyond');
    }
    expect([...delays].sort()).toEqual(['critical', 'spare']);
    expect([...effects].sort()).toEqual(['beyond', 'critical', 'exactly', 'within']);
    for (const seed of SEEDS.slice(0, 100)) {
      const item = ganttItem({ kind: 'delay', seed }, 'easy');
      const id = /task ([A-I]) \(/.exec(promptText(item))![1];
      expect(reference(planFor(seed, 'easy').tasks).spare.get(id)).toBeGreaterThan(0);
    }
  });

  it('parses task lists and day counts leniently', () => {
    const ids = ['A', 'B', 'C', 'D', 'E'];
    for (const typed of ['A B D', 'a, b, d', 'A-B-D', 'A -> B -> D', 'ABD', '[A, B, D]', 'A then B then D']) expect(parseTaskList(typed, ids)).toEqual(['A', 'B', 'D']);
    expect(parseTaskList('A B Z', ids)).toBeNull();
    expect(parseTaskList('', ids)).toBeNull();
    expect(parseDays('3')).toBe(3);
    expect(parseDays('3 days')).toBe(3);
    expect(parseDays('by 2 days', true)).toBe(2);
    expect(parseDays("it doesn't move", true)).toBe(0);
    expect(parseDays('no', true)).toBe(0);
    expect(parseDays('no')).toBeNull();
    expect(parseDays('2.5')).toBeNull();
    expect(parseDays('-1')).toBeNull();
  });

  it('marks the critical path wrong, with a hint, when its tasks are out of order', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const item = ganttItem({ kind: 'critical', seed }, 'normal');
      const path = reference(planFor(seed, 'normal').tasks).critical[0].split(' ');
      const r = item.check([...path].reverse().join(' '));
      expect(r.correct).toBe(false);
      expect(r.reason).toMatch(/^Those are the right tasks, but list them in the order they run/);
      expect(item.check('A A B').counted).toBe(false);
    }
  });

  it('rewords the chart key and column', () => {
    const chart = 'Task  Days  Slack  1\nx\n\nScale: 1 column = 1 day. Key: = other task, . slack.';
    expect(sparedWording(chart)).toBe('Task  Days  Spare  1\nx\n\nScale: 1 column = 1 day. Key: = other task, . spare days.');
  });
});

describe('gantt rounds', () => {
  it('asks five questions on each of two plans', () => {
    const plan = planGanttRound(9);
    expect(plan.map((s) => s.kind)).toEqual([...GANTT_KINDS, ...GANTT_KINDS]);
    expect(new Set(plan.slice(0, 5).map((s) => s.seed)).size).toBe(1);
    expect(plan[0].seed).not.toBe(plan[5].seed);
  });

  it('generates standalone items deterministically', () => {
    const ids = new Set<string>();
    for (const seed of SEEDS.slice(0, 200)) {
      const item = generateGanttItem(seed, 'normal');
      ids.add(item.id);
      expect(generateGanttItem(seed, 'normal').prompt).toEqual(item.prompt);
      expect(fromGanttInstance(item.instance!)?.prompt).toEqual(item.prompt);
    }
    expect(ids.size).toBe(5);
    expect(fromGanttInstance('gantt:nope:seed=1:easy')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };
    const session = game.start(ctx, { difficulty: level, seed: 11 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('???').expected;
      const typed = /^[A-D]\. /.test(expected) ? expected.charAt(0) : expected.replace(/:.*$/, '');
      const r = session.answer(typed);
      expect(r.correct).toBe(true);
      expect(r.followUp?.[0]?.kind).toBe('pre');
    }
    expect(session.summary()).toMatchObject({ gameId: 'gantt', score: 10, total: 10 });
  });
});
