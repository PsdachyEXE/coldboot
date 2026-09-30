/**
 * The daily challenge set (Section 6.12): ten items picked by the Melbourne calendar date, so every
 * student gets the same set on the same day: 8 content MCQs and 2 generated items. The terminal
 * `daily` game, step 3 of Today's run and the P1 Daily screen all build the set here.
 *
 * MCQs are chosen by rendezvous hashing (lowest hash of date + id), one per key knowledge point, so
 * adding or removing content mid-day changes at most the picks it touches instead of reshuffling
 * the whole set.
 */
import type { Mcq } from '../content/schema';
import { hashString, mix32 } from './prng';

export const DAILY_SIZE = 10;
export const DAILY_MCQS = 8;
/**
 * Games whose `generate` feeds the daily challenge: the P0 generators, then the P1 ones (psm has no
 * `generate`). Order matters only for tie-breaks. A day's two games are the two that rank lowest
 * for its date, so adding a game changes which games unstarted days draw on; a day already started
 * keeps its stored item ids.
 */
export const DAILY_GENERATOR_GAMES = [
  'deskcheck',
  'sort',
  'search',
  'triage',
  'validate',
  'dfd',
  'usecase',
  'reqs',
  'gantt',
  'threat',
  'law',
  'naming',
  'types',
  'oop',
] as const;
export type DailyGeneratorGame = (typeof DAILY_GENERATOR_GAMES)[number];

export type DailyItemRef =
  | { kind: 'mcq'; id: string }
  | { kind: 'generated'; id: string; gameId: DailyGeneratorGame; seed: number };

/**
 * The rendezvous rank of an id on a date. FNV-1a alone clusters ids that share a prefix (all of one
 * KK's MCQs), so the hash goes through an avalanche finaliser. Stored daily records keep their
 * item ids, so a change here never alters a set a student has already started.
 */
function rank(date: string, id: string): number {
  return mix32(hashString(`coldboot:daily:${date}:${id}`));
}

/** The fields of a content MCQ the daily set uses. `kk` spreads the picks across key knowledge. */
export type DailyMcq = Pick<Mcq, 'id'> & { readonly kk?: readonly string[] };

/**
 * Builds the day's ten items. `mcqPool` should be every standalone content MCQ (case study
 * questions excluded). When the pool has fewer than eight, generated items fill the gap.
 *
 * MCQs are taken in rank order, at most one per key knowledge point (an MCQ's first KK), so the
 * challenge ranges across the course instead of drilling one topic. Only when the pool covers fewer
 * than eight KKs does a KK get a second question. Adding or removing one MCQ still changes at most
 * one pick.
 */
export function buildDailySet(date: string, mcqPool: readonly DailyMcq[]): DailyItemRef[] {
  const ranked = [...mcqPool].sort((a, b) => rank(date, a.id) - rank(date, b.id) || (a.id < b.id ? -1 : 1));
  const picked: DailyMcq[] = [];
  const kks = new Set<string>();
  for (const m of ranked) {
    if (picked.length >= DAILY_MCQS) break;
    const kk = m.kk?.[0] ?? m.id;
    if (kks.has(kk)) continue;
    kks.add(kk);
    picked.push(m);
  }
  for (const m of ranked) {
    if (picked.length >= DAILY_MCQS) break;
    if (!picked.includes(m)) picked.push(m);
  }
  const mcqs = picked.map((m): DailyItemRef => ({ kind: 'mcq', id: m.id }));
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
