import { describe, expect, it } from 'vitest';
import { mulberry32, randInt, type Rng } from '../../games/prng';
import { computeSchedule, ScheduleError, trySchedule, type ScheduleTask } from './schedule';

const task = (id: string, duration: number, dependsOn: string[] = [], start?: number): ScheduleTask => ({ id, duration, dependsOn, start });

describe('computeSchedule', () => {
  it('finds times, slack and the critical path of a textbook network', () => {
    // A(3) -> B(4) -> D(2); A -> C(2) -> D; D -> E(1)
    const s = computeSchedule([task('A', 3), task('B', 4, ['A']), task('C', 2, ['A']), task('D', 2, ['B', 'C']), task('E', 1, ['D'])]);
    expect(s.duration).toBe(10);
    expect(s.criticalPaths).toEqual([['A', 'B', 'D', 'E']]);
    expect(s.critical).toEqual(['A', 'B', 'D', 'E']);
    expect(s.byId.C).toMatchObject({ earliestStart: 3, earliestFinish: 5, latestStart: 5, latestFinish: 7, slack: 2, critical: false });
    expect(s.byId.D).toMatchObject({ earliestStart: 7, earliestFinish: 9, latestStart: 7, latestFinish: 9, slack: 0, critical: true });
    expect(s.tasks.map((t) => t.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('does not need tasks in dependency order', () => {
    const s = computeSchedule([task('E', 1, ['D']), task('D', 2, ['B', 'C']), task('C', 2, ['A']), task('B', 4, ['A']), task('A', 3)]);
    expect(s.duration).toBe(10);
    expect(s.criticalPaths).toEqual([['A', 'B', 'D', 'E']]);
  });

  it('returns every critical path when two chains tie', () => {
    const s = computeSchedule([task('A', 2), task('B', 3, ['A']), task('C', 3, ['A']), task('D', 1, ['B', 'C'])]);
    expect(s.criticalPaths).toEqual([
      ['A', 'B', 'D'],
      ['A', 'C', 'D'],
    ]);
  });

  it('treats an explicit start as "no earlier than"', () => {
    // B could start at 2 but is booked for 5; C's own start is overruled by its dependency.
    const s = computeSchedule([task('A', 2), task('B', 3, ['A'], 5), task('C', 1, ['A'], 1)]);
    expect(s.byId.B.earliestStart).toBe(5);
    expect(s.byId.C.earliestStart).toBe(2);
    expect(s.duration).toBe(8);
    expect(s.criticalPaths).toEqual([['B']]);
    expect(s.byId.A.slack).toBe(3);
  });

  it('keeps zero-duration milestones on the path', () => {
    const s = computeSchedule([task('A', 4), task('M', 0, ['A']), task('B', 2, ['M']), task('C', 1, ['A'])]);
    expect(s.duration).toBe(6);
    expect(s.criticalPaths).toEqual([['A', 'M', 'B']]);
    expect(s.byId.M).toMatchObject({ earliestStart: 4, earliestFinish: 4, slack: 0 });
    expect(s.byId.C.slack).toBe(1);
  });

  it('handles an empty plan and independent tasks', () => {
    expect(computeSchedule([])).toMatchObject({ duration: 0, criticalPaths: [], critical: [] });
    const s = computeSchedule([task('A', 2), task('B', 5)]);
    expect(s.criticalPaths).toEqual([['B']]);
    expect(s.byId.A.slack).toBe(3);
  });

  it('throws a clear error on a dependency cycle', () => {
    expect(() => computeSchedule([task('A', 1, ['C']), task('B', 1, ['A']), task('C', 1, ['B']), task('D', 1)])).toThrow(
      /dependency cycle: (A → B → C → A|B → C → A → B|C → A → B → C)/,
    );
    expect(() => computeSchedule([task('A', 1, ['A'])])).toThrow(ScheduleError);
    expect(() => computeSchedule([task('A', 1, ['B']), task('B', 1, ['A']), task('C', 1, ['A'])])).toThrow(/cycle/);
  });

  it('rejects unknown dependencies, duplicate ids and bad durations', () => {
    expect(() => computeSchedule([task('A', 1, ['Z'])])).toThrow('Gantt task "A" depends on "Z", which is not a task.');
    expect(() => computeSchedule([task('A', 1), task('A', 2)])).toThrow(/more than once/);
    expect(() => computeSchedule([task('A', -1)])).toThrow(/duration/);
    expect(trySchedule([task('A', 1, ['A'])])).toMatchObject({ schedule: null, error: expect.stringMatching(/cycle/) });
  });
});

// ---------------------------------------------------------------------------
// Brute-force reference: enumerate every path through the network.
// ---------------------------------------------------------------------------

interface Reference {
  duration: number;
  slack: Map<string, number>;
  earliestStart: Map<string, number>;
  criticalPaths: string[];
}

/**
 * Models the plan as a network with a source S and a sink F: S -> t weighs t's explicit start
 * (or 0), t -> u weighs t's duration when u depends on t, and t -> F weighs t's duration. Every
 * S-to-F path is a chain of tasks. The project duration is the heaviest path, a task's slack is the
 * duration minus the heaviest path through it, and the critical paths are the heaviest chains
 * that are not a contiguous piece of another heaviest chain.
 */
function reference(tasks: readonly ScheduleTask[]): Reference {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const dependants = new Map(tasks.map((t) => [t.id, tasks.filter((u) => u.dependsOn.includes(t.id)).map((u) => u.id)]));
  const chains: { ids: string[]; weight: number }[] = [];
  const extend = (ids: string[], weight: number) => {
    const last = byId.get(ids[ids.length - 1])!;
    chains.push({ ids, weight: weight + last.duration });
    for (const next of dependants.get(last.id)!) extend([...ids, next], weight + last.duration);
  };
  for (const t of tasks) extend([t.id], t.start ?? 0);

  const duration = Math.max(0, ...chains.map((c) => c.weight));
  const slack = new Map<string, number>();
  const earliestStart = new Map<string, number>();
  for (const t of tasks) {
    const through = chains.filter((c) => c.ids.includes(t.id)).reduce((m, c) => Math.max(m, c.weight), -Infinity);
    slack.set(t.id, duration - through);
    // Heaviest chain ending at t, minus t's own duration.
    const ending = chains.filter((c) => c.ids[c.ids.length - 1] === t.id).reduce((m, c) => Math.max(m, c.weight), -Infinity);
    earliestStart.set(t.id, ending - t.duration);
  }
  const heaviest = chains.filter((c) => c.weight === duration).map((c) => c.ids.join(' '));
  const criticalPaths = [...new Set(heaviest)].filter((p) => !heaviest.some((q) => q !== p && ` ${q} `.includes(` ${p} `))).sort();
  return { duration, slack, earliestStart, criticalPaths };
}

/** A random plan of 5 to 9 tasks, listed in a shuffled order. */
function randomPlan(rng: Rng): ScheduleTask[] {
  const n = randInt(rng, 5, 9);
  const ids = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  const tasks = ids.map((id, i) => {
    const dependsOn = ids.slice(0, i).filter(() => rng() < 0.35);
    const duration = rng() < 0.12 ? 0 : randInt(rng, 1, 9);
    const start = rng() < 0.15 ? randInt(rng, 0, 12) : undefined;
    return task(id, duration, dependsOn, start);
  });
  for (let i = tasks.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
  }
  return tasks;
}

describe('computeSchedule against the brute-force reference', () => {
  it('agrees on duration, every slack and the critical paths over 600 seeded plans', () => {
    let multiPath = 0;
    let withStart = 0;
    for (let seed = 1; seed <= 600; seed++) {
      const plan = randomPlan(mulberry32(seed));
      const ref = reference(plan);
      const got = computeSchedule(plan);
      const context = `seed ${seed}: ${JSON.stringify(plan)}`;
      expect(got.duration, context).toBe(ref.duration);
      for (const t of plan) {
        expect(got.byId[t.id].slack, `${context} slack ${t.id}`).toBe(ref.slack.get(t.id));
        expect(got.byId[t.id].earliestStart, `${context} ES ${t.id}`).toBe(ref.earliestStart.get(t.id));
        expect(got.byId[t.id].critical, `${context} critical ${t.id}`).toBe(ref.slack.get(t.id) === 0);
      }
      expect(got.criticalPaths.map((p) => p.join(' ')).sort(), context).toEqual(ref.criticalPaths);
      if (got.criticalPaths.length > 1) multiPath++;
      if (plan.some((t) => t.start !== undefined)) withStart++;
    }
    // The generator exercises ties and explicit starts, not just single straight chains.
    expect(multiPath).toBeGreaterThan(20);
    expect(withStart).toBeGreaterThan(200);
  });
});
