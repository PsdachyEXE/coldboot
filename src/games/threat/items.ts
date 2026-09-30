/**
 * `threat` items. Two kinds:
 * - match: a weakness in a development environment, then the control that best addresses it,
 *   chosen from lettered options (3, 4 or 5 by difficulty);
 * - e8: pick every Essential Eight strategy out of a list that mixes them with real security
 *   measures that aren't among the eight, by typing their letters.
 *
 * Each item stands alone for the daily challenge. Instances ("threat:match:leaver:seed=4:hard")
 * regenerate an item exactly through fromThreatInstance.
 */
import type { KkId } from '../../content/schema';
import { formatAnd, OPTION_LETTERS, parseLetters, parseOption } from '../answers';
import { childSeed, mulberry32, pick, randInt, sample, shuffle, type Rng } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { ALSO_HELPS, CONTROL_LABELS, CONTROLS, ESSENTIAL_EIGHT, NOT_ESSENTIAL_EIGHT, SCENARIOS, type Control, type ThreatScenario } from './bank';

export const MATCH_KK: KkId[] = ['U4O2-KK04', 'U4O2-KK03'];
export const E8_KK: KkId[] = ['U4O2-KK07'];

export const THREAT_KINDS = ['match', 'e8'] as const;
export type ThreatKind = (typeof THREAT_KINDS)[number];

export type ThreatSpec = { kind: 'match'; scenario: string; seed: number } | { kind: 'e8'; seed: number };

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

/** Options offered for a match question at each level. */
export const MATCH_OPTIONS: Record<Difficulty, number> = { easy: 3, normal: 4, hard: 5 };

/** Controls that are never offered as distractors for a scenario. */
export function arguable(s: ThreatScenario): Set<Control> {
  return new Set<Control>([s.control, ...ALSO_HELPS[s.control], ...(s.alsoHelps ?? [])]);
}

export function scenarioById(id: string): ThreatScenario {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown threat scenario ${id}`);
  return s;
}

/** The controls a match question offers, in display order: the answer and the distractors, shuffled. */
export function matchControls(s: ThreatScenario, seed: number, difficulty: Difficulty): Control[] {
  const rng = mulberry32(childSeed(seed, 'options'));
  const excluded = arguable(s);
  const pool = CONTROLS.filter((c) => !excluded.has(c));
  return shuffle(rng, [s.control, ...sample(rng, pool, MATCH_OPTIONS[difficulty] - 1)]);
}

export function matchItem(scenarioId: string, seed: number, difficulty: Difficulty): QuizItem {
  const s = scenarioById(scenarioId);
  const controls = matchControls(s, seed, difficulty);
  const options = controls.map((c) => CONTROL_LABELS[c]);
  const answer = controls.indexOf(s.control);
  const letters = OPTION_LETTERS.slice(0, options.length);
  const expected = `${letters[answer]}. ${options[answer]}`;
  const hint = `Type a letter from A to ${letters[letters.length - 1]}.`;
  return {
    id: 'gen-threat-match',
    kk: MATCH_KK,
    instance: `threat:match:${s.id}:seed=${seed}:${difficulty}`,
    chips: [...letters],
    prompt: [
      { kind: 'text', text: s.story },
      { kind: 'text', text: 'Which control best addresses this weakness?', tone: 'accent' },
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
// Essential Eight
// ---------------------------------------------------------------------------

/** How many options, and how many of them are Essential Eight strategies, at each level. */
export const E8_SHAPE: Record<Difficulty, { options: number; min: number; max: number }> = {
  easy: { options: 5, min: 2, max: 3 },
  normal: { options: 6, min: 3, max: 4 },
  hard: { options: 8, min: 4, max: 5 },
};

export interface E8List {
  options: string[];
  /** 0-based indexes of the Essential Eight strategies, ascending. */
  answer: number[];
}

export function e8List(seed: number, difficulty: Difficulty): E8List {
  const rng = mulberry32(childSeed(seed, 'e8'));
  const shape = E8_SHAPE[difficulty];
  const count = randInt(rng, shape.min, shape.max);
  const options = shuffle(rng, [...sample(rng, ESSENTIAL_EIGHT, count), ...sample(rng, NOT_ESSENTIAL_EIGHT, shape.options - count)]);
  const answer = options.flatMap((o, i) => ((ESSENTIAL_EIGHT as readonly string[]).includes(o) ? [i] : []));
  return { options, answer };
}

const E8_HINT = 'Type the letter of every Essential Eight strategy, such as A C D.';

export function e8Item(seed: number, difficulty: Difficulty): QuizItem {
  const { options, answer } = e8List(seed, difficulty);
  const letters = OPTION_LETTERS.slice(0, options.length);
  const expected = answer.map((i) => letters[i]).join(', ');
  const named = (indexes: readonly number[]) => formatAnd(indexes.map((i) => `${letters[i]} ${options[i]}`));
  const others = options.map((_, i) => i).filter((i) => !answer.includes(i));
  const reason = `The Essential Eight strategies here are ${named(answer)}. ${named(others)} ${others.length === 1 ? 'is a useful security measure' : 'are useful security measures'}, but not among the eight.`;
  return {
    id: 'gen-threat-e8',
    kk: E8_KK,
    instance: `threat:e8:seed=${seed}:${difficulty}`,
    prompt: [
      {
        kind: 'text',
        text: "Which of these are among the Essential Eight, the Australian Cyber Security Centre's mitigation strategies?",
        tone: 'accent',
      },
      { kind: 'choices', options, labels: 'letters' },
      { kind: 'text', text: `${E8_HINT} Some options are useful security measures that aren't among the eight.`, tone: 'muted' },
    ],
    check(input) {
      const picked = parseLetters(input, options.length);
      if (!picked) return { correct: false, expected, reason: `${E8_HINT} The letters run from A to ${letters[letters.length - 1]}.`, counted: false };
      const missed = answer.filter((i) => !picked.includes(i));
      const extra = picked.filter((i) => !answer.includes(i));
      const correct = !missed.length && !extra.length;
      if (correct) return { correct, expected, reason };
      const notes = [
        missed.length ? `You left out ${formatAnd(missed.map((i) => letters[i]))}.` : '',
        extra.length ? `${formatAnd(extra.map((i) => letters[i]))} ${extra.length === 1 ? "isn't" : "aren't"} one of the eight.` : '',
      ].filter(Boolean);
      return { correct, expected, reason: `${notes.join(' ')} ${reason}` };
    },
  };
}

// ---------------------------------------------------------------------------
// Rounds, instances and the generator
// ---------------------------------------------------------------------------

export function threatItem(spec: ThreatSpec, difficulty: Difficulty): QuizItem {
  return spec.kind === 'match' ? matchItem(spec.scenario, spec.seed >>> 0, difficulty) : e8Item(spec.seed >>> 0, difficulty);
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromThreatInstance(instance: string): QuizItem | null {
  const match = /^threat:match:([a-z0-9-]+):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (match) {
    if (!SCENARIOS.some((s) => s.id === match[1]) || !DIFFICULTIES.includes(match[3] as Difficulty)) return null;
    return matchItem(match[1], Number(match[2]), match[3] as Difficulty);
  }
  const e8 = /^threat:e8:seed=(\d+):(easy|normal|hard)$/.exec(instance);
  return e8 ? e8Item(Number(e8[1]), e8[2] as Difficulty) : null;
}

export const ROUND_MATCHES = 7;
export const ROUND_E8 = 3;

/** Scenarios for n match questions, from n different controls where possible. */
function pickScenarios(rng: Rng, n: number): ThreatScenario[] {
  const controls = shuffle(rng, CONTROLS);
  const chosen: ThreatScenario[] = [];
  for (let i = 0; chosen.length < n; i++) {
    const control = controls[i % controls.length];
    const unused = SCENARIOS.filter((s) => s.control === control && !chosen.includes(s));
    if (unused.length) chosen.push(pick(rng, unused));
  }
  return chosen;
}

/**
 * A round of `count` items: seven weaknesses to match, each needing a different control, and three
 * Essential Eight lists, shuffled so that two lists never come one after the other.
 */
export function planThreatRound(seed: number, _difficulty: Difficulty, count = 10): ThreatSpec[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const specs: ThreatSpec[] = [];
  for (let cycle = 0; specs.length < count; cycle++) {
    const matches: ThreatSpec[] = pickScenarios(rng, ROUND_MATCHES).map((s, i) => ({ kind: 'match', scenario: s.id, seed: childSeed(seed, `${cycle}:match:${i}`) }));
    const lists: ThreatSpec[] = Array.from({ length: ROUND_E8 }, (_, i) => ({ kind: 'e8', seed: childSeed(seed, `${cycle}:e8:${i}`) }));
    // Place each list after a different match question, never first and never side by side.
    const after = new Set(sample(rng, [0, 2, 4, 6], ROUND_E8));
    const cycleSpecs: ThreatSpec[] = [];
    matches.forEach((m, i) => {
      cycleSpecs.push(m);
      if (after.has(i)) cycleSpecs.push(lists.shift()!);
    });
    specs.push(...cycleSpecs);
  }
  return specs.slice(0, count);
}

/** Game.generate: one self-contained item, a weakness to match three times in four. */
export function generateThreatItem(seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'kind'));
  if (rng() < 0.25) return e8Item(seed >>> 0, difficulty);
  return matchItem(pick(rng, SCENARIOS).id, seed >>> 0, difficulty);
}
