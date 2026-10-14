/**
 * `usecase` items, three kinds:
 * - actors: pick the actors (roles) from a numbered list of the roles, systems, devices,
 *   organisations and data in a scenario (type their numbers, in any order);
 * - link: choose <<includes>> (the base use case always incorporates the other's behaviour) or
 *   <<extends>> (the other use case adds to the base only when a condition is met) for a stated
 *   relationship;
 * - spot: a rendered use case diagram with one error (an actor inside the system boundary, an
 *   association between two actors, <<includes>> for an optional step, <<extends>> for a step that
 *   always happens, or either relationship drawn pointing the wrong way); name the marked element
 *   that is wrong.
 *
 * Each item stands alone; instances ("usecase:spot:bookshop:actor-actor:seed=3:normal")
 * regenerate them exactly.
 */
import type { KkId } from '../../content/schema';
import { normaliseAnswer, parseList } from '../../lib/text';
import type { TerminalBlock } from '../../terminal/blocks';
import { formatAnd, LETTERS, matchOption, parseChoice } from '../answers';
import { childSeed, mulberry32, pick, sample, shuffle } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { diagramFor, LINK_KEYS, SYSTEMS, USE_CASE_ERRORS, type ActorSlot, type Relationship, type UseCaseError, type UseCaseSlot, type UseCaseSystem } from './systems';

export const USECASE_KINDS = ['actors', 'link', 'spot'] as const;
export type UsecaseKind = (typeof USECASE_KINDS)[number];

export const USECASE_KK: KkId[] = ['U3O2-KK08'];

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export interface UsecaseSpec {
  kind: UsecaseKind;
  system: string;
  seed: number;
  /** For 'link': which relationship ('main', 'optional' or an extra's id). */
  link?: string;
  /** For 'spot': the injected error. */
  error?: UseCaseError;
}

export function systemById(id: string): UseCaseSystem {
  const s = SYSTEMS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown usecase system ${id}`);
  return s;
}

function scenarioBlock(sys: UseCaseSystem): TerminalBlock {
  return { kind: 'text', text: sys.scenario };
}

// ---------------------------------------------------------------------------
// Actors
// ---------------------------------------------------------------------------

interface Candidate {
  label: string;
  actor: boolean;
  why: string;
}

/** Numbers typed leniently ("1 3 4", "1, 3, 4", "134" for single digits). Null when one isn't a listed number. */
export function parseNumbers(input: string, count: number): number[] | null {
  const tokens = parseList(input.replace(/\band\b/gi, ' '));
  const out: number[] = [];
  for (const t of tokens) {
    if (!/^\d+$/.test(t)) return null;
    const digits = count < 10 && t.length > 1 ? [...t].map(Number) : [Number(t)];
    for (const n of digits) {
      if (n < 1 || n > count) return null;
      out.push(n);
    }
  }
  return out.length ? out : null;
}

/** How many of a system's four non-actors each difficulty lists beside the three actors. */
export const NON_ACTORS: Record<Difficulty, number> = { easy: 2, normal: 3, hard: 4 };

export function actorsItem(sys: UseCaseSystem, seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'actors'));
  const actors: Candidate[] = (['a1', 'a2', 'a3'] as ActorSlot[]).map((slot) => ({ label: sys.actors[slot], actor: true, why: sys.actorWhy[slot] }));
  const others: Candidate[] = sys.notActors.map((n) => ({ label: n.label, actor: false, why: n.why }));
  const list = shuffle(rng, [...actors, ...sample(rng, others, NON_ACTORS[difficulty])]);
  const answer = list.flatMap((c, i) => (c.actor ? [i + 1] : []));
  const expected = formatAnd(answer.map((n) => `${n} (${list[n - 1].label})`));
  const reason = [
    `An actor is a role: a kind of user who interacts with the system. Here ${list.filter((c) => c.actor).map((c) => c.why).join('; ')}.`,
    `Not actors: ${list
      .filter((c) => !c.actor)
      .map((c) => `${c.label}, because ${c.why}`)
      .join('; ')}.`,
  ].join(' ');
  const hint = `Type the numbers of every actor, separated by spaces or commas, in any order.`;
  return {
    id: 'gen-usecase-actors',
    kk: USECASE_KK,
    instance: `usecase:actors:${sys.id}:seed=${seed}:${difficulty}`,
    prompt: [
      scenarioBlock(sys),
      { kind: 'text', text: 'Which of these are actors on a use case diagram for this system? An actor is a role, labelled under or above its figure.', tone: 'accent' },
      { kind: 'choices', options: list.map((c) => c.label), labels: 'numbers' },
      { kind: 'text', text: hint, tone: 'muted' },
    ],
    check(input) {
      const got = parseNumbers(input, list.length);
      if (!got) return { correct: false, expected, reason: `Use the numbers 1 to ${list.length}. ${hint}`, counted: false };
      const chosen = new Set(got);
      const correct = chosen.size === answer.length && answer.every((n) => chosen.has(n));
      return { correct, expected, reason };
    },
  };
}

// ---------------------------------------------------------------------------
// Includes or extends
// ---------------------------------------------------------------------------

export function relationships(sys: UseCaseSystem): Relationship[] {
  return [
    { id: 'main', base: sys.useCases.u1, other: sys.useCases.u2, type: 'includes', statement: sys.always },
    { id: 'optional', base: sys.useCases.u1, other: sys.useCases.u3, type: 'extends', statement: sys.sometimes },
    ...sys.extra,
  ];
}

const LINK_OPTIONS: readonly { value: 'includes' | 'extends'; accept: readonly string[] }[] = [
  { value: 'includes', accept: ['includes', 'include', 'included', 'including', '<<includes>>', '<<include>>', 'inclusion'] },
  { value: 'extends', accept: ['extends', 'extend', 'extended', 'extending', '<<extends>>', '<<extend>>', 'extension'] },
];

export function parseLinkType(input: string): 'includes' | 'extends' | null {
  return matchOption(normaliseAnswer(input).replace(/[<>«»]/g, ''), LINK_OPTIONS.map((o) => ({ value: o.value, accept: o.accept.map((a) => a.replace(/[<>]/g, '')) })));
}

export function linkItem(sys: UseCaseSystem, linkId: string, seed: number, difficulty: Difficulty): QuizItem {
  const rel = relationships(sys).find((r) => r.id === linkId);
  if (!rel) throw new Error(`unknown relationship ${linkId} for ${sys.id}`);
  const expected = `<<${rel.type}>>`;
  const reason =
    rel.type === 'includes'
      ? `${rel.other} is always performed as part of ${rel.base}, so ${rel.base} <<includes>> ${rel.other}. The dashed arrow points from the base use case, ${rel.base}, to the included one, ${rel.other}.`
      : `${rel.other} happens only sometimes, when its condition is met, so ${rel.other} <<extends>> ${rel.base}. The dashed arrow points from the extending use case, ${rel.other}, to the base use case, ${rel.base}.`;
  return {
    id: 'gen-usecase-link',
    kk: USECASE_KK,
    instance: `usecase:link:${sys.id}:${rel.id}:seed=${seed}:${difficulty}`,
    chips: ['includes', 'extends'],
    prompt: [
      { kind: 'text', text: `${sys.org} is modelling its ${sys.system.toLowerCase()}.`, tone: 'muted' },
      { kind: 'text', text: rel.statement },
      { kind: 'text', text: `Should the relationship between ${rel.base} and ${rel.other} be <<includes>> or <<extends>>?`, tone: 'accent' },
      { kind: 'text', text: 'Type includes or extends.', tone: 'muted' },
    ],
    check(input) {
      const chosen = parseLinkType(input);
      if (!chosen) return { correct: false, expected, reason: 'Type includes or extends.', counted: false };
      return { correct: chosen === rel.type, expected, reason };
    },
  };
}

// ---------------------------------------------------------------------------
// Spot the error
// ---------------------------------------------------------------------------

interface Marked {
  key: string;
  describe: string;
}

function nameOf(sys: UseCaseSystem, id: string): string {
  return id.startsWith('a') ? sys.actors[id as ActorSlot] : sys.useCases[id as UseCaseSlot];
}

/** How the reason names a link: an association is a line, a relationship an arrow with its stereotype. */
function linkName(sys: UseCaseSystem, link: { from: string; to: string; type: 'association' | 'includes' | 'extends' }): string {
  if (link.type === 'association') return `the line between ${nameOf(sys, link.from)} and ${nameOf(sys, link.to)}`;
  return `the <<${link.type}>> arrow from ${nameOf(sys, link.from)} to ${nameOf(sys, link.to)}`;
}

function errorKey(error: UseCaseError): string {
  switch (error) {
    case 'actor-inside':
      return 'a2';
    case 'actor-actor':
      return LINK_KEYS.a1a2;
    case 'includes-optional':
    case 'extends-reversed':
      return LINK_KEYS.u1u3;
    case 'extends-always':
    case 'includes-reversed':
      return LINK_KEYS.u2u1;
  }
}

function errorWhy(sys: UseCaseSystem, error: UseCaseError): string {
  const { u1, u2, u3 } = sys.useCases;
  switch (error) {
    case 'actor-inside':
      return `${sys.actors.a2} is drawn inside the system boundary. The boundary holds the use cases and the links between them; actors use the system from outside, so they are drawn outside it.`;
    case 'actor-actor':
      return `It joins two actors, ${sys.actors.a1} and ${sys.actors.a2}. An association is a line between an actor and a use case it takes part in; a use case diagram doesn't show actors interacting with each other.`;
    case 'includes-optional':
      return `${sys.sometimes} A use case that adds to the base only when a condition is met extends it, so it should be ${u3} <<extends>> ${u1}, with the arrow from ${u3} to ${u1}.`;
    case 'extends-always':
      return `${sys.always} A use case whose behaviour the base always incorporates is included, so it should be ${u1} <<includes>> ${u2}, with the arrow from ${u1} to ${u2}.`;
    case 'includes-reversed':
      return `${sys.always} So ${u1} <<includes>> ${u2}, and the arrow points from the base use case, ${u1}, to the included one, ${u2}. Here it points the other way.`;
    case 'extends-reversed':
      return `${sys.sometimes} So ${u3} <<extends>> ${u1}, and the arrow points from the extending use case, ${u3}, to the base use case, ${u1}. Here it points the other way.`;
  }
}

/** Every element that could be marked, read off the diagram itself, with how the reason names it. */
function markable(sys: UseCaseSystem, error: UseCaseError): Marked[] {
  const fig = diagramFor(sys, error);
  return [
    ...fig.actors.map((a) => ({ key: a.id, describe: `the actor ${a.label}` })),
    ...fig.links.map((l) => ({ key: `${l.from}->${l.to}`, describe: linkName(sys, l) })),
  ];
}

export function spotItem(sys: UseCaseSystem, error: UseCaseError, seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, `spot:${error}`));
  const faulty = errorKey(error);
  const all = markable(sys, error);
  const others = all.filter((m) => m.key !== faulty);
  // Mark the faulty element and three (or, on --hard, four) correct ones, favouring the same kind of element.
  const sameKind = others.filter((m) => m.key.includes('->') === faulty.includes('->'));
  const n = difficulty === 'hard' ? 4 : 3;
  const picks = sample(rng, sameKind, Math.min(2, sameKind.length));
  const rest = sample(
    rng,
    others.filter((m) => !picks.includes(m)),
    n - picks.length,
  );
  const marked = shuffle(rng, [all.find((m) => m.key === faulty)!, ...picks, ...rest]);
  const answer = marked.findIndex((m) => m.key === faulty);
  const letters = marked.map((_, i) => LETTERS[i]);
  const figure = diagramFor(sys, error, `usecase-${sys.id}-${error}`);
  const expected = `${letters[answer]}: ${marked[answer].describe}`;
  const reason = `${letters[answer]} is ${marked[answer].describe}. ${errorWhy(sys, error)}`;
  const count = marked.length;
  return {
    id: 'gen-usecase-spot',
    kk: USECASE_KK,
    instance: `usecase:spot:${sys.id}:${error}:seed=${seed}:${difficulty}`,
    chips: letters,
    prompt: [
      scenarioBlock(sys),
      { kind: 'figure', figure, highlight: Object.fromEntries(marked.map((m, i) => [m.key, letters[i]])), compact: true },
      { kind: 'text', text: `One of the marked elements, ${formatAnd(letters)}, is drawn wrongly or doesn't match the scenario. Which one?`, tone: 'accent' },
      { kind: 'text', text: `Type a letter from A to ${letters[count - 1]}.`, tone: 'muted' },
    ],
    check(input) {
      const chosen = parseChoice(input, count);
      if (chosen === null) return { correct: false, expected, reason: `Type a letter from A to ${letters[count - 1]}.`, counted: false };
      return { correct: chosen === answer, expected, reason };
    },
  };
}

// ---------------------------------------------------------------------------
// Items, instances and rounds
// ---------------------------------------------------------------------------

export function usecaseItem(spec: UsecaseSpec, difficulty: Difficulty): QuizItem {
  const sys = systemById(spec.system);
  const seed = spec.seed >>> 0;
  switch (spec.kind) {
    case 'actors':
      return actorsItem(sys, seed, difficulty);
    case 'link':
      return linkItem(sys, spec.link ?? 'main', seed, difficulty);
    case 'spot':
      return spotItem(sys, spec.error ?? 'actor-inside', seed, difficulty);
  }
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromUsecaseInstance(instance: string): QuizItem | null {
  const m = /^usecase:(actors|link|spot):([a-z]+)(?::([a-z-]+))?:seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (!m || !SYSTEMS.some((s) => s.id === m[2]) || !DIFFICULTIES.includes(m[5] as Difficulty)) return null;
  const sys = systemById(m[2]);
  const kind = m[1] as UsecaseKind;
  if (kind === 'actors' && m[3]) return null;
  if (kind === 'link' && !relationships(sys).some((r) => r.id === m[3])) return null;
  if (kind === 'spot' && !(USE_CASE_ERRORS as readonly string[]).includes(m[3] ?? '')) return null;
  return usecaseItem({ kind, system: sys.id, seed: Number(m[4]), link: kind === 'link' ? m[3] : undefined, error: kind === 'spot' ? (m[3] as UseCaseError) : undefined }, m[5] as Difficulty);
}

const MIX: Record<Difficulty, Record<UsecaseKind, number>> = {
  easy: { actors: 3, link: 4, spot: 3 },
  normal: { actors: 2, link: 4, spot: 4 },
  hard: { actors: 2, link: 3, spot: 5 },
};

/** Error kinds come up in a shuffled order across a round's spot questions, none repeated until all six have. */
export function planUsecaseRound(seed: number, difficulty: Difficulty, count = 10): UsecaseSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const specs: UsecaseSpec[] = [];
  for (let cycle = 0; specs.length < count; cycle++) {
    const mix = MIX[difficulty];
    const errors = [...shuffle(rng, USE_CASE_ERRORS), ...shuffle(rng, USE_CASE_ERRORS)];
    const links = shuffle(
      rng,
      SYSTEMS.flatMap((s) => relationships(s).map((r) => ({ system: s.id, link: r.id }))),
    );
    const systems = () => shuffle(rng, SYSTEMS.map((s) => s.id));
    const actorSystems = systems();
    const spotSystems = systems();
    const round: UsecaseSpec[] = [
      ...Array.from({ length: mix.actors }, (_, i): UsecaseSpec => ({ kind: 'actors', system: actorSystems[i % actorSystems.length], seed: 0 })),
      ...Array.from({ length: mix.link }, (_, i): UsecaseSpec => ({ kind: 'link', system: links[i].system, link: links[i].link, seed: 0 })),
      ...Array.from({ length: mix.spot }, (_, i): UsecaseSpec => ({ kind: 'spot', system: spotSystems[i % spotSystems.length], error: errors[i], seed: 0 })),
    ];
    for (const [i, spec] of shuffle(rng, round).entries()) specs.push({ ...spec, seed: childSeed(seed, `${cycle}:${i}`) });
  }
  return specs.slice(0, count);
}

/** Game.generate: one self-contained item of any kind. */
export function generateUsecaseItem(seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'kind'));
  const kind = pick(rng, USECASE_KINDS);
  const sys = pick(rng, SYSTEMS);
  const spec: UsecaseSpec =
    kind === 'link'
      ? { kind, system: sys.id, seed, link: pick(rng, relationships(sys)).id }
      : kind === 'spot'
        ? { kind, system: sys.id, seed, error: pick(rng, USE_CASE_ERRORS) }
        : { kind, system: sys.id, seed };
  return usecaseItem(spec, difficulty);
}
