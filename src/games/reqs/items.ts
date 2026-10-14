/**
 * `reqs` items. A classify item shows one statement from an organisation and asks whether it is
 * a functional requirement, a non-functional requirement, a constraint or scope. A type item
 * follows a non-functional statement and asks which quality it concerns; a kind item follows a
 * constraint and asks which kind it is. Each item stands alone (a type or kind item says what the
 * statement is); instances ("reqs:classify:physio-c2:seed=4:normal") regenerate them exactly.
 */
import type { KkId } from '../../content/schema';
import { normaliseAnswer } from '../../lib/text';
import type { TerminalBlock } from '../../terminal/blocks';
import { matchOption } from '../answers';
import { childSeed, mulberry32, pick, shuffle, type Rng } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import {
  CONSTRAINT_KINDS,
  CORE_CONSTRAINT_KINDS,
  CORE_NFR_TYPES,
  NFR_TYPES,
  ORGANISATIONS,
  STATEMENTS,
  type Category,
  type ConstraintKind,
  type NfrType,
  type Statement,
} from './statements';

export const REQS_KINDS = ['classify', 'type', 'kind'] as const;
export type ReqsKind = (typeof REQS_KINDS)[number];

export interface ReqsSpec {
  kind: ReqsKind;
  statement: string;
  seed: number;
  /** A type or kind question straight after its statement in a round: it doesn't repeat the organisation. */
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
  usability: 'Usability',
  reliability: 'Reliability',
  portability: 'Portability',
  robustness: 'Robustness',
  maintainability: 'Maintainability',
};

export const KIND_LABELS: Record<ConstraintKind, string> = {
  economic: 'Economic',
  technical: 'Technical',
  social: 'Social',
  legal: 'Legal',
  usability: 'Usability',
};

export const CATEGORY_CHIPS = ['functional', 'non-functional', 'constraint', 'scope'];
export const TYPE_CHIPS: readonly string[] = [...NFR_TYPES];
export const KIND_CHIPS: readonly string[] = [...CONSTRAINT_KINDS];

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
  { value: 'usability', accept: ['usability', 'usable', 'ease of use', 'easy to use', 'user friendliness', 'user-friendly', 'user friendly'] },
  { value: 'reliability', accept: ['reliability', 'reliable', 'availability', 'available'] },
  { value: 'portability', accept: ['portability', 'portable'] },
  { value: 'robustness', accept: ['robustness', 'robust'] },
  { value: 'maintainability', accept: ['maintainability', 'maintainable', 'maintenance', 'modifiability', 'ease of maintenance'] },
];

const KIND_OPTIONS: readonly { value: ConstraintKind; accept: readonly string[] }[] = [
  { value: 'economic', accept: ['economic', 'economical', 'economics', 'cost', 'time', 'cost and time', 'time and cost', 'financial', 'money', 'budget'] },
  { value: 'technical', accept: ['technical', 'technological', 'technology', 'hardware', 'equipment', 'compatibility', 'capacity'] },
  { value: 'social', accept: ['social', 'expertise', 'user expertise', "users' expertise", 'level of expertise'] },
  { value: 'legal', accept: ['legal', 'law', 'legislation', 'privacy', 'copyright', 'intellectual property'] },
  { value: 'usability', accept: ['usability', 'accessibility', 'ease of use', 'usefulness'] },
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

/** "Usability", "robust" and "Maintainability" all parse. Null otherwise. */
export function parseNfrType(input: string): NfrType | null {
  return matchOption(strip(input), TYPE_OPTIONS);
}

/** "Economic", "an economic constraint", "legal" and "accessibility" all parse. Null otherwise. */
export function parseConstraintKind(input: string): ConstraintKind | null {
  return matchOption(strip(input).replace(/\s+constraints?$/, ''), KIND_OPTIONS);
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
const TYPE_HINT = 'Type usability, reliability, portability, robustness or maintainability.';
const KIND_HINT = 'Type economic, technical, social, legal or usability.';

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
      const note = chosen === s.category ? '' : ` ${whyNot(s, chosen)}`;
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
    'non-functional': "It isn't non-functional: it names something the solution does, not a quality such as reliability or ease of use.",
    constraint: "It isn't a constraint: it names something the solution does, not a limit on the project.",
    scope: "It isn't scope: scope sets the boundary of the whole solution, while this names one thing it must do.",
  },
  'non-functional': {
    functional: "It isn't functional: it doesn't add something the solution does; it says how well it must work.",
    'non-functional': '',
    constraint:
      "It isn't a constraint: a constraint limits the project from outside, such as a budget, a deadline, a law, the equipment available or the users' expertise. This is a quality of the solution itself.",
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

/** Usability is on both lists (the PSM's qualities and its constraints), so that mix-up gets its own line either way. */
const USABILITY_BOTH =
  "Usability can be a non-functional requirement too, but only when a line sets a target for the finished solution, such as a new user finishing a task within two minutes. This line describes users the design must allow for instead.";
const USABILITY_BOTH_NFR =
  'Usability can be a constraint too, but only when a line describes users the design must allow for, such as members who are colour-blind. This line sets a target for the finished solution instead.';

function whyNot(s: Statement, chosen: Category): string {
  if (s.kind === 'usability' && chosen === 'non-functional') return `${WHY_NOT.constraint['non-functional']} ${USABILITY_BOTH}`;
  if (s.type === 'usability' && chosen === 'constraint') return `${WHY_NOT['non-functional'].constraint} ${USABILITY_BOTH_NFR}`;
  return WHY_NOT[s.category][chosen];
}

/** The quality pair students mix up most, by the right quality then the chosen one. */
const TYPE_MIX_UPS: Partial<Record<NfrType, Partial<Record<NfrType, string>>>> = {
  robustness: { reliability: 'Reliability is about working correctly, time after time, in normal use; coping with something unexpected, such as bad input or a misused button, is robustness.' },
  reliability: { robustness: 'Robustness is about coping with something unexpected, such as bad input; working correctly, or being available, time after time is reliability.' },
};

/** The kinds of constraint that both describe users, by the right kind then the chosen one. */
const KIND_MIX_UPS: Partial<Record<ConstraintKind, Partial<Record<ConstraintKind, string>>>> = {
  social: { usability: "Usability constraints cover accessibility, usefulness and ease of use; how much expertise the users have is the social kind." },
  usability: { social: "Social constraints are about the users' level of expertise; a need such as accessibility is the usability kind." },
};

function followUpContext(s: Statement, followUp: boolean, what: string): TerminalBlock[] {
  return followUp
    ? [{ kind: 'text', text: `Follow-up on the same statement: "${s.text}"`, tone: 'muted' }]
    : [...statementBlocks(s), { kind: 'text', text: `This is ${what}.`, tone: 'muted' }];
}

export function typeItem(statementId: string, seed: number, difficulty: Difficulty, followUp = false): QuizItem {
  const s = statementById(statementId);
  if (s.category !== 'non-functional' || !s.type) throw new Error(`${statementId} is not a non-functional requirement`);
  const type = s.type;
  const expected = TYPE_LABELS[type];
  return {
    id: 'gen-reqs-type',
    // The five qualities are the PSM specifications' list; U3O2-KK05 names none.
    kk: ['U3O2-KK05', 'PSM'],
    instance: `reqs:${followUp ? 'type-next' : 'type'}:${s.id}:seed=${seed}:${difficulty}`,
    chips: [...TYPE_CHIPS],
    prompt: [
      ...followUpContext(s, followUp, 'a non-functional requirement'),
      { kind: 'text', text: 'Which quality does it concern?', tone: 'accent' },
      { kind: 'text', text: TYPE_HINT, tone: 'muted' },
    ],
    check(input) {
      const chosen = parseNfrType(input);
      if (!chosen) return { correct: false, expected, reason: TYPE_HINT, counted: false };
      const note = TYPE_MIX_UPS[type]?.[chosen];
      return { correct: chosen === type, expected, reason: note ? `${s.typeWhy!} ${note}` : s.typeWhy! };
    },
  };
}

export function kindItem(statementId: string, seed: number, difficulty: Difficulty, followUp = false): QuizItem {
  const s = statementById(statementId);
  if (s.category !== 'constraint' || !s.kind) throw new Error(`${statementId} is not a constraint`);
  const kind = s.kind;
  const expected = KIND_LABELS[kind];
  return {
    id: 'gen-reqs-kind',
    // Usability is a constraint in the PSM specifications, not in U3O2-KK06's list.
    kk: kind === 'usability' ? ['U3O2-KK06', 'PSM'] : ['U3O2-KK06'],
    instance: `reqs:${followUp ? 'kind-next' : 'kind'}:${s.id}:seed=${seed}:${difficulty}`,
    chips: [...KIND_CHIPS],
    prompt: [
      ...followUpContext(s, followUp, 'a constraint'),
      { kind: 'text', text: 'Which kind of constraint is it?', tone: 'accent' },
      { kind: 'text', text: KIND_HINT, tone: 'muted' },
    ],
    check(input) {
      const chosen = parseConstraintKind(input);
      if (!chosen) return { correct: false, expected, reason: KIND_HINT, counted: false };
      const note = KIND_MIX_UPS[kind]?.[chosen];
      return { correct: chosen === kind, expected, reason: note ? `${s.kindWhy!} ${note}` : s.kindWhy! };
    },
  };
}

export function reqsItem(spec: ReqsSpec, difficulty: Difficulty): QuizItem {
  const seed = spec.seed >>> 0;
  switch (spec.kind) {
    case 'classify':
      return classifyItem(spec.statement, seed, difficulty);
    case 'type':
      return typeItem(spec.statement, seed, difficulty, spec.followUp);
    case 'kind':
      return kindItem(spec.statement, seed, difficulty, spec.followUp);
  }
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromReqsInstance(instance: string): QuizItem | null {
  const m = /^reqs:(classify|type|type-next|kind|kind-next):([a-z]+-[a-z]\d+):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (!m || !STATEMENTS.some((s) => s.id === m[2]) || !DIFFICULTIES.includes(m[4] as Difficulty)) return null;
  const s = statementById(m[2]);
  const kind = m[1].replace('-next', '') as ReqsKind;
  if (kind === 'type' && s.category !== 'non-functional') return null;
  if (kind === 'kind' && s.category !== 'constraint') return null;
  return reqsItem({ kind, statement: m[2], seed: Number(m[3]), followUp: m[1].endsWith('-next') }, m[4] as Difficulty);
}

/**
 * Statements a difficulty may use: easy keeps to the qualities of VCAA's worked example and the
 * four kinds of constraint U3O2-KK06 lists.
 */
export function statementsFor(difficulty: Difficulty): Statement[] {
  if (difficulty !== 'easy') return [...STATEMENTS];
  return STATEMENTS.filter((s) => (!s.type || CORE_NFR_TYPES.includes(s.type)) && (!s.kind || CORE_CONSTRAINT_KINDS.includes(s.kind)));
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
 * A round of `count` items: seven statements (at least two non-functional, two constraints, one
 * functional and one scope), three of the non-functional ones and constraints each followed by a
 * question on its quality or kind, at least one of each.
 */
export function planReqsRound(seed: number, difficulty: Difficulty, count = 10): ReqsSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const pool = statementsFor(difficulty);
  const of = (c: Category) => pool.filter((s) => s.category === c);
  const specs: ReqsSpec[] = [];
  const used = new Set<string>();
  for (let cycle = 0; specs.length < count; cycle++) {
    const extra = pick(rng, ['functional', 'non-functional', 'constraint'] as const);
    const nfrs = take(rng, of('non-functional'), extra === 'non-functional' ? 3 : 2, difficulty, used);
    const constraints = take(rng, of('constraint'), extra === 'constraint' ? 3 : 2, difficulty, used);
    const chosen = [...nfrs, ...constraints, ...take(rng, of('functional'), extra === 'functional' ? 2 : 1, difficulty, used), ...take(rng, of('scope'), 1, difficulty, used)];
    // One quality and one kind question, then a third on either.
    const asked = new Set([nfrs[0].id, constraints[0].id, pick(rng, [...nfrs.slice(1), ...constraints.slice(1)]).id]);
    for (const [i, s] of shuffle(rng, chosen).entries()) {
      const itemSeed = childSeed(seed, `${cycle}:${i}`);
      specs.push({ kind: 'classify', statement: s.id, seed: itemSeed });
      if (asked.has(s.id)) specs.push({ kind: s.category === 'constraint' ? 'kind' : 'type', statement: s.id, seed: itemSeed, followUp: true });
    }
  }
  return specs.slice(0, count);
}

/** Game.generate: one self-contained item, a classification six times in ten. */
export function generateReqsItem(seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'kind'));
  const pool = statementsFor(difficulty);
  const roll = rng();
  if (roll < 0.6) return classifyItem(pick(rng, pool).id, seed, difficulty);
  if (roll < 0.8) return typeItem(pick(rng, pool.filter((s) => s.category === 'non-functional')).id, seed, difficulty);
  return kindItem(pick(rng, pool.filter((s) => s.category === 'constraint')).id, seed, difficulty);
}
