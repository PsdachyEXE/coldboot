/**
 * The `boss` game (Section 7.3, P2): three lives and 15 questions from every generator game, five
 * easy, five normal and five hard, then three self-marked short-answer questions from one case
 * study.
 *
 * The climb reads the registry (GAMES) for every game with `generate`, so a new generator game
 * joins it without a change here. It ends after 15 questions or when the last life goes. The case
 * study always follows and costs no lives. Each case study question takes two inputs: the
 * student's answer, which reveals the model answer and marking points without being recorded
 * (`advanced`), then the numbers of the points earned, recorded as marks over marks available
 * (`selfMarked`).
 */
import { writtenPath } from '../../app/paths';
import { suggestedLength } from '../../content/commandTerms';
import type { KkId } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import { formatDuration } from '../engine';
import { childSeed, mulberry32, shuffle } from '../prng';
import { GAMES } from '../registry';
import type { AnswerResult, Difficulty, Game, GameContext, GameSession, GameSummary, KkTally, QuizItem } from '../types';
import { markedScore, parseMarkedPoints, pickCaseSlice, questionFigures, type CaseSlice } from './caseSlice';
import { BOSS_ID, BOSS_KK, BOSS_MAN, BOSS_TITLE } from './meta';

export const BOSS_LIVES = 3;
export const BOSS_QUESTIONS = 15;
const LEVELS: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export type Generate = (seed: number, difficulty: Difficulty) => QuizItem;
export interface BossGenerator {
  id: string;
  generate: Generate;
}

export interface BossStep {
  gameId: string;
  difficulty: Difficulty;
  seed: number;
}

/** Easy for the first third of the climb, normal for the second, hard for the last. */
export function difficultyAt(index: number, count = BOSS_QUESTIONS): Difficulty {
  return LEVELS[Math.min(2, Math.floor((index * 3) / count))];
}

/**
 * The climb: the generator games in a seeded order (each once before any repeats), with the
 * difficulty rising in thirds. Each question has its own seed.
 */
export function planBoss(seed: number, gameIds: readonly string[], count = BOSS_QUESTIONS): BossStep[] {
  if (!gameIds.length) return [];
  const rng = mulberry32(childSeed(seed, 'boss-plan'));
  const order: string[] = [];
  while (order.length < count) order.push(...shuffle(rng, gameIds));
  return order.slice(0, count).map((gameId, i) => ({ gameId, difficulty: difficultyAt(i, count), seed: childSeed(seed, `boss:${i}`) }));
}

/** Questions survived: those answered with at least one life left afterwards. */
export function survived(answered: number, lives: number): number {
  return lives > 0 ? answered : Math.max(0, answered - 1);
}

const MARK_HINT = 'Type the numbers of the points your answer earned, such as 1 3, or type none or all.';
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const livesLeft = (n: number) => `${plural(n, 'life', 'lives')} left`;
const capNote = (marks: number): TerminalBlock => ({
  kind: 'text',
  text: `Some points are alternatives, so they add up to more than ${marks}. Your mark is capped at ${marks}.`,
  tone: 'muted',
});

export interface CaseResult {
  itemId: string;
  earned: number;
  marks: number;
}

export type BossPhase = 'climb' | 'case' | 'done';

export interface BossState {
  phase: BossPhase;
  lives: number;
  /** Climb questions answered (counted answers only). */
  answered: number;
  correct: number;
  plan: readonly BossStep[];
  /** The climb question waiting for an answer, or null outside the climb. */
  item: QuizItem | null;
  slice: CaseSlice | null;
  /** True while a case study question's marking points are showing. */
  marking: boolean;
  caseResults: readonly CaseResult[];
}

export interface BossSession extends GameSession {
  /** Where the round is (tests read it). */
  readonly state: BossState;
}

export function startBoss(ctx: GameContext, generators: readonly BossGenerator[], seed: number): BossSession {
  const byId = new Map(generators.map((g) => [g.id, g.generate]));
  const plan = planBoss(seed, generators.map((g) => g.id));
  const slice = pickCaseSlice(ctx.content?.caseStudies ?? [], seed);
  const items = new Map<number, QuizItem>();
  const perKk: Partial<Record<KkId, KkTally>> = {};
  const caseResults: CaseResult[] = [];
  const startedAt = ctx.now();
  let lastAnswerAt = startedAt;
  let phase: BossPhase = plan.length ? 'climb' : slice ? 'case' : 'done';
  let index = 0;
  let lives = BOSS_LIVES;
  let answered = 0;
  let correct = 0;
  let caseIndex = 0;
  let marking = false;
  let introShown = false;
  let caseIntroShown = false;
  let score = 0;
  let total = 0;

  const itemAt = (i: number): QuizItem => {
    let item = items.get(i);
    if (!item) {
      const step = plan[i];
      item = byId.get(step.gameId)!(step.seed, step.difficulty);
      items.set(i, item);
    }
    return item;
  };

  const tally = (kk: readonly KkId[], s: number) => {
    score += s;
    total++;
    for (const k of new Set(kk)) {
      const t = perKk[k] ?? { correct: 0, total: 0 };
      perKk[k] = { correct: t.correct + s, total: t.total + 1 };
    }
  };

  const caseMarks = () => (slice ? slice.questions.reduce((sum, q) => sum + q.marks, 0) : 0);

  /** Blocks that close the climb and say what comes next. */
  const endOfClimb = (): TerminalBlock[] => {
    const head =
      lives > 0
        ? `You survived all ${plural(plan.length, 'question')}, with ${livesLeft(lives)}.`
        : `Out of lives after question ${answered}: you survived ${plural(survived(answered, lives), 'question')}.`;
    if (slice) return [{ kind: 'text', text: `${head} Now the case study, which costs no lives.`, tone: 'accent' }];
    return [
      { kind: 'text', text: head, tone: 'accent' },
      { kind: 'text', text: 'No case study with three written questions is installed, so the round ends here.', tone: 'muted' },
    ];
  };

  const climbPrompt = (): TerminalBlock[] => {
    const blocks: TerminalBlock[] = [];
    if (!introShown) {
      introShown = true;
      blocks.push({
        kind: 'text',
        text: `Three lives and ${plural(plan.length, 'question')} from every game: easy first, then normal, then hard. Each wrong answer costs a life. ${
          slice ? 'Then three case study questions that you mark yourself, which cost no lives.' : ''
        }`.trim(),
        tone: 'muted',
      });
    }
    const step = plan[index];
    blocks.push(
      { kind: 'progress', current: index + 1, total: plan.length },
      { kind: 'text', text: `${capital(step.difficulty)} question from ${step.gameId}. ${capital(livesLeft(lives))}.`, tone: 'muted' },
      ...itemAt(index).prompt,
    );
    return blocks;
  };

  const caseIntro = (s: CaseSlice): TerminalBlock[] => [
    { kind: 'rule' },
    { kind: 'text', text: `Case study: ${s.caseStudy.title}`, tone: 'accent' },
    {
      kind: 'text',
      text: `Three written questions worth ${plural(caseMarks(), 'mark')}. Read the insert, then for each question write your answer and mark it against the marking points.`,
      tone: 'muted',
    },
    { kind: 'markdown', text: s.caseStudy.insert },
  ];

  const casePrompt = (): TerminalBlock[] => {
    const s = slice!;
    const q = s.questions[caseIndex];
    if (marking) {
      const available = q.points.reduce((sum, p) => sum + p.marks, 0);
      return [
        { kind: 'text', text: 'Model answer', tone: 'accent' },
        { kind: 'markdown', text: q.model },
        { kind: 'text', text: 'Marking points', tone: 'accent' },
        { kind: 'choices', options: q.points.map((p) => `${p.text} (${plural(p.marks, 'mark')})`), labels: 'numbers', markdown: true },
        ...(available > q.marks ? [capNote(q.marks)] : []),
        { kind: 'text', text: 'Which points did your answer earn?', tone: 'accent' },
        { kind: 'text', text: MARK_HINT, tone: 'muted' },
      ];
    }
    const blocks: TerminalBlock[] = [];
    if (!caseIntroShown) {
      caseIntroShown = true;
      blocks.push(...caseIntro(s));
    }
    blocks.push(
      { kind: 'progress', current: caseIndex + 1, total: s.questions.length, label: 'Case study question' },
      ...questionFigures(s.caseStudy, q).map((figure): TerminalBlock => ({ kind: 'figure', figure, compact: true })),
      { kind: 'markdown', text: q.prompt },
      { kind: 'text', text: `${capital(q.commandTerm)}, ${plural(q.marks, 'mark')}. ${suggestedLength(q.marks)}`, tone: 'accent' },
      { kind: 'text', text: 'Type your answer on one line and press Enter, or type skip to go straight to the marking points.', tone: 'muted' },
    );
    return blocks;
  };

  const climbAnswer = (input: string): AnswerResult => {
    const item = itemAt(index);
    const check = item.check(input);
    const base = { expected: check.expected, reason: check.reason, kk: item.kk, itemId: item.id, instance: item.instance, markdown: check.markdown };
    if (check.counted === false) return { ...base, correct: false, score: 0, counted: false };
    const s = Math.min(1, Math.max(0, check.score ?? (check.correct ? 1 : 0)));
    tally(item.kk, s);
    answered++;
    lastAnswerAt = ctx.now();
    const followUp: TerminalBlock[] = [...(check.followUp ?? [])];
    if (check.correct) correct++;
    else {
      lives--;
      followUp.push({ kind: 'text', text: lives > 0 ? `That costs a life: ${livesLeft(lives)}.` : 'That was your last life.', tone: 'accent' });
    }
    index++;
    if (lives === 0 || index >= plan.length) {
      followUp.push(...endOfClimb());
      phase = slice ? 'case' : 'done';
    }
    return { ...base, correct: check.correct, score: s, followUp };
  };

  const caseAnswer = (input: string): AnswerResult => {
    const q = slice!.questions[caseIndex];
    const base = { kk: [...q.kk], itemId: q.id, expected: '' };
    if (!marking) {
      // The answer isn't marked by the game: it moves on to the model answer and marking points.
      marking = true;
      return { ...base, correct: false, score: 0, counted: false, advanced: true, reason: '' };
    }
    const ticked = parseMarkedPoints(input, q.points.length);
    if (!ticked) return { ...base, correct: false, score: 0, counted: false, reason: `${MARK_HINT} The points run from 1 to ${q.points.length}.` };
    const { earned, score: s } = markedScore(q, ticked);
    tally(q.kk, s);
    lastAnswerAt = ctx.now();
    caseResults.push({ itemId: q.id, earned, marks: q.marks });
    marking = false;
    caseIndex++;
    if (caseIndex >= slice!.questions.length) phase = 'done';
    const followUp: TerminalBlock[] = [{ kind: 'text', text: `You gave yourself ${earned} of ${plural(q.marks, 'mark')}.`, tone: 'accent' }];
    if (q.mistake) followUp.push({ kind: 'markdown', text: `**A common mistake:** ${q.mistake}` });
    return { ...base, correct: earned === q.marks, score: s, reason: '', selfMarked: true, followUp };
  };

  const summaryBlocks = (): TerminalBlock[] => {
    const caseEarned = caseResults.reduce((sum, r) => sum + r.earned, 0);
    const rows: string[][] = [
      ['Questions survived', `${survived(answered, lives)} of ${plan.length}`],
      ['Lives left', `${lives} of ${BOSS_LIVES}`],
      ['Correct answers', `${correct} of ${answered}`],
      ['Case study', slice ? `${caseEarned} of ${plural(caseMarks(), 'mark')}` : 'None installed'],
    ];
    const blocks: TerminalBlock[] = [
      { kind: 'rule' },
      { kind: 'text', text: lives > 0 ? 'Boss round complete. You made it through the climb.' : 'Boss round complete.', tone: 'accent' },
      { kind: 'table', caption: 'Boss round results', columns: ['Result', 'Score'], rows },
      { kind: 'text', text: `Time: ${formatDuration(lastAnswerAt - startedAt)}.`, tone: 'muted' },
      { kind: 'text', text: 'Type play boss for a new climb.', tone: 'muted' },
    ];
    if (slice) blocks.push({ kind: 'link', label: `Practise more of the ${slice.caseStudy.title} case study`, to: writtenPath({ cs: slice.caseStudy.id }) });
    return blocks;
  };

  const session: BossSession = {
    get done() {
      return phase === 'done';
    },
    get progress() {
      if (phase === 'climb') return { current: index + 1, total: plan.length };
      if (phase === 'case') return { current: caseIndex + 1, total: slice!.questions.length };
      return undefined;
    },
    get state(): BossState {
      return { phase, lives, answered, correct, plan, item: phase === 'climb' ? itemAt(index) : null, slice, marking, caseResults: [...caseResults] };
    },
    prompt() {
      if (phase === 'climb') return climbPrompt();
      if (phase === 'case') return casePrompt();
      return [];
    },
    answer(input) {
      if (phase === 'climb') return climbAnswer(input);
      if (phase === 'case') return caseAnswer(input);
      return { correct: false, expected: '', reason: 'This round has finished.', kk: [], itemId: BOSS_ID, score: 0, counted: false };
    },
    chips() {
      if (phase === 'climb') return itemAt(index).chips ?? [];
      if (phase === 'case') return marking ? ['all', 'none'] : ['skip'];
      return [];
    },
    current() {
      if (phase === 'climb') {
        const item = itemAt(index);
        return { itemId: item.id, kk: item.kk, instance: item.instance };
      }
      if (phase === 'case') {
        const q = slice!.questions[caseIndex];
        return { itemId: q.id, kk: [...q.kk] };
      }
      return null;
    },
    summary(): GameSummary {
      return { gameId: BOSS_ID, score, total, ms: lastAnswerAt - startedAt, perKk: { ...perKk }, blocks: summaryBlocks() };
    },
  };
  return session;
}

export function createBossGame(generators: readonly BossGenerator[]): Game {
  return {
    id: BOSS_ID,
    title: BOSS_TITLE,
    kk: BOSS_KK,
    man: BOSS_MAN,
    start: (ctx, opts) => startBoss(ctx, generators, opts.seed),
  };
}

/** Every game in the registry with `generate`, loaded, in registry order. */
export async function loadBossGenerators(): Promise<BossGenerator[]> {
  const metas = GAMES.filter((g) => g.generator && g.id !== BOSS_ID);
  return Promise.all(
    metas.map(async (meta) => {
      const game = await meta.load();
      if (!game.generate) throw new Error(`The boss round needs ${meta.id} to generate questions`);
      return { id: meta.id, generate: game.generate.bind(game) };
    }),
  );
}

export async function loadBossGame(): Promise<Game> {
  return createBossGame(await loadBossGenerators());
}
