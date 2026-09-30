/**
 * `oop` items. Three kinds:
 * - principle: name the OOP principle a scenario shows;
 * - object: complete an object description drawn as an object figure with one blank row, either
 *   a property's data type (typed) or a whole member chosen from lettered options;
 * - access: choose the access modifier a stated need calls for.
 *
 * Each item stands alone for the daily challenge. Instances ("oop:object:booking:member-paid:
 * seed=4:normal") regenerate an item exactly through fromOopInstance.
 */
import type { KkId, ObjectDescription } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import { matchOption, OPTION_LETTERS, parseOption } from '../answers';
import { childSeed, mulberry32, pick, sample, shuffle } from '../prng';
import { parseAnswer as parseTypeAnswer, TYPE_OPTIONS } from '../types-game/items';
import type { Difficulty, QuizItem } from '../types';
import {
  ACCESS_SCENARIOS,
  OBJECTS,
  PRINCIPLE_SCENARIOS,
  type AccessScenario,
  type Level,
  type MemberGap,
  type Modifier,
  type ObjectEntry,
  type Principle,
  type PrincipleScenario,
} from './bank';

export const OOP_KK: KkId[] = ['U3O1-KK07'];
/** Object descriptions are a design tool for modules as well as an OOP topic. */
export const OBJECT_KK: KkId[] = ['U3O1-KK07', 'U3O1-KK03'];

export const OOP_KINDS = ['principle', 'object', 'access'] as const;
export type OopKind = (typeof OOP_KINDS)[number];

export type OopSpec =
  | { kind: 'principle'; id: string }
  | { kind: 'access'; id: string }
  | { kind: 'object'; object: string; gap: string; seed: number };

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];
const LEVELS: Record<Difficulty, readonly Level[]> = { easy: [1, 2], normal: [1, 2, 3], hard: [2, 3] };

export function principlesFor(difficulty: Difficulty): readonly PrincipleScenario[] {
  return PRINCIPLE_SCENARIOS.filter((s) => LEVELS[difficulty].includes(s.level));
}

export function accessFor(difficulty: Difficulty): readonly AccessScenario[] {
  return ACCESS_SCENARIOS.filter((s) => LEVELS[difficulty].includes(s.level));
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Principles
// ---------------------------------------------------------------------------

const PRINCIPLE_OPTIONS: readonly { value: Principle; accept: readonly string[] }[] = [
  { value: 'abstraction', accept: ['abstraction', 'abstract', 'abstracting'] },
  { value: 'encapsulation', accept: ['encapsulation', 'encapsulate', 'encapsulating', 'encapsulated'] },
  { value: 'generalisation', accept: ['generalisation', 'generalization', 'generalise', 'generalize', 'generalising', 'generalizing'] },
  { value: 'inheritance', accept: ['inheritance', 'inherit', 'inherits', 'inheriting'] },
];

export const PRINCIPLE_CHIPS = ['abstraction', 'encapsulation', 'generalisation', 'inheritance'];
const PRINCIPLE_HINT = 'Type abstraction, encapsulation, generalisation or inheritance.';

export function parsePrinciple(input: string): Principle | null {
  return matchOption(input.replace(/\s+principle$/i, ''), PRINCIPLE_OPTIONS);
}

const PRINCIPLE_NOTES: Partial<Record<`${Principle}<${Principle}`, string>> = {
  'abstraction<encapsulation': "Encapsulation hides an object's data behind its methods; here the point is which details are modelled at all.",
  'encapsulation<abstraction': 'Abstraction decides which details to model; here the point is hiding the data and controlling access through methods.',
  'generalisation<inheritance': 'Inheritance passes features down to a subclass; here the designer is creating the superclass from features the classes share.',
  'inheritance<generalisation': 'Generalisation is the design step that creates the superclass; here a subclass is receiving what its superclass defines.',
};

export function principleItem(id: string, difficulty: Difficulty): QuizItem {
  const s = PRINCIPLE_SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown oop principle scenario ${id}`);
  const expected = capitalise(s.answer);
  return {
    id: 'gen-oop-principle',
    kk: OOP_KK,
    instance: `oop:principle:${s.id}:${difficulty}`,
    chips: PRINCIPLE_CHIPS,
    prompt: [
      { kind: 'text', text: s.prompt },
      { kind: 'text', text: 'Which OOP principle does this show?', tone: 'accent' },
      { kind: 'text', text: PRINCIPLE_HINT, tone: 'muted' },
    ],
    check(input) {
      const chosen = parsePrinciple(input);
      if (!chosen) return { correct: false, expected, reason: PRINCIPLE_HINT, counted: false };
      const correct = chosen === s.answer;
      const note = correct ? undefined : PRINCIPLE_NOTES[`${s.answer}<${chosen}`];
      return { correct, expected, reason: note ? `${s.why} ${note}` : s.why };
    },
  };
}

// ---------------------------------------------------------------------------
// Access modifiers
// ---------------------------------------------------------------------------

const MODIFIER_OPTIONS: readonly { value: Modifier; accept: readonly string[] }[] = [
  { value: 'public', accept: ['public'] },
  { value: 'private', accept: ['private'] },
  { value: 'protected', accept: ['protected'] },
  { value: 'default', accept: ['default', 'default access', 'package', 'package private', 'package access', 'no modifier', 'no access modifier'] },
];

export const ACCESS_CHIPS = ['public', 'private', 'protected', 'default'];
const ACCESS_HINT = 'Type public, private, protected or default. Unless the question names a language, protected means the class and its subclasses.';

export function parseModifier(input: string): Modifier | null {
  const s = input.trim().replace(/^the\s+/i, '');
  return matchOption(s, MODIFIER_OPTIONS) ?? matchOption(s.replace(/\s+(access\s+)?modifier$/i, ''), MODIFIER_OPTIONS);
}

const ACCESS_NOTES: Partial<Record<`${Modifier}<${Modifier}`, string>> = {
  'private<protected': 'Protected would also open it to subclasses; only private keeps it to the class itself.',
  'private<public': 'Public would let any code in the program change it.',
  'protected<private': 'Private would hide it from the subclasses too.',
  'protected<public': 'Public would open it to unrelated classes as well.',
  'public<private': 'Private would stop the other classes that need it from using it.',
  'public<protected': 'Protected would stop unrelated classes from using it.',
  'default<protected': 'Protected would also open it to subclasses in other packages.',
  'default<public': 'Public would open it to every class, not just its own package.',
};

/** Splits a scenario into its need and the question at the end. */
function splitQuestion(prompt: string): [string, string] {
  const m = /^(.*?)\s*((?:Which|What)[^?]*\?)$/.exec(prompt);
  return m ? [m[1], m[2]] : ['', prompt];
}

export function accessItem(id: string, difficulty: Difficulty): QuizItem {
  const s = ACCESS_SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown oop access scenario ${id}`);
  const expected = capitalise(s.answer);
  const [need, question] = splitQuestion(s.prompt);
  const prompt: TerminalBlock[] = [];
  if (need) prompt.push({ kind: 'text', text: need });
  prompt.push({ kind: 'text', text: question, tone: 'accent' }, { kind: 'text', text: ACCESS_HINT, tone: 'muted' });
  return {
    id: 'gen-oop-access',
    kk: OOP_KK,
    instance: `oop:access:${s.id}:${difficulty}`,
    chips: ACCESS_CHIPS,
    prompt,
    check(input) {
      const chosen = parseModifier(input);
      if (!chosen) return { correct: false, expected, reason: ACCESS_HINT, counted: false };
      const correct = chosen === s.answer;
      const note = correct ? undefined : ACCESS_NOTES[`${s.answer}<${chosen}`];
      return { correct, expected, reason: note ? `${s.why} ${note}` : s.why };
    },
  };
}

// ---------------------------------------------------------------------------
// Object descriptions
// ---------------------------------------------------------------------------

/** Every gap an object offers: "type-<property>" for a data type, "member-<id>" for a whole row. */
export function gapKeys(obj: ObjectEntry): string[] {
  return [...obj.typeGaps.map((p) => `type-${p}`), ...obj.memberGaps.map((g) => `member-${g.id}`)];
}

function objectById(id: string): ObjectEntry {
  const obj = OBJECTS.find((o) => o.id === id);
  if (!obj) throw new Error(`unknown oop object ${id}`);
  return obj;
}

/** The object figure with one blank row. */
export function blankedFigure(obj: ObjectEntry, gap: string): ObjectDescription {
  const figure: ObjectDescription = {
    id: `oop-${obj.id}`,
    kind: 'object',
    title: `Object description: ${obj.name}`,
    name: obj.name,
    // Name and data type only, as exam object descriptions show them; it also fits a phone.
    properties: obj.properties.map((p) => ({ name: p.name, type: p.type })),
    methods: obj.methods.map((name) => ({ name })),
  };
  if (gap.startsWith('type-')) {
    const row = figure.properties.find((p) => p.name === gap.slice(5));
    if (!row) throw new Error(`unknown property gap ${gap}`);
    row.type = '?';
    return figure;
  }
  const member = memberGap(obj, gap);
  if (member.kind === 'property') {
    const name = member.answer.split(':')[0].trim();
    const i = figure.properties.findIndex((p) => p.name === name);
    if (i < 0) throw new Error(`gap ${gap} is not a property of ${obj.name}`);
    figure.properties[i] = { name: '?', type: '?' };
  } else {
    const i = figure.methods.findIndex((m) => m.name === member.answer);
    if (i < 0) throw new Error(`gap ${gap} is not a method of ${obj.name}`);
    figure.methods[i] = { name: '?' };
  }
  return figure;
}

function memberGap(obj: ObjectEntry, gap: string): MemberGap {
  const g = obj.memberGaps.find((m) => `member-${m.id}` === gap);
  if (!g) throw new Error(`unknown member gap ${gap}`);
  return g;
}

const TYPE_HINT = 'Name the type in full: Integer, Floating point, String, Character or Boolean.';

/** Why a described property has its data type, completing "holds ...". */
const TYPE_REASONS: Record<string, string> = {
  Integer: 'a whole number',
  'Floating point': 'a number with a fractional part',
  String: 'text, and any digits in it are never used in arithmetic',
  Character: 'exactly one character',
  Boolean: 'one of only two values',
};

function typeGapItem(obj: ObjectEntry, gap: string, seed: number, difficulty: Difficulty): QuizItem {
  const property = obj.properties.find((p) => p.name === gap.slice(5))!;
  const expected = property.type;
  const described = property.description.charAt(0).toLowerCase() + property.description.slice(1);
  const why = `${property.name}, described as "${described}", holds ${TYPE_REASONS[property.type] ?? 'this kind of value'}, so its data type is ${property.type}.`;
  return {
    id: 'gen-oop-object',
    kk: OBJECT_KK,
    instance: `oop:object:${obj.id}:${gap}:seed=${seed}:${difficulty}`,
    chips: TYPE_OPTIONS.map((o) => o.label),
    prompt: [
      { kind: 'figure', figure: blankedFigure(obj, gap) },
      { kind: 'text', text: `${property.name}: ${property.description}.` },
      { kind: 'text', text: `The data type of ${property.name} is missing, marked with a question mark. Which data type should it have?`, tone: 'accent' },
      { kind: 'text', text: TYPE_HINT, tone: 'muted' },
    ],
    check(input) {
      const parsed = parseTypeAnswer('type', input);
      if (!parsed) return { correct: false, expected, reason: TYPE_HINT, counted: false };
      if ('unparsed' in parsed) return { correct: false, expected, reason: parsed.unparsed, counted: false };
      const label = TYPE_OPTIONS.find((o) => o.value === parsed.value)!.label;
      return { correct: label === property.type, expected, reason: why };
    },
  };
}

/** The lettered options for a member gap: the answer and two (easy) or three distractors, shuffled by seed. */
export function memberOptions(gap: MemberGap, seed: number, difficulty: Difficulty): string[] {
  const rng = mulberry32(childSeed(seed, 'options'));
  const distractors = difficulty === 'easy' ? sample(rng, gap.distractors, 2) : [...gap.distractors];
  return shuffle(rng, [gap.answer, ...distractors]);
}

function memberGapItem(obj: ObjectEntry, gap: string, seed: number, difficulty: Difficulty): QuizItem {
  const g = memberGap(obj, gap);
  const options = memberOptions(g, seed, difficulty);
  const answer = options.indexOf(g.answer);
  const letters = OPTION_LETTERS.slice(0, options.length);
  const expected = `${letters[answer]}. ${g.answer}`;
  const need = g.kind === 'method' ? `a method that ${g.need}` : `a property to ${g.need}`;
  const hint = `Type a letter from A to ${letters[letters.length - 1]}.`;
  return {
    id: 'gen-oop-object',
    kk: OBJECT_KK,
    instance: `oop:object:${obj.id}:${gap}:seed=${seed}:${difficulty}`,
    chips: [...letters],
    prompt: [
      { kind: 'figure', figure: blankedFigure(obj, gap) },
      { kind: 'text', text: `The ${obj.name} object needs ${need}. Which belongs in the blank row, marked with a question mark?`, tone: 'accent' },
      { kind: 'choices', options, labels: 'letters' },
      { kind: 'text', text: hint, tone: 'muted' },
    ],
    check(input) {
      const chosen = parseOption(input, options);
      if (chosen === null) return { correct: false, expected, reason: hint, counted: false };
      return { correct: chosen === answer, expected, reason: g.why };
    },
  };
}

export function objectItem(objectId: string, gap: string, seed: number, difficulty: Difficulty): QuizItem {
  const obj = objectById(objectId);
  if (!gapKeys(obj).includes(gap)) throw new Error(`unknown gap ${gap} for ${objectId}`);
  return gap.startsWith('type-') ? typeGapItem(obj, gap, seed, difficulty) : memberGapItem(obj, gap, seed, difficulty);
}

// ---------------------------------------------------------------------------
// Rounds, instances and the generator
// ---------------------------------------------------------------------------

export function oopItem(spec: OopSpec, difficulty: Difficulty): QuizItem {
  if (spec.kind === 'principle') return principleItem(spec.id, difficulty);
  if (spec.kind === 'access') return accessItem(spec.id, difficulty);
  return objectItem(spec.object, spec.gap, spec.seed >>> 0, difficulty);
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromOopInstance(instance: string): QuizItem | null {
  const simple = /^oop:(principle|access):([a-z0-9-]+):(easy|normal|hard)$/.exec(instance);
  if (simple && DIFFICULTIES.includes(simple[3] as Difficulty)) {
    const bank = simple[1] === 'principle' ? PRINCIPLE_SCENARIOS : ACCESS_SCENARIOS;
    if (!bank.some((s) => s.id === simple[2])) return null;
    return oopItem({ kind: simple[1] as 'principle' | 'access', id: simple[2] }, simple[3] as Difficulty);
  }
  const object = /^oop:object:([a-z0-9-]+):((?:type|member)-[A-Za-z0-9-]+):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (!object) return null;
  const obj = OBJECTS.find((o) => o.id === object[1]);
  if (!obj || !gapKeys(obj).includes(object[2])) return null;
  return objectItem(obj.id, object[2], Number(object[3]), object[4] as Difficulty);
}

/** How often an object question blanks a whole member rather than a data type. */
const MEMBER_SHARE: Record<Difficulty, number> = { easy: 0.4, normal: 0.5, hard: 0.7 };

function objectSpec(rng: () => number, obj: ObjectEntry, seed: number, difficulty: Difficulty, member?: boolean): OopSpec {
  const useMember = member ?? rng() < MEMBER_SHARE[difficulty];
  const gap = useMember ? `member-${pick(rng, obj.memberGaps).id}` : `type-${pick(rng, obj.typeGaps)}`;
  return { kind: 'object', object: obj.id, gap, seed };
}

/**
 * A round of `count` items: four principles (at least three different ones), three object
 * descriptions (three different objects, with both a data type gap and a member gap) and three
 * access modifiers (three different answers), shuffled.
 */
export function planOopRound(seed: number, difficulty: Difficulty, count = 10): OopSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const specs: OopSpec[] = [];
  for (let cycle = 0; specs.length < count; cycle++) {
    const principles = spreadPick(rng, principlesFor(difficulty), 4, (s) => s.answer);
    const access = spreadPick(rng, accessFor(difficulty), 3, (s) => s.answer);
    const objects = sample(rng, OBJECTS, 3);
    const memberFirst = rng() < 0.5;
    const cycleSpecs: OopSpec[] = [
      ...principles.map((s): OopSpec => ({ kind: 'principle', id: s.id })),
      ...access.map((s): OopSpec => ({ kind: 'access', id: s.id })),
      ...objects.map((o, i) => objectSpec(rng, o, childSeed(seed, `${cycle}:object:${i}`), difficulty, i === 0 ? memberFirst : i === 1 ? !memberFirst : undefined)),
    ];
    specs.push(...shuffle(rng, cycleSpecs));
  }
  return specs.slice(0, count);
}

/** n items with as many different answers as possible: one per answer first, then any. */
function spreadPick<T extends { id: string }>(rng: () => number, pool: readonly T[], n: number, answerOf: (t: T) => string): T[] {
  const byAnswer = new Map<string, T[]>();
  for (const t of shuffle(rng, pool)) byAnswer.set(answerOf(t), [...(byAnswer.get(answerOf(t)) ?? []), t]);
  const firsts = shuffle(rng, [...byAnswer.values()].map((group) => group[0]));
  const chosen = firsts.slice(0, n);
  const rest = shuffle(
    rng,
    pool.filter((t) => !chosen.includes(t)),
  );
  return [...chosen, ...rest].slice(0, n);
}

/** Game.generate: one self-contained item, a principle two times in five. */
export function generateOopItem(seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'kind'));
  const roll = rng();
  if (roll < 0.4) return principleItem(pick(rng, principlesFor(difficulty)).id, difficulty);
  if (roll < 0.7) return accessItem(pick(rng, accessFor(difficulty)).id, difficulty);
  return oopItem(objectSpec(rng, pick(rng, OBJECTS), seed >>> 0, difficulty), difficulty);
}
