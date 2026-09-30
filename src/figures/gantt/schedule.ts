/**
 * Critical path method for Gantt figures and the `gantt` game. Pure and deterministic.
 *
 * Times count whole units (days or weeks) from the start of the project: a task with earliest
 * start 0 and duration 3 occupies units 1 to 3 and finishes at 3. A zero-duration task is a
 * milestone that happens at its start time.
 *
 * - Earliest start is the latest earliest finish of the task's dependencies, or 0. An explicit
 *   `start` means "starts no earlier than": it can delay a task but never lets it start before a
 *   dependency has finished.
 * - Latest finish is the earliest latest start of the task's dependants, or the project duration
 *   for a task nothing depends on. Slack (total float) is latest start minus earliest start.
 * - A task is critical when its slack is zero. A critical path is a chain of critical tasks, each
 *   starting exactly when the one before it finishes, that runs from a task whose earliest start
 *   is not set by a dependency to a task that finishes at the project's end. When several chains
 *   tie, every one is returned.
 */

export interface ScheduleTask {
  id: string;
  duration: number;
  dependsOn: readonly string[];
  /** Starts no earlier than this many units after the project starts. */
  start?: number;
}

export interface TaskTiming {
  id: string;
  duration: number;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  /** Total float: how far the task can slip without delaying the project. */
  slack: number;
  critical: boolean;
}

export interface Schedule {
  /** One entry per task, in input order. */
  tasks: TaskTiming[];
  byId: Record<string, TaskTiming>;
  /** Total project duration: the latest earliest finish. */
  duration: number;
  /** Every critical path as an ordered list of task ids, sorted by input position. */
  criticalPaths: string[][];
  /** Ids of every critical task, in input order. */
  critical: string[];
}

export class ScheduleError extends Error {
  override name = 'ScheduleError';
}

const EPS = 1e-9;

/** Tasks in dependency order (Kahn), or a ScheduleError naming the tasks in a cycle. */
function topologicalOrder(tasks: readonly ScheduleTask[], index: ReadonlyMap<string, number>): number[] {
  const indegree = tasks.map((t) => t.dependsOn.length);
  const dependants: number[][] = tasks.map(() => []);
  tasks.forEach((t, i) => t.dependsOn.forEach((d) => dependants[index.get(d)!].push(i)));
  const queue = indegree.flatMap((n, i) => (n === 0 ? [i] : []));
  const order: number[] = [];
  while (queue.length) {
    const i = queue.shift()!;
    order.push(i);
    for (const j of dependants[i]) if (--indegree[j] === 0) queue.push(j);
  }
  if (order.length !== tasks.length) throw new ScheduleError(`Gantt tasks form a dependency cycle: ${describeCycle(tasks, index, indegree)}.`);
  return order;
}

/** Walks back through unfinished dependencies from a task left in the cycle, e.g. "a, b, c, a". */
function describeCycle(tasks: readonly ScheduleTask[], index: ReadonlyMap<string, number>, indegree: readonly number[]): string {
  let at = indegree.findIndex((n) => n > 0);
  const seen: number[] = [];
  while (!seen.includes(at)) {
    seen.push(at);
    const next = tasks[at].dependsOn.map((d) => index.get(d)!).find((j) => indegree[j] > 0);
    if (next === undefined) break;
    at = next;
  }
  const loop = seen.slice(seen.indexOf(at)).reverse();
  return [...loop, loop[0]].map((i) => tasks[i].id).join(' → ');
}

function validate(tasks: readonly ScheduleTask[]): Map<string, number> {
  const index = new Map<string, number>();
  tasks.forEach((t, i) => {
    if (index.has(t.id)) throw new ScheduleError(`Gantt task id "${t.id}" is used more than once.`);
    if (!Number.isFinite(t.duration) || t.duration < 0) throw new ScheduleError(`Gantt task "${t.id}" needs a duration of 0 or more.`);
    if (t.start !== undefined && (!Number.isFinite(t.start) || t.start < 0)) throw new ScheduleError(`Gantt task "${t.id}" has a start before the project starts.`);
    index.set(t.id, i);
  });
  for (const t of tasks) {
    for (const d of t.dependsOn) {
      if (d === t.id) throw new ScheduleError(`Gantt tasks form a dependency cycle: ${d} → ${d}.`);
      if (!index.has(d)) throw new ScheduleError(`Gantt task "${t.id}" depends on "${d}", which is not a task.`);
    }
  }
  return index;
}

/** Earliest and latest times, slack and critical paths for a set of tasks. Throws ScheduleError. */
export function computeSchedule(tasks: readonly ScheduleTask[]): Schedule {
  const index = validate(tasks);
  // Duplicate dependencies would double-count in the in-degree; they mean the same thing once.
  const deps = tasks.map((t) => [...new Set(t.dependsOn)].map((d) => index.get(d)!));
  const unique = tasks.map((t, i) => ({ ...t, dependsOn: deps[i].map((j) => tasks[j].id) }));
  const order = topologicalOrder(unique, index);
  const dependants: number[][] = tasks.map(() => []);
  deps.forEach((ds, i) => ds.forEach((d) => dependants[d].push(i)));

  const es = new Array<number>(tasks.length).fill(0);
  const ef = new Array<number>(tasks.length).fill(0);
  for (const i of order) {
    const lead = tasks[i].start ?? 0;
    es[i] = deps[i].reduce((m, d) => Math.max(m, ef[d]), lead);
    ef[i] = es[i] + tasks[i].duration;
  }
  const duration = ef.reduce((m, f) => Math.max(m, f), 0);

  const lf = new Array<number>(tasks.length).fill(duration);
  const ls = new Array<number>(tasks.length).fill(duration);
  for (let k = order.length - 1; k >= 0; k--) {
    const i = order[k];
    lf[i] = dependants[i].reduce((m, j) => Math.min(m, ls[j]), duration);
    ls[i] = lf[i] - tasks[i].duration;
  }

  const timings: TaskTiming[] = tasks.map((t, i) => {
    const slack = ls[i] - es[i];
    return {
      id: t.id,
      duration: t.duration,
      earliestStart: es[i],
      earliestFinish: ef[i],
      latestStart: ls[i],
      latestFinish: lf[i],
      slack: Math.abs(slack) < EPS ? 0 : slack,
      critical: Math.abs(slack) < EPS,
    };
  });

  // Critical chains: follow tight links (a dependant starting exactly when this task finishes).
  const critical = timings.map((t) => t.critical);
  const tight = (from: number, to: number) => critical[from] && critical[to] && Math.abs(ef[from] - es[to]) < EPS;
  const starts = timings.flatMap((_, i) => (critical[i] && !deps[i].some((d) => tight(d, i)) ? [i] : []));
  const paths: number[][] = [];
  const walk = (path: number[]) => {
    const last = path[path.length - 1];
    const next = dependants[last].filter((j) => tight(last, j)).sort((a, b) => a - b);
    if (!next.length) {
      if (Math.abs(ef[last] - duration) < EPS) paths.push(path);
      return;
    }
    for (const j of next) walk([...path, j]);
  };
  for (const s of starts) walk([s]);
  paths.sort((a, b) => {
    for (let k = 0; k < Math.min(a.length, b.length); k++) if (a[k] !== b[k]) return a[k] - b[k];
    return a.length - b.length;
  });

  const byId: Record<string, TaskTiming> = {};
  for (const t of timings) byId[t.id] = t;
  return {
    tasks: timings,
    byId,
    duration,
    criticalPaths: paths.map((p) => p.map((i) => tasks[i].id)),
    critical: timings.filter((t) => t.critical).map((t) => t.id),
  };
}

/** computeSchedule, or the error message when the tasks can't be scheduled. */
export function trySchedule(tasks: readonly ScheduleTask[]): { schedule: Schedule; error: null } | { schedule: null; error: string } {
  try {
    return { schedule: computeSchedule(tasks), error: null };
  } catch (e) {
    if (e instanceof ScheduleError) return { schedule: null, error: e.message };
    throw e;
  }
}
