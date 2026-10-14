/**
 * `dfd` items, two round types:
 *
 * (a) Rules. A context diagram or Level 1 DFD with exactly one of VCAA's rules broken. The element
 *     question marks several elements with letters and asks which one is wrong; the rule question
 *     then asks which rule it breaks, from that kind of diagram's list (a number or a short phrase).
 * (b) Labelling. A context diagram and a Level 1 DFD whose process and store labels are partly
 *     blank. One question per blank, answered from a word bank; answered blanks are filled in on
 *     the next question.
 *
 * Processes and data stores are named, never numbered, in every question and reason. Each item
 * stands alone, so the daily challenge or a report can regenerate it from its instance
 * ("dfd:element:cafe:dfd:same-name-p2:v1:seed=12:normal").
 */
import type { ContextDiagram, Dfd, KkId } from '../../content/schema';
import { normaliseAnswer } from '../../lib/text';
import type { TerminalBlock } from '../../terminal/blocks';
import { formatAnd, LETTERS, matchOption, parseChoice } from '../answers';
import { childSeed, mulberry32, pick, sample, shuffle } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import {
  buildContext,
  buildDfd,
  CROSSED_FLOW,
  describeElement,
  elementKeys,
  faultyKey,
  INJECTED_RULES,
  injectionsFor,
  isFlowKey,
  partnerKeys,
  ruleOf,
  RULES,
  SAME_NAME,
  VIEWS,
  type DiagramKind,
  type Injection,
  type Rule,
  type View,
} from './diagrams';
import { PROCESS_SLOTS, STORE_SLOTS, SYSTEMS, type DfdSystem, type NodeSlot, type ProcessSlot } from './systems';

export const DFD_KK: KkId[] = ['U3O2-KK08'];

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

/** Each rule in a few words (paraphrased from the outcome-specific requirements). */
export const RULE_TEXT: Record<Rule, string> = {
  'entity-entity': 'No data flows straight between two external entities',
  'store-store': 'No data flows straight between two data stores',
  'entity-store': 'No data flows straight between an external entity and a data store',
  crossing: 'Data flows never cross each other',
  'single-set': 'Each data flow carries a single set of information',
  'process-io': 'Every process has at least one input and at least one output',
  'same-name': "A process's output is named differently from its input",
  'store-io': 'Every data store has at least one input and at least one output',
  'process-unconnected': 'Every process connects to another process, a data store or an external entity',
  'entity-unconnected': 'Every external entity sends at least one input or receives at least one output',
};

/** A short phrase for each rule, as the man page lists them; parseRule accepts each. */
export const RULE_PHRASES: Record<Rule, string> = {
  'entity-entity': 'entity to entity',
  'store-store': 'store to store',
  'entity-store': 'entity to store',
  crossing: 'crossing flows',
  'single-set': 'one set of information',
  'process-io': 'process input and output',
  'same-name': 'same name',
  'store-io': 'store input and output',
  'process-unconnected': 'unconnected process',
  'entity-unconnected': 'unconnected entity',
};

const RULE_OPTIONS: readonly { value: Rule; accept: readonly string[] }[] = [
  { value: 'entity-entity', accept: ['entity to entity', 'entity entity', 'two entities', 'between entities', 'between two entities', 'entities'] },
  { value: 'store-store', accept: ['store to store', 'store store', 'two stores', 'between stores', 'between two stores', 'stores'] },
  {
    value: 'entity-store',
    accept: ['entity to store', 'store to entity', 'entity store', 'store entity', 'entity and store', 'store and entity', 'between entity and store', 'between an entity and a store'],
  },
  { value: 'crossing', accept: ['crossing flows', 'crossing', 'crossed flows', 'flows cross', 'flows crossing', 'lines cross', 'crossing lines', 'flows cross each other'] },
  { value: 'single-set', accept: ['one set of information', 'single set of information', 'single set', 'one set', 'one set per flow'] },
  {
    value: 'process-io',
    accept: [
      'process input and output',
      'process inputs and outputs',
      'process with no input',
      'process with no inputs',
      'process with no output',
      'process with no outputs',
      'process no input',
      'process no inputs',
      'process no output',
      'process no outputs',
      'process missing input',
      'process missing output',
      'black hole',
      'miracle',
    ],
  },
  { value: 'same-name', accept: ['same name', 'same names', 'output named like input', 'output same name as input', 'same name in and out', 'renamed output'] },
  {
    value: 'store-io',
    accept: [
      'store input and output',
      'store inputs and outputs',
      'store with no input',
      'store with no inputs',
      'store with no output',
      'store with no outputs',
      'store no input',
      'store no inputs',
      'store no output',
      'store no outputs',
      'store missing input',
      'store missing output',
      'store never read',
      'store never written',
    ],
  },
  { value: 'process-unconnected', accept: ['unconnected process', 'process not connected', 'process unconnected', 'isolated process'] },
  { value: 'entity-unconnected', accept: ['unconnected entity', 'entity not connected', 'entity unconnected', 'isolated entity', 'entity with no flows', 'entity no flows'] },
];

/**
 * "3", "rule 4", "store to entity", "a process with no outputs" and "data flows cross each other"
 * all parse. Numbers follow the list for that kind of diagram. Null otherwise.
 */
export function parseRule(input: string, diagram: DiagramKind): Rule | null {
  const list = RULES[diagram];
  const s = phrase(normaliseAnswer(input).replace(/^(rule|number)\s+/, '').replace(/^(\d{1,2})[.):]\s+.*$/, '$1'));
  const n = /^(\d{1,2})$/.exec(s);
  if (n) return list[Number(n[1]) - 1] ?? null;
  const rule = matchOption(s, PHRASE_OPTIONS);
  return rule && list.includes(rule) ? rule : null;
}

/** Drops articles and the words "data" and "external", so "a data store" and "store" read alike. */
function phrase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\bdata (stores?|flows?)\b/g, '$1')
    .replace(/\bexternal (entit(?:y|ies))\b/g, '$1')
    .replace(/\b(a|an|the)\s+/g, '')
    .replace(/\s*->\s*|\s+-\s+/g, ' to ')
    .replace(/[,']/g, '')
    .replace(/^flows? (?=between |from )/, '')
    .replace(/^from /, '');
}

/** The short phrases and each rule's full wording, read the way parseRule reads an answer. */
const PHRASE_OPTIONS: readonly { value: Rule; accept: readonly string[] }[] = RULE_OPTIONS.map((o) => ({
  value: o.value,
  accept: [...o.accept, RULE_TEXT[o.value]].map(phrase),
}));

function ruleWhy(rule: Rule, injection: Injection, sys: DfdSystem): string {
  switch (rule) {
    case 'entity-entity':
      return "Data can't flow straight between two external entities: what they exchange happens outside the system, so the diagram doesn't show it. A flow always starts or ends inside the system.";
    case 'store-store':
      return "Data can't flow straight from one data store to another. A process has to read it from one store and write it to the other.";
    case 'entity-store':
      return "Data can't flow straight between an external entity and a data store: it has to pass through a process on its way into or out of the store.";
    case 'crossing':
      return `Data flows mustn't cross each other: this one crosses the flow ${sys.flows[CROSSED_FLOW]}. Redraw the diagram, moving an element or the line, so that no two flows cross.`;
    case 'same-name': {
      const { input } = SAME_NAME[injection.split('-').pop() as ProcessSlot];
      return `A process changes the data it receives, so a flow it sends out must be named differently from the flow it receives. This output has the same name as its input, ${sys.flows[input]}.`;
    }
    case 'process-io': {
      const inputs = injection.startsWith('no-inputs-');
      return inputs
        ? 'Every process needs at least one input and at least one output. With no input, this one produces data from nothing.'
        : 'Every process needs at least one input and at least one output. With no output, the data it receives goes nowhere.';
    }
    case 'store-io': {
      const inputs = injection.startsWith('no-inputs-');
      return inputs
        ? 'Every data store needs at least one input and at least one output. Nothing writes to this one, so the data read from it can never have been stored.'
        : 'Every data store needs at least one input and at least one output. Nothing reads from this one, so the data written to it is never used.';
    }
    case 'entity-unconnected':
      return 'Every external entity must send at least one input to the system or receive at least one output from it. This one has no flows at all.';
    case 'single-set':
    case 'process-unconnected':
      throw new Error(`the ${rule} rule is never injected`);
  }
}

// ---------------------------------------------------------------------------
// (a) Rules
// ---------------------------------------------------------------------------

export interface ErrorScenario {
  system: string;
  diagram: DiagramKind;
  injection: Injection;
  view: View;
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
  return sc.diagram === 'context' ? buildContext(sys, { view: sc.view, injection: sc.injection, id }) : buildDfd(sys, { view: sc.view, injection: sc.injection, id });
}

/**
 * The marked elements of an error scenario, in letter order; one is the faulty element. The
 * elements that take part in the error alongside it (the flow it crosses, the input it copies)
 * are never marked.
 */
export function markedElements(sc: ErrorScenario, difficulty: Difficulty): string[] {
  const fig = scenarioFigure(sc);
  const rng = mulberry32(childSeed(sc.seed, 'marks'));
  const faulty = faultyKey(sc.injection);
  const partners = partnerKeys(sc.injection);
  const others = elementKeys(fig).filter((k) => k !== faulty && !partners.includes(k));
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
  return `dfd:${followUp ? 'follow-up' : kind}:${sc.system}:${sc.diagram}:${sc.injection}:v${sc.view}:seed=${sc.seed}:${difficulty}`;
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
  const reason = `${letters[answer]} is ${describeElement(fig, marked[answer])}. Every other marked element follows the rules.`;
  const hint = `Type a letter from A to ${letters[letters.length - 1]}.`;
  return {
    id: 'gen-dfd-element',
    kk: DFD_KK,
    instance: scenarioInstance('element', sc, difficulty),
    chips: letters,
    prompt: [
      { kind: 'text', text: `${sys.org} is documenting its ${sys.system.toLowerCase()}.`, tone: 'muted' },
      { kind: 'figure', figure: fig, highlight: Object.fromEntries(marked.map((k, i) => [k, letters[i]])), compact: true },
      { kind: 'text', text: `Exactly one of the marked elements, ${formatAnd(letters)}, breaks a rule for drawing a ${kindWord(sc)}. Which one?`, tone: 'accent' },
      { kind: 'text', text: hint, tone: 'muted' },
    ],
    check(input) {
      const chosen = parseChoice(input, letters.length);
      if (chosen === null) return { correct: false, expected, reason: hint, counted: false };
      return { correct: chosen === answer, expected, reason };
    },
  };
}

function ruleHint(diagram: DiagramKind): string {
  return `Type the rule number from 1 to ${RULES[diagram].length}, or a short phrase such as ${diagram === 'dfd' ? 'entity to store' : 'entity to entity'}.`;
}

/**
 * Which rule the faulty element breaks, from the list for its kind of diagram. As a follow-up in
 * a round the diagram is just above, so it names the element by its letter; standalone, it shows
 * the diagram with only that element marked.
 */
export function ruleItem(sc: ErrorScenario, difficulty: Difficulty, followUp = false): QuizItem {
  const sys = systemById(sc.system);
  const fig = scenarioFigure(sc);
  const faulty = faultyKey(sc.injection);
  const rule = ruleOf(sc.injection);
  const list = RULES[sc.diagram];
  const n = list.indexOf(rule) + 1;
  const expected = `${n}. ${RULE_TEXT[rule]}`;
  const letter = followUp ? LETTERS[markedElements(sc, difficulty).indexOf(faulty)] : 'A';
  const element = describeElement(fig, faulty);
  const hint = ruleHint(sc.diagram);
  const context: TerminalBlock[] = followUp
    ? [{ kind: 'text', text: `Follow-up on the same diagram: ${letter} is ${element}.`, tone: 'muted' }]
    : [
        { kind: 'text', text: `${sys.org} is documenting its ${sys.system.toLowerCase()}.`, tone: 'muted' },
        { kind: 'figure', figure: fig, highlight: { [faulty]: letter }, compact: true },
        { kind: 'text', text: `The element marked ${letter} is ${element}. It breaks a rule for drawing a ${kindWord(sc)}.`, tone: 'muted' },
      ];
  return {
    id: 'gen-dfd-rule',
    kk: DFD_KK,
    instance: scenarioInstance('rule', sc, difficulty, followUp),
    // Numbers keep the chips short on a phone; the numbered rules are printed just above.
    chips: list.map((_, i) => String(i + 1)),
    prompt: [
      ...context,
      { kind: 'text', text: `Which of the ${kindWord(sc)} rules does ${letter} break?`, tone: 'accent' },
      { kind: 'choices', options: list.map((r) => RULE_TEXT[r]), labels: 'numbers' },
      { kind: 'text', text: hint, tone: 'muted' },
    ],
    check(input) {
      const chosen = parseRule(input, sc.diagram);
      if (!chosen) return { correct: false, expected, reason: hint, counted: false };
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
  view: View;
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
  const dfd = buildDfd(sys, { view: sc.view, blanks: open, id: `dfd-${sys.id}-blanks-${sc.index}` });
  const isProcess = slot.startsWith('p');
  const flowsIn = dfd.flows.filter((f) => f.to === slot).map((f) => f.label);
  const flowsOut = dfd.flows.filter((f) => f.from === slot).map((f) => f.label);
  const evidence = [flowsIn.length ? `it receives ${formatAnd(flowsIn)}` : '', flowsOut.length ? `it sends ${formatAnd(flowsOut)}` : ''].filter(Boolean).join(' and ');
  const reason = isProcess
    ? `The process marked ${letter} is ${answer}: ${evidence}. A process is named for what it does with the data.`
    : `The data store marked ${letter} is ${answer}: ${evidence}. A data store is named for the data it holds.`;
  const expected = `${bank.indexOf(answer) + 1}. ${answer}`;
  const hint = `Type the label or its number from 1 to ${bank.length}.`;
  const intro: TerminalBlock[] =
    sc.followUp && sc.index > 0
      ? [{ kind: 'text', text: `The same system: the Level 1 data flow diagram, with the blanks answered so far filled in.`, tone: 'muted' }]
      : [
          { kind: 'text', text: `${sys.org} has a context diagram for its ${sys.system.toLowerCase()}. Its Level 1 data flow diagram has some process and data store labels missing.`, tone: 'muted' },
          { kind: 'figure', figure: buildContext(sys, { view: sc.view, id: `context-${sys.id}` }), compact: true },
        ];
  return {
    id: 'gen-dfd-label',
    kk: DFD_KK,
    instance: `dfd:${sc.followUp && sc.index > 0 ? 'label-next' : 'label'}:${sys.id}:${sc.blanks.join('-')}:${sc.index}:v${sc.view}:seed=${sc.seed}:${difficulty}`,
    chips: bank,
    prompt: [
      ...intro,
      { kind: 'figure', figure: dfd, highlight: marks, compact: true },
      { kind: 'choices', options: bank, labels: 'numbers' },
      { kind: 'text', text: `Which label belongs in the blank marked ${letter}, a ${isProcess ? 'process' : 'data store'}?`, tone: 'accent' },
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
  const err = /^dfd:(element|rule|follow-up):([a-z]+):(context|dfd):([a-z0-9-]+):v([0-3]):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (err) {
    const [, kind, system, diagram, injection, view, seed, difficulty] = err;
    if (!SYSTEMS.some((s) => s.id === system) || !DIFFICULTIES.includes(difficulty as Difficulty)) return null;
    if (!injectionsFor(systemById(system), diagram as DiagramKind).includes(injection)) return null;
    const scenario: ErrorScenario = { system, diagram: diagram as DiagramKind, injection, view: Number(view) as View, seed: Number(seed) };
    const spec: DfdSpec = kind === 'element' ? { kind: 'element', scenario } : { kind: 'rule', scenario, followUp: kind === 'follow-up' };
    return dfdItem(spec, difficulty as Difficulty);
  }
  const lab = /^dfd:(label|label-next):([a-z]+):((?:[pd][1-3]-)*[pd][1-3]):(\d):v([0-3]):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (lab) {
    const [, kind, system, blanks, index, view, seed, difficulty] = lab;
    const slots = blanks.split('-') as NodeSlot[];
    if (!SYSTEMS.some((s) => s.id === system) || Number(index) >= slots.length || new Set(slots).size !== slots.length) return null;
    return labelItem({ system, blanks: slots, index: Number(index), view: Number(view) as View, seed: Number(seed), followUp: kind === 'label-next' }, difficulty as Difficulty);
  }
  return null;
}

/** The rules each difficulty injects: easy keeps to the errors that are plainest to see. */
export const RULES_FOR: Record<Difficulty, readonly Rule[]> = {
  easy: ['entity-entity', 'store-store', 'entity-store', 'process-io', 'store-io'],
  normal: INJECTED_RULES,
  hard: INJECTED_RULES,
};

/** How often a flow between two entities is drawn on a context diagram rather than a DFD. */
const CONTEXT_SHARE: Record<Difficulty, number> = { easy: 0.6, normal: 0.35, hard: 0.15 };

function errorScenario(system: DfdSystem, rule: Rule, seed: number, difficulty: Difficulty): ErrorScenario {
  const rng = mulberry32(childSeed(seed, 'scenario'));
  const diagram: DiagramKind = injectionsFor(system, 'context').some((i) => ruleOf(i) === rule) && rng() < CONTEXT_SHARE[difficulty] ? 'context' : 'dfd';
  const injection = pick(
    rng,
    injectionsFor(system, diagram).filter((i) => ruleOf(i) === rule),
  );
  return { system: system.id, diagram, injection, view: pick(rng, VIEWS), seed };
}

function labelScenario(system: DfdSystem, seed: number): Omit<LabelScenario, 'index'> {
  const rng = mulberry32(childSeed(seed, 'blanks'));
  const blanks = shuffle(rng, [...sample(rng, [...PROCESS_SLOTS], 2), ...sample(rng, [...STORE_SLOTS], 2)]);
  return { system: system.id, blanks, view: pick(rng, VIEWS), seed };
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
    const rules = shuffle(rng, RULES_FOR[difficulty]).slice(0, ERROR_SCENARIOS);
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
  const scenario = errorScenario(system, pick(rng, RULES_FOR[difficulty]), seed, difficulty);
  return roll < 0.8 ? elementItem(scenario, difficulty) : ruleItem(scenario, difficulty);
}
