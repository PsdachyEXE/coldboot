/**
 * `psm` items, built from the stages, activities and specification notes in content/psm.json:
 * - stage: which stage an activity belongs to (named, or described by its summary);
 * - spec: which stage's documentation shows a specification note;
 * - first: which of two activities from different stages comes first;
 * - order: three activities from different stages, in PSM order (hard).
 *
 * Only activities in different stages are ever compared: the methodology orders its stages, not
 * the activities inside one stage. Answers are stage names or numbers (1 analysis to 4
 * evaluation) and letters.
 */
import type { KkId, PsmFile, PsmStageId } from '../../content/schema';
import { PSM_STAGE_IDS } from '../../content/schema';
import { normaliseAnswer } from '../../lib/text';
import type { TerminalBlock } from '../../terminal/blocks';
import { LETTERS, parseChoice } from '../answers';
import { childSeed, mulberry32, pick, sample, shuffle, type Rng } from '../prng';
import type { Difficulty, QuizItem } from '../types';

export const PSM_ITEM_KK: KkId[] = ['PSM'];
export const PSM_KINDS = ['stage', 'spec', 'first', 'order'] as const;
export type PsmKind = (typeof PSM_KINDS)[number];

export interface Activity {
  id: string;
  name: string;
  summary: string;
  stage: PsmStageId;
}

export interface Spec {
  index: number;
  stage: PsmStageId;
  text: string;
}

export interface PsmBank {
  stageNames: Record<PsmStageId, string>;
  /** The first sentence of each stage's summary. */
  stageGists: Record<PsmStageId, string>;
  activities: Activity[];
  specs: Spec[];
}

export interface PsmSpec {
  kind: PsmKind;
  seed: number;
  /** For 'stage': show the activity's summary instead of its name. */
  described?: boolean;
}

const STAGE_WORDS: Record<PsmStageId, readonly string[]> = {
  analysis: ['analysis', 'analyse', 'analyze', 'analysing', 'analyzing', 'analysis stage'],
  design: ['design', 'designing', 'design stage'],
  development: ['development', 'develop', 'developing', 'dev', 'development stage'],
  evaluation: ['evaluation', 'evaluate', 'evaluating', 'eval', 'evaluation stage'],
};

/** "Design", "design stage", "2", "stage 2" and "the design stage" all parse. Null otherwise. */
export function parseStage(input: string): PsmStageId | null {
  const s = normaliseAnswer(input).replace(/^the\s+/, '');
  const n = /^(?:stage\s*)?([1-4])$/.exec(s);
  if (n) return PSM_STAGE_IDS[Number(n[1]) - 1];
  for (const id of PSM_STAGE_IDS) if (STAGE_WORDS[id].includes(s)) return id;
  return null;
}

/** The bank a game draws on, or null when the PSM content is missing or incomplete. */
export function psmBank(psm: PsmFile | null | undefined): PsmBank | null {
  if (!psm) return null;
  const stages = PSM_STAGE_IDS.map((id) => psm.stages.find((s) => s.id === id));
  if (stages.some((s) => !s || !s.activities.length)) return null;
  const stageNames = Object.fromEntries(stages.map((s) => [s!.id, s!.name])) as Record<PsmStageId, string>;
  const stageGists = Object.fromEntries(stages.map((s) => [s!.id, firstSentence(s!.summary)])) as Record<PsmStageId, string>;
  const activities = stages.flatMap((s) => s!.activities.map((a) => ({ id: a.id, name: a.name, summary: a.summary, stage: s!.id })));
  const specs = psm.specifications.flatMap((text, index): Spec[] => {
    const m = /^([A-Za-z]+):\s*(.+)$/s.exec(text.trim());
    const stage = m ? PSM_STAGE_IDS.find((id) => stageNames[id].toLowerCase() === m[1].toLowerCase()) : undefined;
    return m && stage ? [{ index, stage, text: capitalise(m[2]) }] : [];
  });
  return { stageNames, stageGists, activities, specs };
}

function firstSentence(text: string): string {
  const m = /^(.+?[.!?])(\s|$)/s.exec(text.trim());
  return m ? m[1] : text.trim();
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function stageNumber(id: PsmStageId): number {
  return PSM_STAGE_IDS.indexOf(id) + 1;
}

export const STAGE_CHIPS = ['Analysis', 'Design', 'Development', 'Evaluation'];
const STAGE_HINT = 'Type analysis, design, development or evaluation, or the stage number from 1 to 4.';

function stageLabel(bank: PsmBank, id: PsmStageId): string {
  return `${bank.stageNames[id]} (stage ${stageNumber(id)})`;
}

function stageQuestion(bank: PsmBank, answer: PsmStageId, reason: string): Pick<QuizItem, 'chips' | 'check'> {
  const expected = stageLabel(bank, answer);
  return {
    chips: STAGE_CHIPS,
    check(input) {
      const chosen = parseStage(input);
      if (!chosen) return { correct: false, expected, reason: STAGE_HINT, counted: false, markdown: true };
      return { correct: chosen === answer, expected, reason, markdown: true };
    },
  };
}

function base(kind: PsmKind, seed: number, difficulty: Difficulty, detail: string): Pick<QuizItem, 'id' | 'kk' | 'instance'> {
  return { id: `gen-psm-${kind}`, kk: PSM_ITEM_KK, instance: `psm:${kind}:${detail}:seed=${seed}:${difficulty}` };
}

function stageItem(bank: PsmBank, spec: PsmSpec, difficulty: Difficulty, rng: Rng): QuizItem {
  const activity = pick(rng, bank.activities);
  const stage = bank.stageNames[activity.stage];
  const shown: TerminalBlock = spec.described ? { kind: 'markdown', text: activity.summary } : { kind: 'text', text: activity.name };
  const reason = `${activity.name} is part of ${lower(stage)}. ${activity.summary}`;
  return {
    ...base('stage', spec.seed, difficulty, `${activity.id}${spec.described ? ':described' : ''}`),
    prompt: [
      { kind: 'text', text: spec.described ? 'A team member is doing this:' : 'Activity:', tone: 'muted' },
      shown,
      { kind: 'text', text: 'Which stage of the problem-solving methodology is this part of?', tone: 'accent' },
      { kind: 'text', text: STAGE_HINT, tone: 'muted' },
    ],
    ...stageQuestion(bank, activity.stage, reason),
  };
}

function specItem(bank: PsmBank, spec: PsmSpec, difficulty: Difficulty, rng: Rng): QuizItem {
  const note = pick(rng, bank.specs);
  const stage = bank.stageNames[note.stage];
  const reason = `The specifications for the problem-solving methodology list this under ${lower(stage)}. ${stage}: ${lower(bank.stageGists[note.stage])}`;
  return {
    ...base('spec', spec.seed, difficulty, `note-${note.index + 1}`),
    prompt: [
      { kind: 'text', text: 'A student is checking their project documentation against this note:', tone: 'muted' },
      { kind: 'markdown', text: note.text },
      { kind: 'text', text: "Which stage's documentation should show this?", tone: 'accent' },
      { kind: 'text', text: STAGE_HINT, tone: 'muted' },
    ],
    ...stageQuestion(bank, note.stage, reason),
  };
}

/** `n` activities from `n` different stages, in random order. */
function spread(bank: PsmBank, rng: Rng, n: number): Activity[] {
  const stages = sample(rng, [...PSM_STAGE_IDS], n);
  return stages.map((stage) => pick(rng, bank.activities.filter((a) => a.stage === stage)));
}

function placed(bank: PsmBank, a: Activity): string {
  return `${a.name} is part of ${lower(bank.stageNames[a.stage])} (stage ${stageNumber(a.stage)})`;
}

function firstItem(bank: PsmBank, spec: PsmSpec, difficulty: Difficulty, rng: Rng): QuizItem {
  const pair = spread(bank, rng, 2);
  const answer = stageNumber(pair[0].stage) < stageNumber(pair[1].stage) ? 0 : 1;
  const [early, late] = answer === 0 ? pair : [pair[1], pair[0]];
  const expected = `${LETTERS[answer]}. ${pair[answer].name}`;
  const reason = `${placed(bank, early)}, and ${lower(placed(bank, late))}.`;
  return {
    ...base('first', spec.seed, difficulty, pair.map((a) => a.id).join('+')),
    chips: ['A', 'B'],
    prompt: [
      { kind: 'text', text: 'Which of these comes first in the problem-solving methodology?', tone: 'accent' },
      { kind: 'choices', options: pair.map((a) => a.name), labels: 'letters' },
    ],
    check(input) {
      const chosen = parseChoice(input, 2);
      if (chosen === null) return { correct: false, expected, reason: 'Type A or B.', counted: false };
      return { correct: chosen === answer, expected, reason };
    },
  };
}

/** Letters typed leniently: "B A C", "b, a, c", "BAC" or "B-A-C". Null when a token isn't one of the letters. */
export function parseLetters(input: string, count: number): number[] | null {
  const allowed = LETTERS.slice(0, count).join('');
  const tokens = input
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean)
    .filter((t) => t !== 'THEN' && t !== 'AND');
  const out: number[] = [];
  for (const t of tokens) {
    if (![...t].every((c) => allowed.includes(c))) return null;
    out.push(...[...t].map((c) => allowed.indexOf(c)));
  }
  return out.length ? out : null;
}

function orderItem(bank: PsmBank, spec: PsmSpec, difficulty: Difficulty, rng: Rng): QuizItem {
  const shown = spread(bank, rng, 3);
  const order = shown.map((_, i) => i).sort((a, b) => stageNumber(shown[a].stage) - stageNumber(shown[b].stage));
  const expected = order.map((i) => LETTERS[i]).join(', ');
  const reason = `${order.map((i) => placed(bank, shown[i])).join('; ')}.`;
  const hint = 'Type the three letters in order, separated by spaces or commas.';
  return {
    ...base('order', spec.seed, difficulty, shown.map((a) => a.id).join('+')),
    prompt: [
      { kind: 'text', text: 'Put these activities in the order they happen in the problem-solving methodology.', tone: 'accent' },
      { kind: 'choices', options: shown.map((a) => a.name), labels: 'letters' },
      { kind: 'text', text: hint, tone: 'muted' },
    ],
    check(input) {
      const got = parseLetters(input, 3);
      if (!got || got.length !== 3 || new Set(got).size !== 3) return { correct: false, expected, reason: `Use each of A, B and C once. ${hint}`, counted: false };
      return { correct: got.every((v, i) => v === order[i]), expected, reason };
    },
  };
}

export function psmItem(bank: PsmBank, spec: PsmSpec, difficulty: Difficulty): QuizItem {
  const rng = mulberry32(childSeed(spec.seed >>> 0, spec.kind));
  switch (spec.kind) {
    case 'stage':
      return stageItem(bank, spec, difficulty, rng);
    case 'spec':
      return specItem(bank, spec, difficulty, rng);
    case 'first':
      return firstItem(bank, spec, difficulty, rng);
    case 'order':
      return orderItem(bank, spec, difficulty, rng);
  }
}

const MIX: Record<Difficulty, { stage: number; described: number; spec: number; first: number; order: number }> = {
  easy: { stage: 7, described: 0, spec: 0, first: 3, order: 0 },
  normal: { stage: 4, described: 2, spec: 2, first: 3, order: 1 },
  hard: { stage: 3, described: 3, spec: 3, first: 2, order: 2 },
};

/**
 * A round of `count` items in a seeded order. Stage questions are asked about different
 * activities where the bank allows.
 */
export function planPsmRound(bank: PsmBank, seed: number, difficulty: Difficulty, count = 10): PsmSpec[] {
  const mix = MIX[difficulty];
  const rng = mulberry32(childSeed(seed, 'plan'));
  const specs: PsmSpec[] = [];
  const kinds: PsmSpec[] = [
    ...Array.from({ length: mix.stage }, (_, i): PsmSpec => ({ kind: 'stage', seed: 0, described: i < mix.described })),
    ...Array.from({ length: mix.spec }, (): PsmSpec => ({ kind: bank.specs.length ? 'spec' : 'stage', seed: 0, described: true })),
    ...Array.from({ length: mix.first }, (): PsmSpec => ({ kind: 'first', seed: 0 })),
    ...Array.from({ length: mix.order }, (): PsmSpec => ({ kind: 'order', seed: 0 })),
  ];
  const seen = new Set<string>();
  for (let cycle = 0; specs.length < count; cycle++) {
    for (const [i, k] of shuffle(rng, kinds).entries()) {
      // Pick a seed whose item isn't a repeat of one already in the round (a few tries, then accept it).
      let chosen = childSeed(seed, `${cycle}:${i}`);
      for (let t = 0; t < 8; t++) {
        const candidate = childSeed(seed, `${cycle}:${i}:${t}`);
        const key = psmItem(bank, { ...k, seed: candidate }, difficulty).instance!.replace(/:seed=.*$/, '');
        chosen = candidate;
        if (!seen.has(key)) {
          seen.add(key);
          break;
        }
      }
      specs.push({ ...k, seed: chosen });
    }
  }
  return specs.slice(0, count);
}
