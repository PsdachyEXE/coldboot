/**
 * `reqs` items. A classify item shows one statement from an organisation and asks whether it is
 * a functional requirement, a non-functional requirement, a constraint or scope. A type item
 * follows a non-functional statement and asks which quality it concerns. Each item stands alone
 * (a type item says the statement is non-functional); instances ("reqs:classify:physio-c2:
 * seed=4:normal") regenerate them exactly.
 */
import type { KkId } from '../../content/schema';
import { normaliseAnswer } from '../../lib/text';
import type { TerminalBlock } from '../../terminal/blocks';
import { matchOption } from '../answers';
import { childSeed, mulberry32, pick, shuffle, type Rng } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { CORE_NFR_TYPES, ORGANISATIONS, STATEMENTS, type Category, type NfrType, type Statement } from './statements';

export const REQS_KINDS = ['classify', 'type'] as const;
export type ReqsKind = (typeof REQS_KINDS)[number];

export interface ReqsSpec {
  kind: ReqsKind;
  statement: string;
  seed: number;
  /** A type question straight after its statement in a round: it doesn't repeat the organisation. */
  followUp?: boolean;
}

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

const CATEGORY_KK: Record<Category, KkId> = {
  functional: 'U3O2-KK05',
  'non-functional': 'U3O2-KK05',
  constraint: 'U3O2-KK06',
  scope: 'U3O2-KK07',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  functional: 'Functional requirement',
  'non-functional': 'Non-functional requirement',
  constraint: 'Constraint',
  scope: 'Scope',
};

export const TYPE_LABELS: Record<NfrType, string> = {
  reliability: 'Reliability',
  usability: 'Usability',
  portability: 'Portability',
  efficiency: 'Efficiency (response time)',
  maintainability: 'Maintainability',
};

export const CATEGORY_CHIPS = ['functional', 'non-functional', 'constraint', 'scope'];
export const TYPE_CHIPS: readonly string[] = ['reliability', 'usability', 'portability', 'efficiency', 'maintainability'];

const CATEGORY_OPTIONS: readonly { value: Category; accept: readonly string[] }[] = [
  { value: 'functional', accept: ['functional', 'functional requirement', 'functional requirements', 'fr', 'function'] },
  {
    value: 'non-functional',
    accept: ['non-functional', 'non-functional requirement', 'non-functional requirements', 'nonfunctional', 'nfr', 'not functional', 'quality'],
  },
  { value: 'constraint', accept: ['constraint', 'constraints', 'limitation', 'a constraint'] },
  { value: 'scope', accept: ['scope', 'scope statement', 'in scope', 'out of scope', 'boundary'] },
];

const TYPE_OPTIONS: readonly { value: NfrType; accept: readonly string[] }[] = [
  { value: 'reliability', accept: ['reliability', 'reliable', 'availability', 'available'] },
  { value: 'usability', accept: ['usability', 'usable', 'ease of use', 'easy to use', 'user friendliness', 'user-friendly', 'user friendly'] },
  { value: 'portability', accept: ['portability', 'portable'] },
  { value: 'efficiency', accept: ['efficiency', 'efficient', 'response time', 'performance', 'speed', 'efficiency response time'] },
  { value: 'maintainability', accept: ['maintainability', 'maintainable', 'maintenance', 'modifiability', 'ease of maintenance'] },
];

function strip(input: string): string {
  return normaliseAnswer(input)
    .replace(/[()]/g, ' ')
    .replace(/^(it is|it's|its)\s+/, '')
    .replace(/^an?\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Non-functional", "NFR", "a constraint" and "Scope" all parse. Null otherwise. */
export function parseCategory(input: string): Category | null {
  return matchOption(strip(input), CATEGORY_OPTIONS);
}

/** "Usability", "response time" and "Efficiency (response time)" all parse. Null otherwise. */
export function parseNfrType(input: string): NfrType | null {
  return matchOption(strip(input), TYPE_OPTIONS);
}

export function statementById(id: string): Statement {
  const s = STATEMENTS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown reqs statement ${id}`);
  return s;
}

function orgOf(s: Statement) {
  return ORGANISATIONS.find((o) => o.id === s.org)!;
}

function statementBlocks(s: Statement): TerminalBlock[] {
  const org = orgOf(s);
  return [
    { kind: 'text', text: `${org.name} is having ${org.project} built. Its project brief says:`, tone: 'muted' },
    { kind: 'text', text: `"${s.text}"` },
  ];
}

const CATEGORY_HINT = 'Type functional, non-functional, constraint or scope.';
const TYPE_HINT = 'Type reliability, usability, portability, efficiency or maintainability.';

export function classifyItem(statementId: string, seed: number, difficulty: Difficulty): QuizItem {
  const s = statementById(statementId);
  const expected = CATEGORY_LABELS[s.category];
  return {
    id: 'gen-reqs-classify',
    kk: [CATEGORY_KK[s.category], 'U3O1-KK02'],
    instance: `reqs:classify:${s.id}:seed=${seed}:${difficulty}`,
    chips: CATEGORY_CHIPS,
    prompt: [
      ...statementBlocks(s),
      { kind: 'text', text: 'Is this a functional requirement, a non-functional requirement, a constraint, or part of the scope?', tone: 'accent' },
      { kind: 'text', text: CATEGORY_HINT, tone: 'muted' },
    ],
    check(input) {
      const chosen = parseCategory(input);
      if (!chosen) return { correct: false, expected, reason: CATEGORY_HINT, counted: false };
      const note = chosen === s.category ? '' : ` ${WHY_NOT[s.category][chosen]}`;
      return { correct: chosen === s.category, expected, reason: `${s.why}${note}` };
    },
  };
}

/**
 * Why the category a student chose doesn't fit, by the right category then the chosen one. These
 * teach the classic confusions, above all constraint versus non-functional requirement.
 */
export const WHY_NOT: Record<Category, Record<Category, string>> = {
  functional: {
    functional: '',
    'non-functional': "It isn't non-functional: it names something the solution does, not a quality such as speed or ease of use.",
    constraint: "It isn't a constraint: it names something the solution does, not a limit on the project.",
    scope: "It isn't scope: scope sets the boundary of the whole solution, while this names one thing it must do.",
  },
  'non-functional': {
    functional: "It isn't functional: it doesn't add something the solution does; it says how well it must work.",
    'non-functional': '',
    constraint:
      "It isn't a constraint: a constraint limits the project from outside, such as a budget, a deadline, a law or equipment it must use. This is a quality of the solution itself.",
    scope: "It isn't scope: it doesn't say what the solution will or won't cover; it says how well it must work.",
  },
  constraint: {
    functional: "It isn't functional: it doesn't describe anything the solution does.",
    'non-functional': "It isn't non-functional: that would be a quality of the finished solution that testing can measure. This limits the project instead.",
    constraint: '',
    scope: "It isn't scope: it doesn't say which features are in or out; it limits how the project can be done.",
  },
  scope: {
    functional: "It isn't a functional requirement: it sets a boundary on what the whole solution covers rather than naming one thing it must do.",
    'non-functional': "It isn't non-functional: it doesn't describe a quality; it says what the solution will or won't cover.",
    constraint: "It isn't a constraint: nothing outside the project forces it; the organisation has chosen what the solution will cover.",
    scope: '',
  },
};

export function typeItem(statementId: string, seed: number, difficulty: Difficulty, followUp = false): QuizItem {
  const s = statementById(statementId);
  if (s.category !== 'non-functional' || !s.type) throw new Error(`${statementId} is not a non-functional requirement`);
  const type = s.type;
  const expected = TYPE_LABELS[type];
  const context: TerminalBlock[] = followUp
    ? [{ kind: 'text', text: `Follow-up on the same statement: "${s.text}"`, tone: 'muted' }]
    : [...statementBlocks(s), { kind: 'text', text: 'This is a non-functional requirement.', tone: 'muted' }];
  return {
    id: 'gen-reqs-type',
    kk: ['U3O2-KK05'],
    instance: `reqs:${followUp ? 'follow-up' : 'type'}:${s.id}:seed=${seed}:${difficulty}`,
    chips: [...TYPE_CHIPS],
    prompt: [...context, { kind: 'text', text: 'Which quality does it concern?', tone: 'accent' }, { kind: 'text', text: TYPE_HINT, tone: 'muted' }],
    check(input) {
      const chosen = parseNfrType(input);
      if (!chosen) return { correct: false, expected, reason: TYPE_HINT, counted: false };
      return { correct: chosen === type, expected, reason: s.typeWhy! };
    },
  };
}

export function reqsItem(spec: ReqsSpec, difficulty: Difficulty): QuizItem {
  const seed = spec.seed >>> 0;
  return spec.kind === 'classify' ? classifyItem(spec.statement, seed, difficulty) : typeItem(spec.statement, seed, difficulty, spec.followUp);
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromReqsInstance(instance: string): QuizItem | null {
  const m = /^reqs:(classify|type|follow-up):([a-z]+-[a-z]\d+):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (!m || !STATEMENTS.some((s) => s.id === m[2]) || !DIFFICULTIES.includes(m[4] as Difficulty)) return null;
  const s = statementById(m[2]);
  if (m[1] !== 'classify' && s.category !== 'non-functional') return null;
  return reqsItem({ kind: m[1] === 'classify' ? 'classify' : 'type', statement: m[2], seed: Number(m[3]), followUp: m[1] === 'follow-up' }, m[4] as Difficulty);
}

/** Statements a difficulty may use: easy keeps to the support material's three qualities. */
export function statementsFor(difficulty: Difficulty): Statement[] {
  return STATEMENTS.filter((s) => difficulty !== 'easy' || !s.type || CORE_NFR_TYPES.includes(s.type));
}

function take(rng: Rng, pool: readonly Statement[], n: number, difficulty: Difficulty, used: Set<string>): Statement[] {
  const fresh = pool.filter((s) => !used.has(s.id));
  // --hard leans on the classic confusions; easy avoids them.
  const weight = (s: Statement) => (difficulty === 'hard' ? (s.tricky ? 0 : 1) : difficulty === 'easy' ? (s.tricky ? 1 : 0) : 0.5);
  const ordered = shuffle(rng, fresh.length >= n ? fresh : pool)
    .map((s) => ({ s, k: weight(s) + rng() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.s);
  const out = ordered.slice(0, n);
  for (const s of out) used.add(s.id);
  return out;
}

export const ROUND_STATEMENTS = 7;
export const ROUND_FOLLOW_UPS = 3;

/**
 * A round of `count` items: seven statements (three non-functional, each followed by a type
 * question, plus at least one functional, one constraint and one scope statement).
 */
export function planReqsRound(seed: number, difficulty: Difficulty, count = 10): ReqsSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const pool = statementsFor(difficulty);
  const of = (c: Category) => pool.filter((s) => s.category === c);
  const specs: ReqsSpec[] = [];
  const used = new Set<string>();
  for (let cycle = 0; specs.length < count; cycle++) {
    const extra = pick(rng, ['functional', 'constraint', 'constraint'] as const);
    const chosen = [
      ...take(rng, of('non-functional'), ROUND_FOLLOW_UPS, difficulty, used),
      ...take(rng, of('functional'), extra === 'functional' ? 2 : 1, difficulty, used),
      ...take(rng, of('constraint'), extra === 'constraint' ? 2 : 1, difficulty, used),
      ...take(rng, of('scope'), 1, difficulty, used),
    ];
    for (const [i, s] of shuffle(rng, chosen).entries()) {
      const itemSeed = childSeed(seed, `${cycle}:${i}`);
      specs.push({ kind: 'classify', statement: s.id, seed: itemSeed });
      if (s.category === 'non-functional') specs.push({ kind: 'type', statement: s.id, seed: itemSeed, followUp: true });
    }
  }
  return specs.slice(0, count);
}

/** Game.generate: one self-contained item, a classification seven times in ten. */
export function generateReqsItem(seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'kind'));
  const pool = statementsFor(difficulty);
  if (rng() < 0.7) return classifyItem(pick(rng, pool).id, seed, difficulty);
  return typeItem(pick(rng, pool.filter((s) => s.category === 'non-functional')).id, seed, difficulty);
}

