/**
 * Project plans for the `gantt` game. Each plan comes from a hand-written project template: nine
 * named tasks for an invented Australian organisation, with dependencies that make sense in
 * order (the SRS before the design, the design before the code). A seed chooses the template,
 * drops some tasks to leave 5 to 9, and rolls the durations until the plan has exactly one
 * critical path and at least two tasks with time to spare, so every question has one answer.
 *
 * Plans use days. Tasks are relettered A, B, C, ... in template order, which is always a valid
 * dependency order.
 */
import { computeSchedule, type Schedule } from '../../figures/gantt/schedule';
import { childSeed, mulberry32, randInt, sample, type Rng } from '../prng';
import type { Difficulty } from '../types';

export interface TemplateTask {
  key: string;
  name: string;
  after: readonly string[];
  /** The event its finish marks, for a milestone question ("SRS signed off by the client"). */
  milestone?: string;
  /** Never dropped when the plan is shortened (the first task, the main coding task, testing, the last task). */
  keep?: boolean;
}

export interface ProjectTemplate {
  id: string;
  org: string;
  project: string;
  tasks: readonly TemplateTask[];
}

export interface PlanTask {
  id: string;
  name: string;
  duration: number;
  dependsOn: string[];
  /** The event this task's finish marks, when it makes a sensible milestone. */
  event?: string;
}

export interface Plan {
  template: string;
  org: string;
  project: string;
  tasks: PlanTask[];
}

export const TEMPLATES: readonly ProjectTemplate[] = [
  {
    id: 'booking',
    org: 'Lakeside Physio in Ballarat',
    project: 'an online booking app',
    tasks: [
      { key: 'interview', name: 'Interview staff', after: [], keep: true },
      { key: 'srs', name: 'Write the SRS', after: ['interview'], milestone: 'SRS signed off by the clinic' },
      { key: 'ui', name: 'Design the screens', after: ['srs'] },
      { key: 'db', name: 'Design the database', after: ['srs'] },
      { key: 'book', name: 'Code the booking module', after: ['ui', 'db'], keep: true },
      { key: 'report', name: 'Code the reports', after: ['db'] },
      { key: 'guide', name: 'Write the user guide', after: ['ui'] },
      { key: 'test', name: 'Test the app', after: ['book', 'report'], keep: true, milestone: 'Testing complete' },
      { key: 'train', name: 'Train reception staff', after: ['test', 'guide'], keep: true, milestone: 'App in use at the clinic' },
    ],
  },
  {
    id: 'stock',
    org: 'Redgum Hardware in Shepparton',
    project: 'a stock control program',
    tasks: [
      { key: 'observe', name: 'Observe the warehouse', after: [], keep: true },
      { key: 'reqs', name: 'Document requirements', after: ['observe'], milestone: 'Requirements approved by the owner' },
      { key: 'mockups', name: 'Draw mock-ups', after: ['reqs'] },
      { key: 'dictionary', name: 'Write the data dictionary', after: ['reqs'] },
      { key: 'entry', name: 'Code stock entry screens', after: ['mockups', 'dictionary'], keep: true },
      { key: 'reports', name: 'Code stock reports', after: ['dictionary'] },
      { key: 'alpha', name: 'Alpha test', after: ['entry', 'reports'], keep: true, milestone: 'Alpha testing complete' },
      { key: 'guide', name: 'Write the user guide', after: ['mockups'] },
      { key: 'install', name: 'Install on warehouse PCs', after: ['alpha', 'guide'], keep: true, milestone: 'Program handed over to Redgum' },
    ],
  },
  {
    id: 'website',
    org: 'Wattle Flat Netball Club in Bendigo',
    project: 'a club website',
    tasks: [
      { key: 'meet', name: 'Meet the committee', after: [], keep: true },
      { key: 'scope', name: 'Agree the scope', after: ['meet'], milestone: 'Scope agreed with the committee' },
      { key: 'layout', name: 'Design page layouts', after: ['scope'] },
      { key: 'collect', name: 'Collect photos and text', after: ['scope'] },
      { key: 'pages', name: 'Build the pages', after: ['layout'], keep: true },
      { key: 'form', name: 'Code the sign-up form', after: ['layout'] },
      { key: 'load', name: 'Load the content', after: ['pages', 'collect'] },
      { key: 'test', name: 'Test on phones and laptops', after: ['load', 'form'], keep: true, milestone: 'Testing complete' },
      { key: 'launch', name: 'Launch the site', after: ['test'], keep: true, milestone: 'Website live' },
    ],
  },
  {
    id: 'app',
    org: 'Saltbush Café in Mildura',
    project: 'a phone ordering app',
    tasks: [
      { key: 'survey', name: 'Survey customers', after: [], keep: true },
      { key: 'srs', name: 'Write the SRS', after: ['survey'], milestone: 'SRS signed off by the owner' },
      { key: 'ideas', name: 'Generate design ideas', after: ['srs'] },
      { key: 'detail', name: 'Produce the detailed design', after: ['ideas'], milestone: 'Design approved by the owner' },
      { key: 'payments', name: 'Set up payments', after: ['srs'] },
      { key: 'menu', name: 'Code the menu screens', after: ['detail'] },
      { key: 'orders', name: 'Code ordering', after: ['detail', 'payments'], keep: true },
      { key: 'test', name: 'Beta test with regulars', after: ['menu', 'orders'], keep: true, milestone: 'Beta testing complete' },
      { key: 'release', name: 'Release the app', after: ['test'], keep: true, milestone: 'App released' },
    ],
  },
  {
    id: 'rostering',
    org: 'Kestrel Aged Care in Geelong',
    project: 'a staff rostering program',
    tasks: [
      { key: 'interview', name: 'Interview shift managers', after: [], keep: true },
      { key: 'srs', name: 'Write the SRS', after: ['interview'], milestone: 'SRS approved by management' },
      { key: 'rules', name: 'Document award rules', after: ['interview'] },
      { key: 'design', name: 'Design the roster screens', after: ['srs'] },
      { key: 'engine', name: 'Code the rostering rules', after: ['srs', 'rules'], keep: true },
      { key: 'screens', name: 'Code the screens', after: ['design'] },
      { key: 'import', name: 'Import staff records', after: ['engine'] },
      { key: 'test', name: 'Test with managers', after: ['screens', 'engine', 'import'], keep: true, milestone: 'Testing complete' },
      { key: 'golive', name: 'Switch over to the program', after: ['test'], keep: true, milestone: 'Program in use on every ward' },
    ],
  },
];

const TASK_COUNT: Record<Difficulty, [number, number]> = { easy: [5, 6], normal: [6, 8], hard: [8, 9] };
const DAYS: Record<Difficulty, [number, number]> = { easy: [1, 5], normal: [1, 7], hard: [1, 8] };

/** Drops `drop` from the template: each task that depended on a dropped task inherits its dependencies. */
function shorten(template: ProjectTemplate, drop: ReadonlySet<string>): TemplateTask[] {
  const deps = new Map<string, string[]>();
  for (const t of template.tasks) {
    const resolved = new Set<string>();
    for (const d of t.after) {
      if (drop.has(d)) for (const inherited of deps.get(d) ?? []) resolved.add(inherited);
      else resolved.add(d);
    }
    deps.set(t.key, [...resolved]);
  }
  return template.tasks.filter((t) => !drop.has(t.key)).map((t) => ({ ...t, after: pruneTransitive(deps.get(t.key)!, deps) }));
}

/** Removes a dependency that another listed dependency already implies (A before C when B needs A). */
function pruneTransitive(list: readonly string[], deps: ReadonlyMap<string, readonly string[]>): string[] {
  const reaches = (from: string, target: string, seen = new Set<string>()): boolean => {
    for (const d of deps.get(from) ?? []) {
      if (d === target) return true;
      if (!seen.has(d)) {
        seen.add(d);
        if (reaches(d, target, seen)) return true;
      }
    }
    return false;
  };
  return list.filter((d) => !list.some((other) => other !== d && reaches(other, d)));
}

function letter(i: number): string {
  return String.fromCharCode(65 + i);
}

/** True when the plan suits the questions: one critical path of three or more tasks, and at least two tasks with time to spare. */
export function suitable(schedule: Schedule): boolean {
  return schedule.criticalPaths.length === 1 && schedule.criticalPaths[0].length >= 3 && schedule.tasks.filter((t) => t.slack > 0).length >= 2 && schedule.duration <= 45;
}

function rollPlan(rng: Rng, difficulty: Difficulty): Plan | null {
  const template = TEMPLATES[Math.floor(rng() * TEMPLATES.length)];
  const [lo, hi] = TASK_COUNT[difficulty];
  const n = randInt(rng, lo, hi);
  const droppable = template.tasks.filter((t) => !t.keep).map((t) => t.key);
  const drop = new Set(sample(rng, droppable, template.tasks.length - n));
  const kept = shorten(template, drop);
  const ids = new Map(kept.map((t, i) => [t.key, letter(i)]));
  const [dLo, dHi] = DAYS[difficulty];
  for (let attempt = 0; attempt < 40; attempt++) {
    const tasks: PlanTask[] = kept.map((t) => ({
      id: ids.get(t.key)!,
      name: t.name,
      duration: randInt(rng, dLo, dHi),
      dependsOn: t.after.map((d) => ids.get(d)!).sort(),
      ...(t.milestone ? { event: t.milestone } : {}),
    }));
    if (suitable(computeSchedule(tasks))) return { template: template.id, org: template.org, project: template.project, tasks };
  }
  return null;
}

/** The plan for a seed. Deterministic; always returns a suitable plan. */
export function planFor(seed: number, difficulty: Difficulty): Plan {
  for (let k = 0; ; k++) {
    const plan = rollPlan(mulberry32(childSeed(seed, `plan:${k}`)), difficulty);
    if (plan) return plan;
  }
}
