/**
 * `naming` items. Two kinds:
 * - identify: name the convention an identifier uses (camel casing, snake casing or Hungarian
 *   notation), or say it is none of the three when it is a lookalike such as Pascal casing;
 * - rewrite: write an identifier in a requested convention, including Hungarian prefixes for
 *   variables and interface controls; or, in the "consistent" task, name a new variable, function
 *   or control to match the convention a program's names already use. Consistency is the point of
 *   a naming convention: the 2025 examination report gave no marks for a new name written in a
 *   different style from the design's. Rewrites are case-sensitive and must match exactly.
 *
 * The game writes "casing", as the study design does; players may type "case" or "casing".
 *
 * Each item stands alone for the daily challenge. Instances ("naming:rewrite:snake:seed=12:hard")
 * regenerate an item exactly through fromNamingInstance.
 */
import type { KkId } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import { matchOption } from '../answers';
import { childSeed, mulberry32, pick, sample, shuffle, type Rng } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { CONTROLS, FUNCTIONS, PHRASES, VARIABLES, type ControlEntry, type VariableEntry } from './bank';
import {
  classify,
  CONTROL_PREFIXES,
  CONVENTION_LABELS,
  LOOKALIKE_LABELS,
  prefixLabel,
  toHungarian,
  VARIABLE_PREFIXES,
  write,
  type Convention,
  type HungarianPrefix,
  type Lookalike,
  type Shape,
} from './conventions';

export const NAMING_KK: KkId[] = ['U3O1-KK09'];

export const NAMING_KINDS = ['identify', 'rewrite'] as const;
export type NamingKind = (typeof NAMING_KINDS)[number];
export const SHAPES: readonly Shape[] = ['camel', 'snake', 'hungarian', 'pascal', 'kebab', 'title-snake'];
export const REWRITE_TASKS = ['camel', 'snake', 'hungarian-variable', 'hungarian-control', 'consistent'] as const;
export type RewriteTask = (typeof REWRITE_TASKS)[number];

export type NamingSpec = { kind: 'identify'; shape: Shape; seed: number } | { kind: 'rewrite'; task: RewriteTask; seed: number };

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

/** Lookalikes offered at each level: Pascal casing always, kebab casing from normal, and capitalised snake only on hard. */
export const LOOKALIKES: Record<Difficulty, readonly Lookalike[]> = {
  easy: ['pascal'],
  normal: ['pascal', 'kebab'],
  hard: ['pascal', 'kebab', 'title-snake'],
};

const WORD_COUNTS: Record<Difficulty, readonly number[]> = { easy: [2], normal: [2, 3], hard: [3, 4] };

export function phrasesFor(difficulty: Difficulty): readonly (readonly string[])[] {
  return PHRASES.filter((p) => WORD_COUNTS[difficulty].includes(p.length));
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Prompts shared by both kinds
// ---------------------------------------------------------------------------

function prefixTable(which: 'variables' | 'controls' | 'both'): TerminalBlock {
  const rows: string[][] = [];
  if (which !== 'controls') rows.push(['Variables', VARIABLE_PREFIXES.map((p) => `${p.prefix} ${p.label}`).join(', ')]);
  if (which !== 'variables') rows.push(['Controls', CONTROL_PREFIXES.map((p) => `${p.prefix} ${p.label}`).join(', ')]);
  return { kind: 'table', caption: 'Hungarian prefixes in this game (teams choose their own)', columns: ['For', 'Prefixes'], rows };
}

export const RULES: Record<Convention, string> = {
  camel: 'Camel casing: the first word in lowercase, then each later word starting with a capital letter, with no spaces or underscores.',
  snake: 'Snake casing: every word in lowercase, joined by underscores.',
  hungarian: 'Hungarian notation: the lowercase prefix, then each word starting with a capital letter, as in strFirstName.',
};

const EXACT = 'Type the identifier exactly: capitals count.';
const CONSISTENT_HINT = 'Work out which convention the names use, then write the new name the same way.';

/** What a Hungarian prefix marks: "a string variable", "a floating point variable", "an array" or "a check box". */
function prefixMarks(prefix: HungarianPrefix): string {
  const label = prefixLabel(prefix);
  if (prefix === 'arr') return 'an array';
  const isVariable = (VARIABLE_PREFIXES as readonly { prefix: string }[]).some((p) => p.prefix === prefix);
  return isVariable ? `${article(label)} ${label} variable` : `${article(label)} ${label}`;
}

function shapeLabel(shape: Shape): string {
  return shape === 'camel' || shape === 'snake' || shape === 'hungarian' ? CONVENTION_LABELS[shape] : LOOKALIKE_LABELS[shape];
}

/** Trims the input and peels off wrapping quotes or backticks. Case is kept. */
export function cleanIdentifier(input: string): string {
  let s = input.trim();
  for (;;) {
    const next = s.replace(/^["'`‘’“”]+|["'`‘’“”]+$/g, '').trim();
    if (next === s) return s;
    s = next;
  }
}

// ---------------------------------------------------------------------------
// Identify
// ---------------------------------------------------------------------------

export interface IdentifyCase {
  shape: Shape;
  words: readonly string[];
  prefix?: HungarianPrefix;
  identifier: string;
}

export function identifyCase(shape: Shape, seed: number, difficulty: Difficulty): IdentifyCase {
  const rng = mulberry32(seed);
  if (shape === 'hungarian') {
    const entry = rng() < 0.5 ? pick(rng, VARIABLES) : pick(rng, CONTROLS);
    return { shape, words: entry.words, prefix: entry.prefix, identifier: toHungarian(entry.prefix, entry.words) };
  }
  const words = pick(rng, phrasesFor(difficulty));
  return { shape, words, identifier: write(shape, words) };
}

type IdentifyAnswer = Convention | 'none' | Lookalike;

const IDENTIFY_OPTIONS: readonly { value: IdentifyAnswer; accept: readonly string[] }[] = [
  { value: 'camel', accept: ['camel casing', 'camel case', 'camel', 'lower camel casing', 'lower camel case'] },
  { value: 'snake', accept: ['snake casing', 'snake case', 'snake'] },
  { value: 'hungarian', accept: ['hungarian notation', 'hungarian', 'hungarian case', 'hungarian casing'] },
  { value: 'none', accept: ['none', 'none of these', 'none of the three', 'neither', 'not one of the three', 'not any of them', 'other'] },
  { value: 'pascal', accept: ['pascal casing', 'pascal case', 'pascal', 'upper camel casing', 'upper camel case'] },
  { value: 'kebab', accept: ['kebab casing', 'kebab case', 'kebab'] },
];

/** Reads a convention name leniently; a bracketed note is ignored ("None of the three (Pascal case)"). */
export function parseConvention(input: string): IdentifyAnswer | null {
  const s = input.replace(/\([^)]*\)/g, ' ');
  return matchOption(s, IDENTIFY_OPTIONS);
}

export const IDENTIFY_CHIPS = ['camel casing', 'snake casing', 'Hungarian notation', 'none'];
const IDENTIFY_HINT = 'Type camel casing, snake casing or Hungarian notation, or none if it uses none of the three.';

export function identifyExpected(c: IdentifyCase): string {
  if (c.shape === 'camel' || c.shape === 'snake' || c.shape === 'hungarian') return capitalise(CONVENTION_LABELS[c.shape]);
  return `None of the three (${LOOKALIKE_LABELS[c.shape]})`;
}

function identifyReason(c: IdentifyCase): string {
  const id = c.identifier;
  switch (c.shape) {
    case 'camel':
      return `${id} starts with a lowercase word, and each later word starts with a capital letter, with nothing between the words: camel casing.`;
    case 'snake':
      return `${id} is all lowercase, with underscores between the words: snake casing.`;
    case 'hungarian':
      return `${id} starts with the prefix ${c.prefix}, which marks ${prefixMarks(c.prefix!)}, so it uses Hungarian notation. The words after the prefix each start with a capital letter.`;
    case 'pascal':
      return `${id} starts with a capital letter, so it is Pascal casing (upper camel casing), not camel casing. Many languages keep Pascal casing for class names.`;
    case 'kebab':
      return `${id} joins its words with hyphens (kebab casing). Most programming languages read a hyphen as a minus sign, so it can't even be used as an identifier.`;
    case 'title-snake':
      return `${id} joins its words with underscores but starts each word with a capital letter, so it isn't snake casing, which is all lowercase.`;
  }
}

export function identifyItem(shape: Shape, seed: number, difficulty: Difficulty): QuizItem {
  const c = identifyCase(shape, seed, difficulty);
  const expected = identifyExpected(c);
  const reason = identifyReason(c);
  return {
    id: 'gen-naming-identify',
    kk: NAMING_KK,
    instance: `naming:identify:${shape}:seed=${seed}:${difficulty}`,
    chips: IDENTIFY_CHIPS,
    prompt: [
      { kind: 'pre', text: c.identifier, label: 'Identifier' },
      { kind: 'text', text: 'Which naming convention does this identifier use?', tone: 'accent' },
      { kind: 'text', text: IDENTIFY_HINT, tone: 'muted' },
      { kind: 'text', text: 'An identifier that starts with a prefix from this table, followed by a capital letter, uses Hungarian notation.', tone: 'muted' },
      prefixTable('both'),
    ],
    check(input) {
      const answer = parseConvention(input);
      if (!answer) return { correct: false, expected, reason: IDENTIFY_HINT, counted: false };
      const correct = c.shape === 'camel' || c.shape === 'snake' || c.shape === 'hungarian' ? answer === c.shape : answer === 'none' || answer === c.shape;
      return { correct, expected, reason };
    },
  };
}

// ---------------------------------------------------------------------------
// Rewrite
// ---------------------------------------------------------------------------

export interface RewriteCase {
  task: RewriteTask;
  /** The convention the answer is written in. */
  target: Convention;
  words: readonly string[];
  /** Rewrites from an identifier show it; the others give the words. */
  source?: { shape: Shape; identifier: string };
  prefix?: HungarianPrefix;
  /** For Hungarian notation: what is being named, e.g. "a text box where the user types their surname". */
  description?: string;
  /** For the consistent task: the names a program already uses, all in `target`; functions keep their brackets. */
  inUse?: readonly string[];
  /** For the consistent task in camel or snake casing: what the new name is for. */
  element?: 'variable' | 'function';
  expected: string;
}

/** Where a camel casing or snake casing rewrite starts from at each level. */
function sourcesFor(target: 'camel' | 'snake', difficulty: Difficulty): readonly (Shape | 'words')[] {
  const other = target === 'camel' ? 'snake' : 'camel';
  if (difficulty === 'easy') return ['words'];
  if (difficulty === 'normal') return ['words', other, other];
  return [other, 'pascal', 'kebab', 'title-snake'];
}

/** Below hard a Hungarian variable is described with its data type named; on hard by its data only. */
function variableDescription(entry: VariableEntry, difficulty: Difficulty): string {
  const label = prefixLabel(entry.prefix);
  const kind = entry.prefix === 'arr' ? 'an array' : `${article(label)} ${label} variable`;
  return difficulty === 'hard' ? `a variable that holds ${entry.data}` : `${kind} that holds ${entry.data}`;
}

function controlDescription(entry: ControlEntry): string {
  const label = prefixLabel(entry.prefix);
  return `${article(label)} ${label} ${entry.what}`;
}

function hungarianCase(task: RewriteTask, entry: VariableEntry | ControlEntry, description: string): RewriteCase {
  return { task, target: 'hungarian', words: entry.words, prefix: entry.prefix, description, expected: toHungarian(entry.prefix, entry.words) };
}

/**
 * A new name to add to a program's names: three names already in use, all in one convention, and
 * the words for one more. Camel and snake casing lists hold two variables and one function (a code
 * structure); Hungarian lists hold variables and interface controls. No name in use shares the new
 * name's words.
 */
function consistentCase(rng: Rng, difficulty: Difficulty): RewriteCase {
  const target = pick(rng, ['camel', 'snake', 'hungarian'] as const);
  if (target === 'hungarian') {
    const variable = rng() < 0.5;
    const entry = variable ? pick(rng, VARIABLES) : pick(rng, CONTROLS);
    const differ = (e: VariableEntry | ControlEntry) => e.words.join(' ') !== entry.words.join(' ');
    const [nVariables, nControls] = rng() < 0.5 ? [2, 1] : [1, 2];
    const shown = [...sample(rng, VARIABLES.filter(differ), nVariables), ...sample(rng, CONTROLS.filter(differ), nControls)];
    const description = variable ? variableDescription(entry as VariableEntry, difficulty) : controlDescription(entry as ControlEntry);
    const inUse = shuffle(rng, shown.map((e) => toHungarian(e.prefix, e.words)));
    return { ...hungarianCase('consistent', entry, description), inUse };
  }
  const element = rng() < 0.3 ? 'function' : 'variable';
  const words = pick(rng, element === 'function' ? FUNCTIONS : phrasesFor(difficulty));
  const differ = (w: readonly string[]) => w.join(' ') !== words.join(' ');
  const variables = sample(rng, phrasesFor(difficulty).filter(differ), 2);
  const fn = pick(rng, FUNCTIONS.filter(differ));
  const inUse = shuffle(rng, [...variables.map((w) => write(target, w)), `${write(target, fn)}()`]);
  return { task: 'consistent', target, words, inUse, element, expected: write(target, words) };
}

export function rewriteCase(task: RewriteTask, seed: number, difficulty: Difficulty): RewriteCase {
  const rng = mulberry32(seed);
  if (task === 'camel' || task === 'snake') {
    const words = pick(rng, phrasesFor(difficulty));
    const from = pick(rng, sourcesFor(task, difficulty));
    const source = from === 'words' ? undefined : { shape: from, identifier: write(from, words) };
    return { task, target: task, words, source, expected: write(task, words) };
  }
  if (task === 'consistent') return consistentCase(rng, difficulty);
  if (task === 'hungarian-variable') {
    const entry = pick(rng, VARIABLES);
    return hungarianCase(task, entry, variableDescription(entry, difficulty));
  }
  const entry = pick(rng, CONTROLS);
  return hungarianCase(task, entry, controlDescription(entry));
}

const CONSISTENCY = 'Keeping to one convention throughout makes a program easier to read and maintain.';

/** For the consistent task: how the new name is written, after the convention has been named. */
function consistentDetail(c: RewriteCase): string {
  if (c.target === 'hungarian') return `The prefix ${c.prefix} marks ${prefixMarks(c.prefix!)}: ${c.expected}. ${CONSISTENCY}`;
  return `In ${CONVENTION_LABELS[c.target]} the new name is ${c.expected}. ${CONSISTENCY}`;
}

function rewriteReason(c: RewriteCase): string {
  if (c.task === 'consistent') {
    const label = CONVENTION_LABELS[c.target];
    if (c.target !== 'hungarian') return `The names in use are written in ${label}, so the new name must be too: ${c.expected}. ${CONSISTENCY}`;
    return `The names in use are written in Hungarian notation, so the new name must be too. ${consistentDetail(c)}`;
  }
  if (c.target === 'camel') return `Camel casing writes the first word in lowercase and starts each later word with a capital letter: ${c.expected}.`;
  if (c.target === 'snake') return `Snake casing writes every word in lowercase and joins them with underscores: ${c.expected}.`;
  return `The prefix ${c.prefix} marks ${prefixMarks(c.prefix!)}, and each word after it starts with a capital letter: ${c.expected}.`;
}

/** Says what is wrong with a rewrite that doesn't match, or '' when there is nothing specific to say. */
export function diagnoseRewrite(c: RewriteCase, typed: string): string {
  if (/\s/.test(typed)) return "An identifier can't contain spaces.";
  if (/\(\s*\)$/.test(typed)) return "Only a function's name is written with brackets.";
  const sameLetters = typed.toLowerCase() === c.expected.toLowerCase();
  if (c.task === 'consistent' && !sameLetters) {
    const shape = classify(typed);
    if (shape && shape !== c.target) return `That name uses ${shapeLabel(shape)}, but the names in use are written in ${CONVENTION_LABELS[c.target]}.`;
  }
  const prefixLength = c.prefix?.length ?? 0;
  if (sameLetters) {
    if (c.target === 'snake') return 'Snake casing is all lowercase.';
    if (c.target === 'camel') {
      return /^[A-Z]/.test(typed) ? 'That is Pascal casing: camel casing starts with a lowercase letter.' : 'Check the capitals: each word after the first starts with a capital letter.';
    }
    if (typed.slice(0, prefixLength) !== c.prefix) return 'The prefix is written in lowercase.';
    return 'Check the capitals: after the prefix, each word starts with a capital letter.';
  }
  if (c.target === 'hungarian' && typed.slice(0, prefixLength).toLowerCase() !== c.prefix) return `The prefix for ${prefixMarks(c.prefix!)} is ${c.prefix}.`;
  if (typed.includes('-')) return "Hyphens can't join the words of an identifier: most languages read them as minus signs.";
  if (c.target === 'snake' && !typed.includes('_')) return 'Snake casing joins the words with underscores.';
  if (c.target !== 'snake' && typed.includes('_')) return `${c.target === 'camel' ? 'Camel casing' : 'Hungarian notation'} doesn't use underscores.`;
  return 'Use exactly the words given, in the same order.';
}

export function rewriteItem(task: RewriteTask, seed: number, difficulty: Difficulty): QuizItem {
  const c = rewriteCase(task, seed, difficulty);
  const expected = c.expected;
  const reason = rewriteReason(c);
  const convention = CONVENTION_LABELS[c.target];
  const prompt: TerminalBlock[] = [];
  const wordList = c.words.length === 1 ? `the word ${c.words[0]}` : `the words ${c.words.join(' ')}`;
  if (c.task === 'consistent') {
    const what = c.target === 'hungarian' ? `${c.description!}, using ${wordList}` : `a new ${c.element}, using the words "${c.words.join(' ')}"`;
    prompt.push(
      { kind: 'text', text: 'A program already uses these names.' },
      { kind: 'pre', text: c.inUse!.join('\n'), label: 'Names in use' },
      { kind: 'text', text: `Name ${what} and the same naming convention.`, tone: 'accent' },
      prefixTable('both'),
    );
  } else if (c.target === 'hungarian') {
    prompt.push(
      { kind: 'text', text: `${capitalise(c.description!)}.` },
      { kind: 'text', text: `Name it in Hungarian notation, using ${wordList}.`, tone: 'accent' },
      prefixTable(c.task === 'hungarian-variable' ? 'variables' : 'controls'),
    );
  } else if (c.source) {
    prompt.push({ kind: 'pre', text: c.source.identifier, label: 'Identifier' }, { kind: 'text', text: `Rewrite this identifier in ${convention}.`, tone: 'accent' });
  } else {
    prompt.push({ kind: 'text', text: `Write the words "${c.words.join(' ')}" as one identifier in ${convention}.`, tone: 'accent' });
  }
  if (difficulty !== 'hard') prompt.push({ kind: 'text', text: c.task === 'consistent' ? CONSISTENT_HINT : RULES[c.target], tone: 'muted' });
  prompt.push({ kind: 'text', text: EXACT, tone: 'muted' });
  return {
    id: 'gen-naming-rewrite',
    kk: NAMING_KK,
    instance: `naming:rewrite:${task}:seed=${seed}:${difficulty}`,
    prompt,
    check(input) {
      // A function's name may be typed with its empty brackets, as the names in use show it.
      const cleaned = cleanIdentifier(input);
      const typed = c.element === 'function' ? cleaned.replace(/\(\s*\)$/, '') : cleaned;
      if (!typed) return { correct: false, expected, reason: 'Type the identifier.', counted: false };
      if (typed === expected) return { correct: true, expected, reason };
      const diagnosis = diagnoseRewrite(c, typed);
      // A wrong prefix or convention is already explained, so the rest of the reason only says how to write the name.
      const rest = diagnosis.startsWith('The prefix for')
        ? `Each word after the prefix starts with a capital letter: ${expected}.`
        : diagnosis.startsWith('That name uses')
          ? consistentDetail(c)
          : reason;
      return { correct: false, expected, reason: `${diagnosis} ${rest}` };
    },
  };
}

// ---------------------------------------------------------------------------
// Rounds, instances and the generator
// ---------------------------------------------------------------------------

export function namingItem(spec: NamingSpec, difficulty: Difficulty): QuizItem {
  const seed = spec.seed >>> 0;
  return spec.kind === 'identify' ? identifyItem(spec.shape, seed, difficulty) : rewriteItem(spec.task, seed, difficulty);
}

/** The words an item is built on, so a round never uses the same phrase twice. */
function wordsOf(spec: NamingSpec, difficulty: Difficulty): string {
  const seed = spec.seed >>> 0;
  return (spec.kind === 'identify' ? identifyCase(spec.shape, seed, difficulty).words : rewriteCase(spec.task, seed, difficulty).words).join(' ');
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromNamingInstance(instance: string): QuizItem | null {
  const m = /^naming:(identify|rewrite):([a-z-]+):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (!m || !DIFFICULTIES.includes(m[4] as Difficulty)) return null;
  const seed = Number(m[3]);
  const difficulty = m[4] as Difficulty;
  if (m[1] === 'identify') return (SHAPES as readonly string[]).includes(m[2]) ? identifyItem(m[2] as Shape, seed, difficulty) : null;
  return (REWRITE_TASKS as readonly string[]).includes(m[2]) ? rewriteItem(m[2] as RewriteTask, seed, difficulty) : null;
}

function cycleSpecs(rng: Rng, difficulty: Difficulty): ({ kind: 'identify'; shape: Shape } | { kind: 'rewrite'; task: RewriteTask })[] {
  const lookalikes = LOOKALIKES[difficulty];
  const shapes: Shape[] = [pick(rng, ['camel', 'snake'] as const), 'hungarian', pick(rng, lookalikes), pick(rng, ['camel', 'snake', 'hungarian', ...lookalikes])];
  const tasks: RewriteTask[] = ['camel', 'snake', 'hungarian-variable', 'hungarian-control', 'consistent', 'consistent'];
  return shuffle(rng, [...shapes.map((shape) => ({ kind: 'identify' as const, shape })), ...tasks.map((task) => ({ kind: 'rewrite' as const, task }))]);
}

/**
 * A round of `count` items: four identifiers to name (one camel or snake, one Hungarian, one
 * lookalike, one of any) and six rewrites (camel casing, snake casing, a Hungarian variable, a
 * Hungarian control and two new names to match the names in use), shuffled, with no phrase used
 * twice.
 */
export function planNamingRound(seed: number, difficulty: Difficulty, count = 10): NamingSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const specs: NamingSpec[] = [];
  const used = new Set<string>();
  for (let cycle = 0; specs.length < count; cycle++) {
    cycleSpecs(rng, difficulty).forEach((base, i) => {
      let spec: NamingSpec = { ...base, seed: childSeed(seed, `${cycle}:${i}`) };
      for (let attempt = 1; attempt < 20 && used.has(wordsOf(spec, difficulty)); attempt++) {
        spec = { ...base, seed: childSeed(seed, `${cycle}:${i}:${attempt}`) };
      }
      used.add(wordsOf(spec, difficulty));
      specs.push(spec);
    });
  }
  return specs.slice(0, count);
}

/** Game.generate: one self-contained item, a rewrite three times in five. */
export function generateNamingItem(seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'kind'));
  if (rng() < 0.4) {
    const shape = pick(rng, ['camel', 'snake', 'hungarian', ...LOOKALIKES[difficulty]] as readonly Shape[]);
    return identifyItem(shape, seed >>> 0, difficulty);
  }
  return rewriteItem(pick(rng, REWRITE_TASKS), seed >>> 0, difficulty);
}
