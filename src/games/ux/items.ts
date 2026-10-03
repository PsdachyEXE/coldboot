/**
 * `ux` items. Each mock-up has exactly one weakness, and two questions ask about it:
 * - which: the user experience characteristic that is weakest (affordance, interoperability,
 *   security or usability), answered by letter or by name;
 * - why: the reason, chosen from a short list. The other reasons are false claims about this
 *   screen, drawn from weaknesses of the other characteristics (and, on hard, one of the same
 *   characteristic), about elements the screen has wherever possible.
 *
 * In a round the why question follows its which question without reprinting the mock-up.
 * Standalone (the daily challenge, boss, reports), both show the mock-up. Instances such as
 * "ux:which:court:full-card:seed=12:normal" regenerate an item exactly through fromUxInstance.
 */
import type { KkId } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import { OPTION_LETTERS, parseOption } from '../answers';
import { childSeed, mulberry32, pick, shuffle } from '../prng';
import type { Difficulty, QuizItem } from '../types';
import { buildScreen, templateById, templatesFor, TEMPLATES, type UxScreen } from './templates';
import {
  CHARACTERISTIC_LABELS,
  CHARACTERISTIC_OF,
  CHARACTERISTICS,
  explanation,
  fixText,
  reasonText,
  rebuttal,
  weaknessesOf,
  whyNot,
  WEAKNESSES,
  type ScreenFacts,
  type Weakness,
} from './weakness';

export const UX_KK: KkId[] = ['U3O2-KK15'];

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

/** One mock-up: which template, which weakness, and the seed that varies its details. */
export interface UxSpec {
  template: string;
  weakness: Weakness;
  seed: number;
}

export type UxQuestion = { kind: 'which'; spec: UxSpec } | { kind: 'why'; spec: UxSpec; followUp?: boolean };

export function uxScreen(spec: UxSpec): UxScreen {
  return buildScreen(templateById(spec.template), spec.weakness, mulberry32(childSeed(spec.seed, 'screen')));
}

function instanceOf(kind: 'which' | 'why' | 'follow-up', spec: UxSpec, difficulty: Difficulty): string {
  return `ux:${kind}:${spec.template}:${spec.weakness}:seed=${spec.seed >>> 0}:${difficulty}`;
}

function setting(screen: UxScreen): TerminalBlock[] {
  return [
    { kind: 'text', text: screen.scenario, tone: 'muted' },
    { kind: 'figure', figure: screen.figure, compact: true },
  ];
}

// ---------------------------------------------------------------------------
// Which characteristic
// ---------------------------------------------------------------------------

export const CHARACTERISTIC_OPTIONS = CHARACTERISTICS.map((c) => CHARACTERISTIC_LABELS[c]);
const WHICH_HINT = "Type a letter from A to D, or the characteristic's name.";

export function whichItem(spec: UxSpec, difficulty: Difficulty): QuizItem {
  const screen = uxScreen(spec);
  const answer = CHARACTERISTICS.indexOf(CHARACTERISTIC_OF[spec.weakness]);
  const expected = `${OPTION_LETTERS[answer]}. ${CHARACTERISTIC_OPTIONS[answer]}`;
  const why = explanation(spec.weakness, screen.facts);
  return {
    id: 'gen-ux-which',
    kk: UX_KK,
    instance: instanceOf('which', spec, difficulty),
    chips: [...CHARACTERISTICS],
    prompt: [
      ...setting(screen),
      { kind: 'text', text: 'This design has one clear weakness. Which user experience characteristic is weakest?', tone: 'accent' },
      { kind: 'choices', options: CHARACTERISTIC_OPTIONS, labels: 'letters' },
      { kind: 'text', text: WHICH_HINT, tone: 'muted' },
    ],
    check(input) {
      const chosen = parseOption(input, CHARACTERISTIC_OPTIONS);
      if (chosen === null) return { correct: false, expected, reason: WHICH_HINT, counted: false };
      if (chosen === answer) return { correct: true, expected, reason: why };
      return { correct: false, expected, reason: `${whyNot(CHARACTERISTICS[chosen], spec.weakness, screen.facts)} ${why}` };
    },
  };
}

// ---------------------------------------------------------------------------
// Why
// ---------------------------------------------------------------------------

/** Reasons offered at each level, the right one included. */
export const REASON_COUNT: Record<Difficulty, number> = { easy: 3, normal: 4, hard: 5 };

/** True when a weakness's false claim can name an element this screen actually has. */
export function claimIsSpecific(w: Weakness, f: ScreenFacts): boolean {
  switch (w) {
    case 'flat-action':
      return f.buttons.length > 0;
    case 'hidden-tap':
      return f.photo !== undefined;
    case 'closed-export':
      return f.format?.direction === 'export';
    case 'closed-import':
      return f.format?.direction === 'import';
    case 'secret-shown':
      return f.secret !== undefined;
    case 'full-card':
      return f.card !== undefined;
    case 'tiny-targets':
      return f.small !== undefined;
    case 'long-form':
      return f.form !== undefined;
  }
}

/**
 * The weaknesses whose reasons are offered, in display order: the right one, one false claim from
 * each other characteristic (claims about elements on this screen first, when there isn't room for
 * all three), and on hard a false claim about the same characteristic.
 */
export function reasonChoices(spec: UxSpec, difficulty: Difficulty, facts: ScreenFacts): Weakness[] {
  const rng = mulberry32(childSeed(spec.seed, 'reasons'));
  const own = CHARACTERISTIC_OF[spec.weakness];
  const fromOthers = shuffle(
    rng,
    CHARACTERISTICS.filter((c) => c !== own).map((c) => {
      const all = weaknessesOf(c);
      const specific = all.filter((w) => claimIsSpecific(w, facts));
      return pick(rng, specific.length ? specific : all);
    }),
  ).sort((a, b) => Number(claimIsSpecific(b, facts)) - Number(claimIsSpecific(a, facts)));
  const hard = difficulty === 'hard';
  const distractors = fromOthers.slice(0, REASON_COUNT[difficulty] - 1 - (hard ? 1 : 0));
  if (hard) distractors.push(pick(rng, WEAKNESSES.filter((w) => w !== spec.weakness && CHARACTERISTIC_OF[w] === own)));
  return shuffle(rng, [spec.weakness, ...distractors]);
}

export function whyItem(spec: UxSpec, difficulty: Difficulty, followUp = false): QuizItem {
  const screen = uxScreen(spec);
  const choices = reasonChoices(spec, difficulty, screen.facts);
  const options = choices.map((w) => reasonText(w, screen.facts, w === spec.weakness));
  const answer = choices.indexOf(spec.weakness);
  const letters = OPTION_LETTERS.slice(0, options.length);
  const expected = `${letters[answer]}. ${options[answer]}`;
  const name = CHARACTERISTIC_LABELS[CHARACTERISTIC_OF[spec.weakness]].toLowerCase();
  const hint = `Type a letter from A to ${letters[letters.length - 1]}.`;
  const fix = fixText(spec.weakness, screen.facts);
  const context: TerminalBlock[] = followUp
    ? [{ kind: 'text', text: `Follow-up on the same mock-up: its weakest characteristic is ${name}.`, tone: 'muted' }]
    : [...setting(screen), { kind: 'text', text: `The weakest user experience characteristic of this design is ${name}.`, tone: 'muted' }];
  return {
    id: 'gen-ux-why',
    kk: UX_KK,
    instance: instanceOf(followUp ? 'follow-up' : 'why', spec, difficulty),
    chips: [...letters],
    prompt: [...context, { kind: 'text', text: 'Which reason explains why?', tone: 'accent' }, { kind: 'choices', options, labels: 'letters' }, { kind: 'text', text: hint, tone: 'muted' }],
    check(input) {
      const chosen = parseOption(input, options);
      if (chosen === null) return { correct: false, expected, reason: hint, counted: false };
      if (chosen === answer) return { correct: true, expected, reason: fix };
      return { correct: false, expected, reason: `That isn't true of this screen: ${lower(rebuttal(choices[chosen], screen.facts))} ${fix}` };
    },
  };
}

function lower(s: string): string {
  return /^"/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Rounds, instances and the generator
// ---------------------------------------------------------------------------

export function uxItem(q: UxQuestion, difficulty: Difficulty): QuizItem {
  return q.kind === 'which' ? whichItem(q.spec, difficulty) : whyItem(q.spec, difficulty, q.followUp);
}

/** Regenerates an item from its instance string, or returns null when the string isn't one. */
export function fromUxInstance(instance: string): QuizItem | null {
  const m = /^ux:(which|why|follow-up):([a-z-]+):([a-z-]+):seed=(\d+):(easy|normal|hard)$/.exec(instance);
  if (!m) return null;
  const [, kind, template, weakness, seed, difficulty] = m;
  const t = TEMPLATES.find((x) => x.id === template);
  if (!t || !(WEAKNESSES as readonly string[]).includes(weakness) || !t.weaknesses.includes(weakness as Weakness)) return null;
  if (!DIFFICULTIES.includes(difficulty as Difficulty)) return null;
  const spec: UxSpec = { template, weakness: weakness as Weakness, seed: Number(seed) };
  const q: UxQuestion = kind === 'which' ? { kind: 'which', spec } : { kind: 'why', spec, followUp: kind === 'follow-up' };
  return uxItem(q, difficulty as Difficulty);
}

export const ROUND_SCREENS = 5;

/**
 * A round: five mock-ups, each a which question then its why follow-up. Every characteristic is
 * the answer at least once (one of them twice), and no template repeats within the five.
 */
export function planUxRound(seed: number, _difficulty: Difficulty, count = 10): UxQuestion[] {
  const rng = mulberry32(childSeed(seed, 'plan'));
  const questions: UxQuestion[] = [];
  const options = (c: (typeof CHARACTERISTICS)[number]) => weaknessesOf(c).flatMap((weakness) => templatesFor(weakness).map((template) => ({ weakness, template })));
  for (let cycle = 0; questions.length < count; cycle++) {
    // Characteristics with the fewest templates choose first, so every screen can be different.
    const answers = [...CHARACTERISTICS, pick(rng, CHARACTERISTICS)].sort((a, b) => options(a).length - options(b).length);
    const used = new Set<string>();
    const screens = answers.map((c, i): UxSpec => {
      const fresh = options(c).filter((o) => !used.has(o.template.id));
      const { weakness, template } = pick(rng, fresh.length ? fresh : options(c));
      used.add(template.id);
      return { template: template.id, weakness, seed: childSeed(seed, `${cycle}:${i}`) };
    });
    for (const spec of shuffle(rng, screens)) questions.push({ kind: 'which', spec }, { kind: 'why', spec, followUp: true });
  }
  return questions.slice(0, count);
}

/** Game.generate: one self-contained item, a which question seven times in ten. */
export function generateUxItem(seed: number, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(seed, 'kind'));
  const weakness = pick(rng, weaknessesOf(pick(rng, CHARACTERISTICS)));
  const spec: UxSpec = { template: pick(rng, templatesFor(weakness)).id, weakness, seed: seed >>> 0 };
  return rng() < 0.7 ? whichItem(spec, difficulty) : whyItem(spec, difficulty);
}
