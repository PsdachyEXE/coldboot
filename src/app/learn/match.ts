/**
 * Round logic for Learn's matching game (docs/LEARN.md, D-225). Pairs of a term and its definition
 * are dealt a few at a time. Connecting a term to the wrong definition counts a miss, and that pair
 * comes back in the next round. A pair is cleared once it is matched in a round without a miss;
 * when every pair has been cleared the deck is dealt again. Pure functions: no React, no storage.
 */

export interface MatchPair {
  id: string;
  term: string;
  definition: string;
}

/** A source of numbers from 0 up to (not including) 1, as Math.random is. */
export type Rng = () => number;

/** Pairs in a round on a wide screen, and below 720 px. */
export const ROUND_SIZE = 5;
export const ROUND_SIZE_NARROW = 4;

export interface MatchRound {
  /** Pair ids in the order their terms are listed. */
  terms: string[];
  /** Pair ids in the order their definitions are listed. */
  definitions: string[];
  /** Pairs connected correctly, in the order they were matched. */
  matched: string[];
  /** Pairs that have had at least one wrong connection this round. */
  missed: string[];
  misses: number;
}

export interface MatchGame {
  /** Pairs still to be matched without a miss, in the order they will be dealt. */
  queue: string[];
  /** Pairs matched without a miss since the deck was last dealt in full. */
  cleared: string[];
  round: MatchRound;
  /** Rounds finished so far. */
  finished: number;
}

export type ConnectResult = 'matched' | 'miss' | 'ignored';

/** A shuffled copy (Fisher-Yates). */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deals a round: the first `size` pairs waiting in the queue, topped up with pairs already cleared
 * when fewer are waiting, so the last round of a deck is as full as the others. The definitions
 * are never listed in the same order as their terms, or every line would run straight across.
 */
export function dealRound(queue: readonly string[], cleared: readonly string[], size: number, rng: Rng = Math.random): MatchRound {
  const picked = queue.slice(0, Math.max(1, size));
  if (picked.length < size) picked.push(...shuffle(cleared, rng).slice(0, size - picked.length));
  const terms = shuffle(picked, rng);
  let definitions = shuffle(picked, rng);
  if (definitions.length > 1 && definitions.every((id, i) => id === terms[i])) definitions = [...definitions.slice(1), definitions[0]];
  return { terms, definitions, matched: [], missed: [], misses: 0 };
}

export function startGame(pairIds: readonly string[], size: number, rng: Rng = Math.random): MatchGame {
  const queue = shuffle(pairIds, rng);
  return { queue, cleared: [], round: dealRound(queue, [], size, rng), finished: 0 };
}

/**
 * Connects a term to a definition. The right definition matches the pair, and clears it if it had
 * no miss this round. A wrong one counts a miss against the term's pair, which then waits in the
 * queue for the next round. Anything already matched, or not in this round, is ignored.
 */
export function connect(game: MatchGame, termId: string, definitionId: string): { game: MatchGame; result: ConnectResult } {
  const { round } = game;
  const open = (id: string) => !round.matched.includes(id);
  if (!round.terms.includes(termId) || !round.definitions.includes(definitionId) || !open(termId) || !open(definitionId)) return { game, result: 'ignored' };

  if (termId !== definitionId) {
    return {
      result: 'miss',
      game: {
        ...game,
        queue: game.queue.includes(termId) ? game.queue : [...game.queue, termId],
        cleared: game.cleared.filter((id) => id !== termId),
        round: { ...round, misses: round.misses + 1, missed: round.missed.includes(termId) ? round.missed : [...round.missed, termId] },
      },
    };
  }

  const clean = !round.missed.includes(termId);
  return {
    result: 'matched',
    game: {
      ...game,
      queue: clean ? game.queue.filter((id) => id !== termId) : game.queue,
      cleared: clean && !game.cleared.includes(termId) ? [...game.cleared, termId] : game.cleared,
      round: { ...round, matched: [...round.matched, termId] },
    },
  };
}

/** Every pair in the round has been matched. */
export function isRoundDone(round: MatchRound): boolean {
  return round.matched.length === round.terms.length;
}

/** Every pair in the deck has been matched without a miss since it was last dealt in full. */
export function isDeckCleared(game: MatchGame): boolean {
  return game.queue.length === 0;
}

/**
 * The round after a finished one. Pairs missed in it are dealt first, so they come straight back;
 * once the whole deck is cleared, it is shuffled and dealt again from the start.
 */
export function nextRound(game: MatchGame, size: number, rng: Rng = Math.random): MatchGame {
  if (isDeckCleared(game)) {
    const queue = shuffle(game.cleared, rng);
    return { queue, cleared: [], round: dealRound(queue, [], size, rng), finished: game.finished + 1 };
  }
  const missed = game.round.missed.filter((id) => game.queue.includes(id));
  const queue = [...missed, ...game.queue.filter((id) => !missed.includes(id))];
  return { queue, cleared: game.cleared, round: dealRound(queue, game.cleared, size, rng), finished: game.finished + 1 };
}

/** "5 of 5 matched, 1 miss" (or "no misses"). */
export function roundSummary(round: MatchRound): string {
  const misses = round.misses === 0 ? 'no misses' : round.misses === 1 ? '1 miss' : `${round.misses} misses`;
  return `${round.matched.length} of ${round.terms.length} matched, ${misses}`;
}
