/**
 * `law` items. Each scenario asks two things:
 * - act: which Act applies (the four Acts are always options A to D, and the names can be typed);
 * - why: why that Act applies, chosen from reasons about the scenario. Exactly one reason is true
 *   and belongs to that Act; the others are false for the scenario.
 *
 * Each item stands alone for the daily challenge. Instances ("law:why:state-school:seed=3:normal")
 * regenerate an item exactly through fromLawInstance.
 */
import type { KkId } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import { normaliseAnswer } from '../../lib/text';
import { matchOption, OPTION_LETTERS, parseOption } from '../answers';
import { childSeed, mulberry32, pick, sample, shuffle, type Rng } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { ACT_LABELS, ACTS, REASON_KEYS, REASONS, SCENARIOS, type Act, type LawScenario, type Level, type ReasonKey } from './bank';

export const LAW_KK: KkId[] = ['U4O2-KK07', 'U3O2-KK10'];

export const LAW_KINDS = ['act', 'why'] as const;
export type LawKind = (typeof LAW_KINDS)[number];

export type LawSpec = { kind: 'act'; scenario: string } | { kind: 'why'; scenario: string; seed: number; followUp?: boolean };

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];
const LEVELS: Record<Difficulty, readonly Level[]> = { easy: [1, 2], normal: [1, 2, 3], hard: [2, 3] };

export function scenariosFor(difficulty: Difficulty): readonly LawScenario[] {
  return SCENARIOS.filter((s) => LEVELS[difficulty].includes(s.level));
}

export function scenarioById(id: string): LawScenario {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown law scenario ${id}`);
  return s;
}

// ---------------------------------------------------------------------------
// Which Act
// ---------------------------------------------------------------------------

export const ACT_OPTIONS: readonly string[] = ACTS.map((a) => ACT_LABELS[a]);

const ACT_NAMES: readonly { value: Act; accept: readonly string[] }[] = [
  { value: 'privacy', accept: ['privacy act', 'privacy', 'commonwealth privacy act', 'federal privacy act', 'cth privacy act'] },
  { value: 'pdp', accept: ['privacy and data protection act', 'privacy and data protection', 'pdp act', 'pdp', 'pdpa', 'data protection act'] },
  { value: 'health', accept: ['health records act', 'health records', 'hra', 'hr act'] },
  { value: 'copyright', accept: ['copyright act', 'copyright'] },
];

/** An Act by letter, by full name, or by a short name: "privacy act", "PDP", "Health Records Act 2001". */
export function parseAct(input: string): Act | null {
  const byOption = parseOption(input, ACT_OPTIONS);
  if (byOption !== null) return ACTS[byOption];
  const s = normaliseAnswer(input)
    .replace(/\((cth|vic)\)/g, ' ')
    .replace(/\b(19|20)\d\d\b/g, ' ')
    .replace(/^the\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return matchOption(s, ACT_NAMES);
}

const ACT_HINT = 'Type a letter from A to D, or the name of the Act.';
export const ACT_CHIPS = ['A', 'B', 'C', 'D'];

function actLine(act: Act): string {
  return `${OPTION_LETTERS[ACTS.indexOf(act)]}. ${ACT_LABELS[act]}`;
}

export function actItem(scenarioId: string, difficulty: Difficulty): QuizItem {
  const s = scenarioById(scenarioId);
  const expected = actLine(s.act);
  return {
    id: 'gen-law-act',
    kk: LAW_KK,
    instance: `law:act:${s.id}:${difficulty}`,
    chips: ACT_CHIPS,
    prompt: [
      { kind: 'text', text: s.story },
      { kind: 'text', text: s.ask, tone: 'accent' },
      { kind: 'choices', options: [...ACT_OPTIONS], labels: 'letters' },
      { kind: 'text', text: ACT_HINT, tone: 'muted' },
    ],
    check(input) {
      const act = parseAct(input);
      if (!act) return { correct: false, expected, reason: ACT_HINT, counted: false };
      return { correct: act === s.act, expected, reason: s.why };
    },
  };
}

// ---------------------------------------------------------------------------
// Why
// ---------------------------------------------------------------------------

/** The one reason that is true for the scenario and belongs to its Act. */
export function trueReason(s: LawScenario): ReasonKey {
  const keys = REASON_KEYS.filter((k) => REASONS[k].act === s.act && REASONS[k].holds(s.facts));
  if (keys.length !== 1) throw new Error(`law scenario ${s.id} has ${keys.length} true reasons for its Act`);
  return keys[0];
}

/** Reasons that are false for the scenario: the only ones offered as wrong answers. */
export function falseReasons(s: LawScenario): ReasonKey[] {
  return REASON_KEYS.filter((k) => !REASONS[k].holds(s.facts));
}

/** The reasons a why question offers, in display order: the true one and two (easy) or three false ones. */
export function whyReasons(s: LawScenario, seed: number, difficulty: Difficulty): ReasonKey[] {
  const rng = mulberry32(childSeed(seed, 'reasons'));
  return shuffle(rng, [trueReason(s), ...sample(rng, falseReasons(s), difficulty === 'easy' ? 2 : 3)]);
}

export function whyItem(scenarioId: string, seed: number, difficulty: Difficulty, followUp = false): QuizItem {
  const s = scenarioById(scenarioId);
  const keys = whyReasons(s, seed, difficulty);
  const options = keys.map((k) => REASONS[k].text(s.subject));
  const answer = keys.indexOf(trueReason(s));
  const letters = OPTION_LETTERS.slice(0, options.length);
  const expected = `${letters[answer]}. ${options[answer]}`;
  const hint = `Type a letter from A to ${letters[letters.length - 1]}.`;
  const context: TerminalBlock = followUp ? { kind: 'text', text: `Same scenario: ${s.story}`, tone: 'muted' } : { kind: 'text', text: s.story };
  return {
    id: 'gen-law-why',
    kk: LAW_KK,
    instance: `law:${followUp ? 'follow-up' : 'why'}:${s.id}:seed=${seed}:${difficulty}`,
    chips: [...letters],
    prompt: [
      context,
      { kind: 'text', text: `The ${ACT_LABELS[s.act]} applies here. Why?`, tone: 'accent' },
      { kind: 'choices', options, labels: 'letters' },
      { kind: 'text', text: hint, tone: 'muted' },
    ],
    check(input) {
      const chosen = parseOption(input, options);
      if (chosen === null) return { correct: false, expected, reason: hint, counted: false };
      return { correct: chosen === answer, expected, reason: s.why };
    },
  };
}

// ---------------------------------------------------------------------------
// Rounds, instances and the generator
// ---------------------------------------------------------------------------

export function lawItem(spec: LawSpec, difficulty: Difficulty): QuizItem {
  return spec.kind === 'act' ? actItem(spec.scenario, difficulty) : whyItem(spec.scenario, spec.seed >>> 0, difficulty, spec.followUp);
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromLawInstance(instance: string): QuizItem | null {
  const act = /^law:act:([a-z0-9-]+):(easy|normal|hard)$/.exec(instance);
  if (act) return SCENARIOS.some((s) => s.id === act[1]) ? actItem(act[1], act[2] as Difficulty) : null;
  const why = /^law:(why|follow-up):([a-z0-9-]+):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (!why || !SCENARIOS.some((s) => s.id === why[2]) || !DIFFICULTIES.includes(why[4] as Difficulty)) return null;
  return whyItem(why[2], Number(why[3]), why[4] as Difficulty, why[1] === 'follow-up');
}

export const ROUND_SCENARIOS = 5;

/** n scenarios covering as many Acts as possible, with no more than two for any one Act. */
function pickScenarios(rng: Rng, difficulty: Difficulty, n: number): LawScenario[] {
  const pool = scenariosFor(difficulty);
  const acts = shuffle(rng, ACTS);
  const chosen: LawScenario[] = [];
  for (let i = 0; chosen.length < n && i < n * ACTS.length; i++) {
    const act = acts[i % acts.length];
    const unused = pool.filter((s) => s.act === act && !chosen.includes(s));
    if (unused.length && chosen.filter((s) => s.act === act).length < 2) chosen.push(pick(rng, unused));
  }
  return shuffle(rng, chosen);
}

/** A round of `count` items: five scenarios, each asked as which Act, then why it applies. */
export function planLawRound(seed: number, difficulty: Difficulty, count = 10): LawSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const specs: LawSpec[] = [];
  for (let cycle = 0; specs.length < count; cycle++) {
    pickScenarios(rng, difficulty, ROUND_SCENARIOS).forEach((s, i) => {
      specs.push({ kind: 'act', scenario: s.id }, { kind: 'why', scenario: s.id, seed: childSeed(seed, `${cycle}:${i}`), followUp: true });
    });
  }
  return specs.slice(0, count);
}

/** Game.generate: one self-contained item, which Act three times in five. */
export function generateLawItem(seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'kind'));
  const kind: LawKind = rng() < 0.6 ? 'act' : 'why';
  const scenario = pick(rng, scenariosFor(difficulty)).id;
  return kind === 'act' ? actItem(scenario, difficulty) : whyItem(scenario, seed >>> 0, difficulty);
}
