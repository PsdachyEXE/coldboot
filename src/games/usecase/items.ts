/**
 * `usecase` items, three kinds:
 * - actors: pick the actors from a numbered list of the people, systems, things and data in a
 *   scenario (type their numbers, in any order);
 * - link: choose <<includes>> (the step is always performed as part of the base use case) or
 *   <<extends>> (it is optional or happens only under a condition) for a stated relationship;
 * - spot: a rendered use case diagram with one convention error (an actor inside the system
 *   boundary, an association between two actors, <<includes>> for an optional step, or
 *   <<extends>> for a step that always happens); name the marked element that is wrong.
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
import { diagramFor, LINK_KEYS, SYSTEMS, USE_CASE_ERRORS, type ActorSlot, type Relationship, type UseCaseError, type UseCaseSystem } from './systems';

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

export function actorsItem(sys: UseCaseSystem, seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'actors'));
  const actors: Candidate[] = (['a1', 'a2', 'a3'] as ActorSlot[]).map((slot) => ({ label: sys.actors[slot], actor: true, why: sys.actorWhy[slot] }));
  const others: Candidate[] = sys.notActors.map((n) => ({ label: n.label, actor: false, why: n.why }));
  const list = shuffle(rng, [...actors, ...(difficulty === 'easy' ? sample(rng, others, 2) : others)]);
  const answer = list.flatMap((c, i) => (c.actor ? [i + 1] : []));
  const expected = formatAnd(answer.map((n) => `${n} (${list[n - 1].label})`));
  const reason = [
    `An actor is a person or an external system that interacts with the system directly: ${list.filter((c) => c.actor).map((c) => c.why).join('; ')}.`,
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
      { kind: 'text', text: 'Which of these are actors on a use case diagram for this system?', tone: 'accent' },
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
      ? `${rel.other} is always performed as part of ${rel.base}, so ${rel.base} <<includes>> ${rel.other}. The arrow points from ${rel.base} to ${rel.other}.`
      : `${rel.other} happens only sometimes, when its condition is met, so ${rel.other} <<extends>> ${rel.base}. The arrow points from ${rel.other} to ${rel.base}.`;
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

function linkName(sys: UseCaseSystem, key: string): string {
  const [from, to] = key.split('->');
  const name = (id: string) => (id.startsWith('a') ? sys.actors[id as ActorSlot] : sys.useCases[id as keyof UseCaseSystem['useCases']]);
  switch (key) {
    case LINK_KEYS.u1u2:
    case LINK_KEYS.u1u3:
      return `the <<includes>> arrow from ${name(from)} to ${name(to)}`;
    case LINK_KEYS.u3u1:
    case LINK_KEYS.u2u1:
      return `the <<extends>> arrow from ${name(from)} to ${name(to)}`;
    default:
      return `the line between ${name(from)} and ${name(to)}`;
  }
}

function errorKey(error: UseCaseError): string {
  switch (error) {
    case 'actor-inside':
      return 'a2';
    case 'actor-actor':
      return LINK_KEYS.a1a2;
    case 'includes-optional':
      return LINK_KEYS.u1u3;
    case 'extends-always':
      return LINK_KEYS.u2u1;
  }
}

function errorWhy(sys: UseCaseSystem, error: UseCaseError): string {
  switch (error) {
    case 'actor-inside':
      return `${sys.actors.a2} is drawn inside the system boundary. Actors are outside the system they use, so they are always drawn outside the boundary.`;
    case 'actor-actor':
      return `It joins two actors, ${sys.actors.a1} and ${sys.actors.a2}. An association links an actor to a use case it takes part in; a use case diagram doesn't show actors interacting with each other.`;
    case 'includes-optional':
      return `${sys.sometimes} A step that happens only sometimes extends the base use case, so it should be ${sys.useCases.u3} <<extends>> ${sys.useCases.u1}.`;
    case 'extends-always':
      return `${sys.always} A step that is always performed is included in the base use case, so it should be ${sys.useCases.u1} <<includes>> ${sys.useCases.u2}.`;
  }
}

/** Every element that could be marked, with how the reason names it. */
function markable(sys: UseCaseSystem, error: UseCaseError): Marked[] {
  const links: string[] = [LINK_KEYS.a1u1, error === 'extends-always' ? LINK_KEYS.u2u1 : LINK_KEYS.u1u2, error === 'includes-optional' ? LINK_KEYS.u1u3 : LINK_KEYS.u3u1, LINK_KEYS.a3u2, LINK_KEYS.a2u4];
  if (error === 'actor-actor') links.push(LINK_KEYS.a1a2);
  return [
    ...(['a1', 'a2', 'a3'] as const).map((slot) => ({ key: slot, describe: `the actor ${sys.actors[slot]}` })),
    ...links.map((key) => ({ key, describe: linkName(sys, key) })),
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
      { kind: 'text', text: `One of the marked elements, ${formatAnd(letters)}, breaks a use case diagram convention or doesn't match the scenario. Which one?`, tone: 'accent' },
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

/** Every error kind comes up across a round's spot questions before any repeats. */
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
