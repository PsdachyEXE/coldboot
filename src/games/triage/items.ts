/**
 * `triage` items: classify an error case (syntax, logic, or the kind of runtime error), then, as a
 * follow-up on some cases, choose the debugging technique that suits it. Each item stands alone,
 * so the daily challenge can use either kind. Instances ("triage:classify:overflow:seed=7:hard")
 * regenerate an item exactly through fromTriageInstance.
 */
import type { KkId } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import { normaliseAnswer } from '../../lib/text';
import { matchOption } from '../answers';
import { childSeed, mulberry32, pick, shuffle, type Rng } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { RUNTIME_LABELS, TECHNIQUE_LABELS, TEMPLATE_IDS, TEMPLATES, type Classification, type ErrorType, type RuntimeKind, type Scenario, type Technique } from './scenarios';

export const TRIAGE_KINDS = ['classify', 'technique'] as const;
export type TriageKind = (typeof TRIAGE_KINDS)[number];

export interface TriageSpec {
  kind: TriageKind;
  template: string;
  seed: number;
  /** A technique question straight after its case in a round: the listing isn't printed again. */
  followUp?: boolean;
}

export const CLASSIFY_KK: KkId[] = ['U3O1-KK13'];
export const TECHNIQUE_KK: KkId[] = ['U3O1-KK14', 'U4O1-KK06'];

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export const CLASSIFY_CHIPS = ['syntax', 'logic', 'overflow', 'index out of range', 'type mismatch', 'divide by zero'];
export const TECHNIQUE_CHIPS = [TECHNIQUE_LABELS.breakpoint, TECHNIQUE_LABELS.output, TECHNIQUE_LABELS.comment];

type ClassValue = 'syntax' | 'logic' | RuntimeKind;

const CLASS_OPTIONS: readonly { value: ClassValue; accept: readonly string[] }[] = [
  { value: 'syntax', accept: ['syntax', 'syntactic', 'syntactical'] },
  { value: 'logic', accept: ['logic', 'logical'] },
  { value: 'overflow', accept: ['overflow', 'arithmetic overflow', 'integer overflow', 'numeric overflow'] },
  {
    value: 'index',
    accept: ['index out of range', 'out of range', 'index out of bounds', 'out of bounds', 'array index out of range', 'array index out of bounds', 'index'],
  },
  { value: 'type', accept: ['type mismatch', 'mismatch', 'type', 'wrong type', 'data type mismatch'] },
  { value: 'divide', accept: ['divide by zero', 'division by zero', 'divided by zero', 'divide by 0', 'division by 0', 'zero division', 'dividing by zero'] },
];

const TECHNIQUE_OPTIONS: readonly { value: Technique; accept: readonly string[] }[] = [
  { value: 'breakpoint', accept: ['breakpoint', 'breakpoints', 'break point', 'break points', 'set a breakpoint'] },
  {
    value: 'output',
    accept: [
      'debugging output statement',
      'debugging output statements',
      'debugging output',
      'debug output',
      'debug output statement',
      'output statement',
      'output statements',
      'print statement',
      'print statements',
      'debugging statement',
      'debugging statements',
      'display statement',
    ],
  },
  { value: 'comment', accept: ['commenting out code', 'commenting out', 'comment out', 'comment out code', 'comment code out', 'commenting code out', 'commenting'] },
];

export type ParsedClass = Classification | 'runtime' | null;

/**
 * Reads a classification leniently: "logic", "Logic error", "runtime: divide by zero", "index out
 * of range" and "Division by zero error" all parse. "runtime" on its own is incomplete (the kind
 * is missing), which the item re-prompts for. Null when nothing matches.
 */
export function parseClassification(input: string): ParsedClass {
  const words = normaliseAnswer(input)
    .replace(/[:;,()[\]-]/g, ' ')
    .replace(/\brun\s*time\b/g, 'runtime')
    .replace(/^an?\s+/, '')
    .split(/\s+/)
    .filter(Boolean);
  const saidRuntime = words.includes('runtime');
  const rest = words.filter((w) => w !== 'runtime' && w !== 'error' && w !== 'errors').join(' ');
  if (!rest) return saidRuntime ? 'runtime' : null;
  const value = matchOption(rest, CLASS_OPTIONS);
  if (!value) return null;
  if (value === 'syntax' || value === 'logic') return saidRuntime ? null : { type: value };
  return { type: 'runtime', kind: value };
}

export function parseTechnique(input: string): Technique | null {
  const s = normaliseAnswer(input).replace(/^(use|using|add|set)\s+/, '').replace(/^an?\s+/, '');
  return matchOption(s, TECHNIQUE_OPTIONS);
}

export function classificationLabel(c: Classification): string {
  if (c.type === 'runtime') return `Runtime error: ${RUNTIME_LABELS[c.kind!]}`;
  return c.type === 'syntax' ? 'Syntax error' : 'Logic error';
}

export function scenarioFor(template: string, seed: number, difficulty: Difficulty): Scenario {
  const entry = TEMPLATES[template];
  if (!entry) throw new Error(`unknown triage template ${template}`);
  return entry.make(mulberry32(seed), difficulty);
}

function caseBlocks(s: Scenario): TerminalBlock[] {
  const blocks: TerminalBlock[] = [{ kind: 'text', text: s.story }];
  if (s.code) {
    const usesArrays = s.code.source.includes('[');
    blocks.push({ kind: 'pseudo', code: s.code.source, indexBase: usesArrays ? (s.code.indexBase ?? 0) : undefined });
  }
  return blocks;
}

const CLASSIFY_HINT = 'Type syntax or logic. For a runtime error, type its kind: overflow, index out of range, type mismatch or divide by zero.';

export function classifyItem(template: string, seed: number, difficulty: Difficulty): QuizItem {
  const s = scenarioFor(template, seed, difficulty);
  const expected = classificationLabel(s.classification);
  return {
    id: 'gen-triage-classify',
    kk: CLASSIFY_KK,
    instance: `triage:classify:${template}:seed=${seed}:${difficulty}`,
    chips: CLASSIFY_CHIPS,
    prompt: [...caseBlocks(s), { kind: 'text', text: 'What type of error is this?', tone: 'accent' }, { kind: 'text', text: CLASSIFY_HINT, tone: 'muted' }],
    check(input) {
      const parsed = parseClassification(input);
      if (parsed === 'runtime') {
        return { correct: false, expected, reason: 'Which runtime error is it? Type overflow, index out of range, type mismatch or divide by zero.', counted: false };
      }
      if (!parsed) return { correct: false, expected, reason: CLASSIFY_HINT, counted: false };
      const correct = parsed.type === s.classification.type && parsed.kind === s.classification.kind;
      return { correct, expected, reason: s.why };
    },
  };
}

const TECHNIQUE_HINT = 'Type breakpoint, debugging output statement or commenting out code.';

/**
 * A technique question. Standalone, it shows the whole case; as a follow-up in a round, the case
 * is on screen just above, so it only repeats the story.
 */
export function techniqueItem(template: string, seed: number, difficulty: Difficulty, followUp = false): QuizItem {
  const s = scenarioFor(template, seed, difficulty);
  const label = TECHNIQUE_LABELS[s.technique.answer];
  const expected = label.charAt(0).toUpperCase() + label.slice(1);
  const context: TerminalBlock[] = followUp
    ? [{ kind: 'text', text: `Follow-up on the same case: ${s.story}`, tone: 'muted' }]
    : caseBlocks(s);
  return {
    id: 'gen-triage-technique',
    kk: TECHNIQUE_KK,
    instance: `triage:${followUp ? 'follow-up' : 'technique'}:${template}:seed=${seed}:${difficulty}`,
    chips: TECHNIQUE_CHIPS,
    prompt: [
      ...context,
      { kind: 'text', text: `To find the fault, ${s.technique.need}. Which debugging technique suits this best?`, tone: 'accent' },
      { kind: 'text', text: TECHNIQUE_HINT, tone: 'muted' },
    ],
    check(input) {
      const chosen = parseTechnique(input);
      if (!chosen) return { correct: false, expected, reason: TECHNIQUE_HINT, counted: false };
      return { correct: chosen === s.technique.answer, expected, reason: s.technique.why };
    },
  };
}

export function triageItem(spec: TriageSpec, difficulty: Difficulty): QuizItem {
  const seed = spec.seed >>> 0;
  return spec.kind === 'classify' ? classifyItem(spec.template, seed, difficulty) : techniqueItem(spec.template, seed, difficulty, spec.followUp);
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromTriageInstance(instance: string): QuizItem | null {
  const m = /^triage:(classify|technique|follow-up):([a-z-]+):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (!m || !TEMPLATES[m[2]] || !DIFFICULTIES.includes(m[4] as Difficulty)) return null;
  const kind: TriageKind = m[1] === 'classify' ? 'classify' : 'technique';
  return triageItem({ kind, template: m[2], seed: Number(m[3]), followUp: m[1] === 'follow-up' }, m[4] as Difficulty);
}

/** How likely a case is described in words rather than shown as a listing. */
const PLAIN_SHARE: Record<Difficulty, number> = { easy: 0.6, normal: 0.4, hard: 0.15 };

function chooseTemplate(rng: Rng, type: ErrorType, difficulty: Difficulty, used: Set<string>, usedKinds: Set<RuntimeKind>): string {
  const plain = rng() < PLAIN_SHARE[difficulty];
  const fits = (id: string, strict: boolean) => {
    const t = TEMPLATES[id];
    if (t.type !== type || used.has(id)) return false;
    if (strict && t.code === plain) return false;
    if (strict && t.kind && usedKinds.has(t.kind)) return false;
    return true;
  };
  const strict = TEMPLATE_IDS.filter((id) => fits(id, true));
  const loose = TEMPLATE_IDS.filter((id) => fits(id, false));
  return pick(rng, strict.length ? strict : loose.length ? loose : TEMPLATE_IDS.filter((id) => TEMPLATES[id].type === type));
}

export const ROUND_CASES = 6;
export const ROUND_FOLLOW_UPS = 4;

/**
 * A round of `count` items: six cases (at least one syntax, two logic and two runtime, with
 * different runtime kinds where possible), four of them followed by a technique question.
 */
export function planTriageRound(seed: number, difficulty: Difficulty, count = 10): TriageSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const specs: TriageSpec[] = [];
  for (let cycle = 0; specs.length < count; cycle++) {
    const types: ErrorType[] = shuffle(rng, ['syntax', 'logic', 'logic', 'runtime', 'runtime', pick(rng, ['syntax', 'logic', 'runtime'] as const)]);
    const followed = new Set(shuffle(rng, types.map((_, i) => i)).slice(0, ROUND_FOLLOW_UPS));
    const used = new Set<string>();
    const usedKinds = new Set<RuntimeKind>();
    types.forEach((type, i) => {
      const template = chooseTemplate(rng, type, difficulty, used, usedKinds);
      used.add(template);
      const kind = TEMPLATES[template].kind;
      if (kind) usedKinds.add(kind);
      const caseSeed = childSeed(seed, `${cycle}:${i}`);
      specs.push({ kind: 'classify', template, seed: caseSeed });
      if (followed.has(i)) specs.push({ kind: 'technique', template, seed: caseSeed, followUp: true });
    });
  }
  return specs.slice(0, count);
}

/** Game.generate: one self-contained item, a classification three times in four. */
export function generateTriageItem(seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'kind'));
  const kind: TriageKind = rng() < 0.75 ? 'classify' : 'technique';
  const type = pick(rng, ['syntax', 'logic', 'runtime'] as const);
  const template = chooseTemplate(rng, type, difficulty, new Set(), new Set());
  return triageItem({ kind, template, seed }, difficulty);
}
