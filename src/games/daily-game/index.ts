/**
 * The `daily` game (Section 6.12, P0 in the terminal). The set comes from buildDailySet(today,
 * content MCQs): eight content MCQs and two generated items, or more generated items when few
 * MCQs are installed. The session exposes its item ids, so the host calls beginDaily and then
 * recordDaily for each first attempt (docs/CONTRACTS.md).
 *
 * - A day already started resumes from the stored record: the same items, starting at the first
 *   unanswered one. Earlier answers count in the summary but are never asked again.
 * - A finished day isn't replayed for credit: the session is done at once and its summary shows
 *   the stored result, the share line built from the stored results, and the time until the next
 *   set (midnight in Melbourne).
 */
import type { ContentIndex } from '../../content/loader';
import type { Mcq } from '../../content/schema';
import { addDays, melbourneWallTimeToIso, parseInstant } from '../../lib/time';
import type { DailyRecord } from '../../state/session';
import type { TerminalBlock } from '../../terminal/blocks';
import { buildDailySet, DAILY_GENERATOR_GAMES, dailyShareText, type DailyGeneratorGame, type DailyItemRef } from '../daily';
import { createQuizSession, formatDuration, type QuizSession } from '../engine';
import { mcqItem } from '../mcq';
import { hashString } from '../prng';
import { findGame } from '../registry';
import type { Difficulty, Game, GameContext, QuizItem } from '../types';
import { DAILY_ID, DAILY_KK, DAILY_MAN, DAILY_TITLE } from './meta';

export type Generate = (seed: number, difficulty: Difficulty) => QuizItem;
export type Generators = Record<DailyGeneratorGame, Generate>;

/** Generated daily items use normal difficulty, so the set is the same for everyone. */
export const DAILY_DIFFICULTY: Difficulty = 'normal';

const GENERATED_ID = /^gen-daily-([a-z]+):(\d+)$/;

function standaloneMcq(content: ContentIndex | null, id: string): Mcq | null {
  const entry = content?.byId.get(id);
  return entry?.kind === 'mcq' && !entry.caseStudyId ? entry.item : null;
}

/**
 * The day's item references. A day already started keeps the ids stored in its record, so the
 * set can't shift under a student mid-day. A stored MCQ that is no longer installed is replaced
 * by a generated item in the same place (the record keeps its results by position).
 */
export function dailyRefs(today: string, content: ContentIndex | null, record: DailyRecord | null): { refs: DailyItemRef[]; replaced: number } {
  if (!record) return { refs: buildDailySet(today, content?.mcq ?? []), replaced: 0 };
  let replaced = 0;
  const refs = record.itemIds.map((id, i): DailyItemRef => {
    const gen = GENERATED_ID.exec(id);
    if (gen && (DAILY_GENERATOR_GAMES as readonly string[]).includes(gen[1])) {
      return { kind: 'generated', id, gameId: gen[1] as DailyGeneratorGame, seed: Number(gen[2]) };
    }
    if (standaloneMcq(content, id)) return { kind: 'mcq', id };
    replaced++;
    const gameId = DAILY_GENERATOR_GAMES[i % DAILY_GENERATOR_GAMES.length];
    const seed = hashString(`coldboot:daily:${today}:replacement:${i}`);
    return { kind: 'generated', id: `gen-daily-${gameId}:${seed}`, gameId, seed };
  });
  return { refs, replaced };
}

export function dailyItem(ref: DailyItemRef, content: ContentIndex | null, generators: Generators): QuizItem {
  if (ref.kind === 'mcq') {
    const mcq = standaloneMcq(content, ref.id);
    if (!mcq) throw new Error(`daily MCQ ${ref.id} isn't installed`);
    return mcqItem(mcq);
  }
  return { ...generators[ref.gameId](ref.seed, DAILY_DIFFICULTY), id: ref.id };
}

/** Milliseconds from `now` until the next Melbourne midnight after the day `today`. */
export function msUntilNextSet(today: string, now: number): number {
  const next = parseInstant(melbourneWallTimeToIso(addDays(today, 1), '00:00') ?? '');
  return Math.max(0, next - now);
}

function nextSetLine(ctx: GameContext): TerminalBlock {
  const wait = msUntilNextSet(ctx.today, ctx.now());
  return { kind: 'text', text: `The next set is ready in ${formatDuration(wait)}, at midnight in Melbourne.`, tone: 'muted' };
}

export function startDaily(ctx: GameContext, generators: Generators): QuizSession {
  const { refs, replaced } = dailyRefs(ctx.today, ctx.content, ctx.daily);
  const items = refs.map((ref) => dailyItem(ref, ctx.content, generators));
  const prior = (ctx.daily?.results ?? []).slice(0, items.length);
  const finished = prior.length >= items.length;
  const share = (results: readonly (0 | 1)[]) => dailyShareText(ctx.today, results, items.length);

  if (finished) {
    return createQuizSession({
      gameId: DAILY_ID,
      now: ctx.now,
      items,
      exposeItemIds: true,
      resumeScores: prior,
      summaryTitle: "You've already finished today's daily challenge",
      shareText: () => share(prior),
      summaryExtra: () => [{ kind: 'text', text: 'Only the first attempt counts, so this set is done for today.', tone: 'muted' }, nextSetLine(ctx)],
    });
  }

  const intro: TerminalBlock[] = [];
  if (prior.length) intro.push({ kind: 'text', text: `Carrying on from question ${prior.length + 1} of ${items.length}. Your earlier answers still count.`, tone: 'muted' });
  if (replaced) {
    intro.push({
      kind: 'text',
      text: `${replaced === 1 ? 'One question' : `${replaced} questions`} from today's set ${replaced === 1 ? 'is' : 'are'} no longer installed, so a generated question takes ${replaced === 1 ? 'its' : 'their'} place.`,
      tone: 'muted',
    });
  }
  // Only the first attempt counts: every answer moves on, and the results match the stored record.
  const session: QuizSession = createQuizSession({
    gameId: DAILY_ID,
    now: ctx.now,
    items,
    exposeItemIds: true,
    resumeScores: prior,
    intro,
    summaryTitle: 'Daily challenge complete',
    shareText: () => share(session.results.map((r) => (r.correct ? 1 : 0))),
    summaryExtra: () => [nextSetLine(ctx)],
  });
  return session;
}

export function createDailyGame(generators: Generators): Game {
  return {
    id: DAILY_ID,
    title: DAILY_TITLE,
    kk: DAILY_KK,
    man: DAILY_MAN,
    start: (ctx) => startDaily(ctx, generators),
  };
}

/** Loads the generator games the daily set draws on, through the registry. */
export async function loadGenerators(): Promise<Generators> {
  const entries = await Promise.all(
    DAILY_GENERATOR_GAMES.map(async (id) => {
      const meta = findGame(id);
      const game = meta ? await meta.load() : undefined;
      if (!game?.generate) throw new Error(`The daily challenge needs the ${id} game`);
      return [id, game.generate] as const;
    }),
  );
  return Object.fromEntries(entries) as Generators;
}

export async function loadDailyGame(): Promise<Game> {
  return createDailyGame(await loadGenerators());
}
