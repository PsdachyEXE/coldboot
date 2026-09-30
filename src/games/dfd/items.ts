/**
 * `dfd` items, two round types:
 *
 * (a) Convention errors. A context diagram or Level 1 DFD with exactly one convention error. The
 *     element question marks several elements with letters and asks which one is wrong; the rule
 *     question then asks which of the six rules it breaks (a number or a short phrase).
 * (b) Labelling. A context diagram and a Level 1 DFD whose process and store labels are partly
 *     blank. One question per blank, answered from a word bank; answered blanks are filled in on
 *     the next question.
 *
 * Each item stands alone, so the daily challenge or a report can regenerate it from its instance
 * ("dfd:element:cafe:dfd:noun-p2:m1:seed=12:normal").
 */
import type { ContextDiagram, Dfd, KkId } from '../../content/schema';
import { normaliseAnswer } from '../../lib/text';
import type { TerminalBlock } from '../../terminal/blocks';
import { formatAnd, LETTERS, matchOption, parseChoice } from '../answers';
import { childSeed, mulberry32, pick, sample, shuffle } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { buildContext, buildDfd, describeElement, elementKeys, faultyKey, injectionsFor, isFlowKey, ruleOf, RULES, type DiagramKind, type Injection, type Rule } from './diagrams';
import { PROCESS_SLOTS, STORE_SLOTS, SYSTEMS, type DfdSystem, type NodeSlot } from './systems';

export const DFD_KK: KkId[] = ['U3O2-KK08'];

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export const RULE_TEXT: Record<Rule, string> = {
  'entity-entity': 'A flow between two external entities',
  'store-entity': 'A data store connected straight to an external entity',
  'no-io': 'A process with no inputs, or with no outputs',
  unlabelled: 'An unlabelled flow',
  noun: 'A process named with a noun',
  'store-store': 'A flow between two data stores',
};

export const RULE_CHIPS: Record<Rule, string> = {
  'entity-entity': 'entity to entity',
  'store-entity': 'store to entity',
  'no-io': 'no inputs or outputs',
  unlabelled: 'unlabelled flow',
  noun: 'noun name',
  'store-store': 'store to store',
};

const RULE_OPTIONS: readonly { value: Rule; accept: readonly string[] }[] = [
  {
    value: 'entity-entity',
    accept: ['entity to entity', 'entity entity', 'two entities', 'two external entities', 'between entities', 'between two entities', 'between two external entities', 'external entities', 'entities'],
  },
  {
    value: 'store-entity',
    accept: ['store to entity', 'entity to store', 'store entity', 'entity store', 'data store to entity', 'data store to external entity', 'store connected to entity', 'store straight to entity', 'store and entity'],
  },
  {
    value: 'no-io',
    accept: ['no inputs or outputs', 'no input or output', 'no inputs', 'no input', 'no outputs', 'no output', 'no inputs or no outputs', 'black hole', 'miracle', 'missing input', 'missing output'],
  },
  { value: 'unlabelled', accept: ['unlabelled flow', 'unlabelled', 'unlabeled', 'unlabeled flow', 'no label', 'missing label', 'flow without a label', 'label missing'] },
  { value: 'noun', accept: ['noun name', 'noun', 'named with a noun', 'process named with a noun', 'noun instead of verb', 'not a verb', 'no verb'] },
  { value: 'store-store', accept: ['store to store', 'store store', 'two stores', 'two data stores', 'between stores', 'between two stores', 'between two data stores', 'data store to data store', 'data stores'] },
];

/** "3", "no inputs", "Store to entity" and "an unlabelled flow" all parse. Null otherwise. */
export function parseRule(input: string): Rule | null {
  const s = normaliseAnswer(input)
    .replace(/^(rule|number)\s+/, '')
    .replace(/^([1-6])[.):]\s+.*$/, '$1')
    .replace(/^(a|an|the)\s+/, '')
    .replace(/\s*->\s*|\s+-\s+/g, ' to ')
    .replace(/,/g, '');
  const n = /^([1-6])$/.exec(s);
  if (n) return RULES[Number(n[1]) - 1];
  const full = RULES.map((r) => ({ value: r, accept: [RULE_TEXT[r].toLowerCase().replace(/^(a|an) /, '').replace(/,/g, '')] }));
  return matchOption(s, RULE_OPTIONS) ?? matchOption(s, full);
}

function ruleWhy(rule: Rule, injection: Injection, sys: DfdSystem): string {
  switch (rule) {
    case 'entity-entity':
      return 'Data passing directly between two external entities happens outside the system, so the diagram never shows it. Every flow must start or end at a process.';
    case 'store-entity':
      return 'An external entity never reads or writes a data store directly: data reaches or leaves a store only through a process.';
    case 'store-store':
      return "Data can't move straight from one data store to another. A process has to read it from one store and write it to the other.";
    case 'unlabelled':
      return 'Every data flow is labelled with the data it carries, such as order_details, so the reader knows what moves along it.';
    case 'noun': {
      const slot = faultyKey(injection) as (typeof PROCESS_SLOTS)[number];
      return `A process does something to data, so it is named with a verb phrase, such as ${sys.processes[slot]}. ${sys.nouns[slot]} names data, not an action.`;
    }
    case 'no-io': {
      const inputs = injection.startsWith('no-inputs-');
      return inputs
        ? 'A process transforms data, so it needs at least one input and at least one output. With no input, this one produces data from nothing.'
        : 'A process transforms data, so it needs at least one input and at least one output. With no output, the data it receives goes nowhere.';
    }
  }
}

// ---------------------------------------------------------------------------
// (a) Convention errors
// ---------------------------------------------------------------------------

export interface ErrorScenario {
  system: string;
  diagram: DiagramKind;
  injection: Injection;
  mirror: boolean;
  seed: number;
}

export function systemById(id: string): DfdSystem {
  const s = SYSTEMS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown dfd system ${id}`);
  return s;
}

function scenarioFigure(sc: ErrorScenario): Dfd | ContextDiagram {
  const sys = systemById(sc.system);
  const id = `dfd-${sc.system}-${sc.injection}`;
  return sc.diagram === 'context'
    ? buildContext(sys, { mirror: sc.mirror, injection: sc.injection, id })
    : buildDfd(sys, { mirror: sc.mirror, injection: sc.injection, id, caption: `Part of the Level 1 data flow diagram for ${sys.org}.` });
}

/** The marked elements of an error scenario, in letter order; one is the faulty element. */
export function markedElements(sc: ErrorScenario, difficulty: Difficulty): string[] {
  const fig = scenarioFigure(sc);
  const rng = mulberry32(childSeed(sc.seed, 'marks'));
  const faulty = faultyKey(sc.injection);
  const others = elementKeys(fig).filter((k) => k !== faulty);
  const sameKind = others.filter((k) => isFlowKey(fig, k) === isFlowKey(fig, faulty));
  const otherKind = others.filter((k) => isFlowKey(fig, k) !== isFlowKey(fig, faulty));
  const n = difficulty === 'hard' ? 5 : 4;
  const picks = [...sample(rng, sameKind, n - 2), ...sample(rng, otherKind, 1)];
  const extra = sample(
    rng,
    others.filter((k) => !picks.includes(k)),
    n - 1 - picks.length,
  );
  return shuffle(rng, [faulty, ...picks, ...extra]);
}

function scenarioInstance(kind: 'element' | 'rule', sc: ErrorScenario, difficulty: Difficulty, followUp = false): string {
  return `dfd:${followUp ? 'follow-up' : kind}:${sc.system}:${sc.diagram}:${sc.injection}:m${sc.mirror ? 1 : 0}:seed=${sc.seed}:${difficulty}`;
}

function kindWord(sc: ErrorScenario): string {
  return sc.diagram === 'context' ? 'context diagram' : 'data flow diagram';
}

export function elementItem(sc: ErrorScenario, difficulty: Difficulty): QuizItem {
  const sys = systemById(sc.system);
  const fig = scenarioFigure(sc);
  const marked = markedElements(sc, difficulty);
  const letters = marked.map((_, i) => LETTERS[i]);
  const answer = marked.indexOf(faultyKey(sc.injection));
  const expected = `${letters[answer]}: ${describeElement(fig, marked[answer])}`;
  const reason = `${letters[answer]} is ${describeElement(fig, marked[answer])}. Every other marked element follows the conventions.`;
  const hint = `Type a letter from A to ${letters[letters.length - 1]}.`;
  return {
    id: 'gen-dfd-element',
    kk: DFD_KK,
    instance: scenarioInstance('element', sc, difficulty),
    chips: letters,
    prompt: [
      { kind: 'text', text: `${sys.org} is documenting its ${sys.system.toLowerCase()}.`, tone: 'muted' },
      { kind: 'figure', figure: fig, highlight: Object.fromEntries(marked.map((k, i) => [k, letters[i]])), compact: true },
      { kind: 'text', text: `Exactly one of the marked elements, ${formatAnd(letters)}, breaks a ${kindWord(sc)} convention. Which one?`, tone: 'accent' },
      { kind: 'text', text: hint, tone: 'muted' },
    ],
    check(input) {
      const chosen = parseChoice(input, letters.length);
      if (chosen === null) return { correct: false, expected, reason: hint, counted: false };
      return { correct: chosen === answer, expected, reason };
    },
  };
}

const RULE_HINT = 'Type the rule number from 1 to 6, or a short phrase such as store to entity.';

/**
 * Which rule the faulty element breaks. As a follow-up in a round the diagram is just above, so
 * it names the element by its letter; standalone, it shows the diagram with only that element
 * marked.
 */
export function ruleItem(sc: ErrorScenario, difficulty: Difficulty, followUp = false): QuizItem {
  const sys = systemById(sc.system);
  const fig = scenarioFigure(sc);
  const faulty = faultyKey(sc.injection);
  const rule = ruleOf(sc.injection);
  const n = RULES.indexOf(rule) + 1;
  const expected = `${n}. ${RULE_TEXT[rule]}`;
  const letter = followUp ? LETTERS[markedElements(sc, difficulty).indexOf(faulty)] : 'A';
  const element = describeElement(fig, faulty);
  const context: TerminalBlock[] = followUp
    ? [{ kind: 'text', text: `Follow-up on the same diagram: ${letter} is ${element}.`, tone: 'muted' }]
    : [
        { kind: 'text', text: `${sys.org} is documenting its ${sys.system.toLowerCase()}.`, tone: 'muted' },
        { kind: 'figure', figure: fig, highlight: { [faulty]: letter }, compact: true },
        { kind: 'text', text: `The element marked ${letter} is ${element}. It breaks a ${kindWord(sc)} convention.`, tone: 'muted' },
      ];
  return {
    id: 'gen-dfd-rule',
    kk: DFD_KK,
    instance: scenarioInstance('rule', sc, difficulty, followUp),
    chips: RULES.map((r) => RULE_CHIPS[r]),
    prompt: [
      ...context,
      { kind: 'text', text: `Which rule does ${letter} break?`, tone: 'accent' },
      { kind: 'choices', options: RULES.map((r) => RULE_TEXT[r]), labels: 'numbers' },
      { kind: 'text', text: RULE_HINT, tone: 'muted' },
    ],
    check(input) {
      const chosen = parseRule(input);
      if (!chosen) return { correct: false, expected, reason: RULE_HINT, counted: false };
      return { correct: chosen === rule, expected, reason: ruleWhy(rule, sc.injection, sys) };
    },
  };
}

// ---------------------------------------------------------------------------
// (b) Labelling
// ---------------------------------------------------------------------------

export interface LabelScenario {
  system: string;
  /** Blank process and store slots, in the order they are asked. */
  blanks: NodeSlot[];
  /** Which blank this item asks about (0-based). */
  index: number;
  mirror: boolean;
  seed: number;
  /** In a round, questions after the first don't repeat the context diagram. */
  followUp?: boolean;
}

function labelOf(sys: DfdSystem, slot: NodeSlot): string {
  return slot.startsWith('p') ? sys.processes[slot as (typeof PROCESS_SLOTS)[number]] : sys.stores[slot as (typeof STORE_SLOTS)[number]];
}

/** The word bank: every blank's label, sorted so its order gives nothing away. */
export function wordBank(sys: DfdSystem, blanks: readonly NodeSlot[]): string[] {
  return blanks.map((b) => labelOf(sys, b)).sort((a, b) => a.localeCompare(b));
}

export function labelItem(sc: LabelScenario, difficulty: Difficulty): QuizItem {
  const sys = systemById(sc.system);
  const open = sc.blanks.slice(sc.index);
  const slot = sc.blanks[sc.index];
  const marks = Object.fromEntries(open.map((b) => [b, LETTERS[sc.blanks.indexOf(b)]]));
  const letter = LETTERS[sc.index];
  const bank = wordBank(sys, sc.blanks);
  const answer = labelOf(sys, slot);
  const dfd = buildDfd(sys, { mirror: sc.mirror, blanks: open, id: `dfd-${sys.id}-blanks-${sc.index}` });
  const what = slot.startsWith('p') ? `process ${slot.slice(1)}` : `data store D${slot.slice(1)}`;
  const flowsIn = dfd.flows.filter((f) => f.to === slot).map((f) => f.label);
  const flowsOut = dfd.flows.filter((f) => f.from === slot).map((f) => f.label);
  const evidence = [flowsIn.length ? `it receives ${formatAnd(flowsIn)}` : '', flowsOut.length ? `it sends ${formatAnd(flowsOut)}` : ''].filter(Boolean).join(' and ');
  const reason = slot.startsWith('p')
    ? `${capitalise(what)} is ${answer}: ${evidence}. A process is named with a verb phrase for what it does.`
    : `${capitalise(what)} is ${answer}: ${evidence}. A data store is named for the data it holds.`;
  const expected = `${bank.indexOf(answer) + 1}. ${answer}`;
  const hint = `Type the label or its number from 1 to ${bank.length}.`;
  const intro: TerminalBlock[] =
    sc.followUp && sc.index > 0
      ? [{ kind: 'text', text: `The same system: the Level 1 data flow diagram, with the blanks answered so far filled in.`, tone: 'muted' }]
      : [
          { kind: 'text', text: `${sys.org} has a context diagram for its ${sys.system.toLowerCase()}. Its Level 1 data flow diagram has some process and data store labels missing.`, tone: 'muted' },
          { kind: 'figure', figure: buildContext(sys, { mirror: sc.mirror, id: `context-${sys.id}` }), compact: true },
        ];
  return {
    id: 'gen-dfd-label',
    kk: DFD_KK,
    instance: `dfd:${sc.followUp && sc.index > 0 ? 'label-next' : 'label'}:${sys.id}:${sc.blanks.join('-')}:${sc.index}:m${sc.mirror ? 1 : 0}:seed=${sc.seed}:${difficulty}`,
    chips: bank,
    prompt: [
      ...intro,
      { kind: 'figure', figure: dfd, highlight: marks, compact: true },
      { kind: 'choices', options: bank, labels: 'numbers' },
      { kind: 'text', text: `Which label belongs in the blank marked ${letter}, ${what}?`, tone: 'accent' },
      { kind: 'text', text: hint, tone: 'muted' },
    ],
    check(input) {
      const typed = normaliseAnswer(input);
      const n = /^\d+$/.test(typed) ? Number(typed) : null;
      const chosen = n !== null ? (n >= 1 && n <= bank.length ? bank[n - 1] : null) : matchOption(typed, bank.map((b) => ({ value: b, accept: [b] })));
      if (!chosen) return { correct: false, expected, reason: `Choose from the word bank. ${hint}`, counted: false };
      return { correct: chosen === answer, expected, reason };
    },
  };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Specs, instances and rounds
// ---------------------------------------------------------------------------

export type DfdSpec = { kind: 'element'; scenario: ErrorScenario } | { kind: 'rule'; scenario: ErrorScenario; followUp?: boolean } | { kind: 'label'; scenario: LabelScenario };

export function dfdItem(spec: DfdSpec, difficulty: Difficulty): QuizItem {
  switch (spec.kind) {
    case 'element':
      return elementItem(spec.scenario, difficulty);
    case 'rule':
      return ruleItem(spec.scenario, difficulty, spec.followUp);
    case 'label':
      return labelItem(spec.scenario, difficulty);
  }
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromDfdInstance(instance: string): QuizItem | null {
  const err = /^dfd:(element|rule|follow-up):([a-z]+):(context|dfd):([a-z0-9-]+):m([01]):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (err) {
    const [, kind, system, diagram, injection, mirror, seed, difficulty] = err;
    if (!SYSTEMS.some((s) => s.id === system) || !DIFFICULTIES.includes(difficulty as Difficulty)) return null;
    if (!injectionsFor(systemById(system), diagram as DiagramKind).includes(injection)) return null;
    const scenario: ErrorScenario = { system, diagram: diagram as DiagramKind, injection, mirror: mirror === '1', seed: Number(seed) };
    const spec: DfdSpec = kind === 'element' ? { kind: 'element', scenario } : { kind: 'rule', scenario, followUp: kind === 'follow-up' };
    return dfdItem(spec, difficulty as Difficulty);
  }
  const lab = /^dfd:(label|label-next):([a-z]+):((?:[pd][1-3]-)*[pd][1-3]):(\d):m([01]):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (lab) {
    const [, kind, system, blanks, index, mirror, seed, difficulty] = lab;
    const slots = blanks.split('-') as NodeSlot[];
    if (!SYSTEMS.some((s) => s.id === system) || Number(index) >= slots.length || new Set(slots).size !== slots.length) return null;
    return labelItem({ system, blanks: slots, index: Number(index), mirror: mirror === '1', seed: Number(seed), followUp: kind === 'label-next' }, difficulty as Difficulty);
  }
  return null;
}

/** How often an error that a context diagram can show is drawn on one. */
const CONTEXT_SHARE: Record<Difficulty, number> = { easy: 0.6, normal: 0.35, hard: 0.15 };

function errorScenario(system: DfdSystem, rule: Rule, seed: number, difficulty: Difficulty): ErrorScenario {
  const rng = mulberry32(childSeed(seed, 'scenario'));
  const contextOk = rule === 'entity-entity' || rule === 'unlabelled';
  const diagram: DiagramKind = contextOk && rng() < CONTEXT_SHARE[difficulty] ? 'context' : 'dfd';
  const injection = pick(
    rng,
    injectionsFor(system, diagram).filter((i) => ruleOf(i) === rule),
  );
  return { system: system.id, diagram, injection, mirror: rng() < 0.5, seed };
}

function labelScenario(system: DfdSystem, seed: number): Omit<LabelScenario, 'index'> {
  const rng = mulberry32(childSeed(seed, 'blanks'));
  const blanks = shuffle(rng, [...sample(rng, [...PROCESS_SLOTS], 2), ...sample(rng, [...STORE_SLOTS], 2)]);
  return { system: system.id, blanks, mirror: rng() < 0.5, seed };
}

export const ERROR_SCENARIOS = 3;
export const LABEL_BLANKS = 4;

/**
 * A round: three error diagrams (element then rule, each with a different rule and business) and
 * one labelling diagram with four blanks, in a seeded order.
 */
export function planDfdRound(seed: number, difficulty: Difficulty, count = 10): DfdSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const specs: DfdSpec[] = [];
  for (let cycle = 0; specs.length < count; cycle++) {
    const systems = shuffle(rng, SYSTEMS);
    const rules = shuffle(rng, RULES).slice(0, ERROR_SCENARIOS);
    const blocks: DfdSpec[][] = rules.map((rule, i) => {
      const scenario = errorScenario(systems[i], rule, childSeed(seed, `${cycle}:error:${i}`), difficulty);
      return [
        { kind: 'element', scenario },
        { kind: 'rule', scenario, followUp: true },
      ];
    });
    const lab = labelScenario(systems[ERROR_SCENARIOS], childSeed(seed, `${cycle}:label`));
    blocks.splice(Math.floor(rng() * (blocks.length + 1)), 0, lab.blanks.map((_, index) => ({ kind: 'label', scenario: { ...lab, index, followUp: true } })));
    specs.push(...blocks.flat());
  }
  return specs.slice(0, count);
}

/** Game.generate: one self-contained item, an element, rule or labelling question. */
export function generateDfdItem(seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'kind'));
  const system = pick(rng, SYSTEMS);
  const roll = rng();
  if (roll < 0.35) {
    const lab = labelScenario(system, seed);
    return labelItem({ ...lab, index: Math.floor(rng() * lab.blanks.length) }, difficulty);
  }
  const scenario = errorScenario(system, pick(rng, RULES), seed, difficulty);
  return roll < 0.8 ? elementItem(scenario, difficulty) : ruleItem(scenario, difficulty);
}
