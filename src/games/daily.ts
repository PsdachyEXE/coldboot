/**
 * The daily challenge set (Section 6.12): ten items picked by the Melbourne calendar date, so every
 * student gets the same set on the same day: 8 content MCQs and 2 generated items. The terminal
 * `daily` game, step 3 of Today's run and the P1 Daily screen all build the set here.
 *
 * MCQs are chosen by rendezvous hashing (lowest hash of date + id), so adding or removing content
 * mid-day changes at most the picks it touches instead of reshuffling the whole set.
 */
import type { Mcq } from '../content/schema';
import { hashString } from './prng';

export const DAILY_SIZE = 10;
export const DAILY_MCQS = 8;
/** P0 games whose `generate` feeds the daily challenge. Order matters only for tie-breaks. */
export const DAILY_GENERATOR_GAMES = ['deskcheck', 'sort', 'search', 'triage', 'validate'] as const;
export type DailyGeneratorGame = (typeof DAILY_GENERATOR_GAMES)[number];

export type DailyItemRef =
  | { kind: 'mcq'; id: string }
  | { kind: 'generated'; id: string; gameId: DailyGeneratorGame; seed: number };

function rank(date: string, id: string): number {
  return hashString(`coldboot:daily:${date}:${id}`);
}

/**
 * Builds the day's ten items. `mcqPool` should be every standalone content MCQ (case study
 * questions excluded). When the pool has fewer than eight, generated items fill the gap.
 */
export function buildDailySet(date: string, mcqPool: readonly Pick<Mcq, 'id'>[]): DailyItemRef[] {
  const mcqs = [...mcqPool]
    .sort((a, b) => rank(date, a.id) - rank(date, b.id) || (a.id < b.id ? -1 : 1))
    .slice(0, DAILY_MCQS)
    .map((m): DailyItemRef => ({ kind: 'mcq', id: m.id }));
  const games = [...DAILY_GENERATOR_GAMES].sort((a, b) => rank(date, `game:${a}`) - rank(date, `game:${b}`));
  const generated: DailyItemRef[] = [];
  for (let i = 0; mcqs.length + generated.length < DAILY_SIZE; i++) {
    const gameId = games[i % games.length];
    const seed = hashString(`coldboot:daily:${date}:${gameId}:${i}`);
    generated.push({ kind: 'generated', id: `gen-daily-${gameId}:${seed}`, gameId, seed });
  }
  const all = [...mcqs, ...generated];
  return all.sort((a, b) => rank(date, `pos:${a.id}`) - rank(date, `pos:${b.id}`));
}

/** The share line: `COLDBOOT daily 2026-10-02  8/10` then one square per item (🟦 correct, ⬛ wrong). */
export function dailyShareText(date: string, results: readonly (0 | 1)[], total = DAILY_SIZE): string {
  const score = results.reduce<number>((sum, r) => sum + r, 0);
  const squares = results.map((r) => (r ? '🟦' : '⬛')).join('');
  return `COLDBOOT daily ${date}  ${score}/${total}\n${squares}`;
}
