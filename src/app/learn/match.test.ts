import { describe, expect, it } from 'vitest';
import { connect, dealRound, isDeckCleared, isRoundDone, nextRound, roundSummary, shuffle, startGame, type MatchGame, type Rng } from './match';

/** A repeatable source of numbers: the same seed gives the same shuffles. */
function seeded(seed: number): Rng {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
const sorted = (ids: readonly string[]) => [...ids].sort();

/** Connects every pair still open in the round to its own definition. */
function finish(game: MatchGame): MatchGame {
  let g = game;
  for (const id of game.round.terms) g = connect(g, id, id).game;
  return g;
}

describe('shuffle', () => {
  it('keeps every item, leaves its input alone and repeats for the same seed', () => {
    const input = [...IDS];
    const once = shuffle(input, seeded(7));
    expect(input).toEqual(IDS);
    expect(sorted(once)).toEqual(IDS);
    expect(once).not.toEqual(IDS);
    expect(shuffle(input, seeded(7))).toEqual(once);
    expect(shuffle(input, seeded(8))).not.toEqual(once);
  });
});

describe('dealRound', () => {
  it('pairs the first terms in the queue with the same definitions, never in the same order', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const round = dealRound(IDS, [], 5, seeded(seed));
      expect(sorted(round.terms)).toEqual(['a', 'b', 'c', 'd', 'e']);
      expect(sorted(round.definitions)).toEqual(sorted(round.terms));
      expect(round.definitions).not.toEqual(round.terms);
      expect(round).toMatchObject({ matched: [], missed: [], misses: 0 });
    }
  });

  it('keeps two pairs crossed even when the shuffle would line them up', () => {
    // A source stuck at the top of its range leaves every shuffle in its starting order.
    const round = dealRound(['a', 'b'], [], 2, () => 0.999);
    expect(round.terms).toEqual(['a', 'b']);
    expect(round.definitions).toEqual(['b', 'a']);
  });

  it('tops a short round up with pairs already cleared', () => {
    const round = dealRound(['k', 'l'], ['a', 'b', 'c', 'd', 'e'], 5, seeded(3));
    expect(round.terms).toHaveLength(5);
    expect(round.terms).toEqual(expect.arrayContaining(['k', 'l']));
    expect(new Set(round.terms).size).toBe(5);
  });

  it('deals what there is when the whole deck is smaller than a round', () => {
    expect(sorted(dealRound(['a', 'b', 'c'], [], 5, seeded(1)).terms)).toEqual(['a', 'b', 'c']);
    expect(dealRound(['a'], [], 5, seeded(1))).toMatchObject({ terms: ['a'], definitions: ['a'] });
  });
});

describe('a game', () => {
  it('starts with every pair queued once and nothing cleared', () => {
    const game = startGame(IDS, 5, seeded(11));
    expect(sorted(game.queue)).toEqual(IDS);
    expect(game.cleared).toEqual([]);
    expect(game.finished).toBe(0);
    expect(game.round.terms).toHaveLength(5);
    expect(sorted(game.round.terms)).toEqual(sorted(game.queue.slice(0, 5)));
  });

  it('matches a term with its own definition and clears the pair', () => {
    const game = startGame(IDS, 5, seeded(11));
    const [id] = game.round.terms;
    const { game: next, result } = connect(game, id, id);
    expect(result).toBe('matched');
    expect(next.round.matched).toEqual([id]);
    expect(next.round.misses).toBe(0);
    expect(next.cleared).toEqual([id]);
    expect(next.queue).not.toContain(id);
    // The game passed in is never changed.
    expect(game.round.matched).toEqual([]);
  });

  it('counts a wrong definition as a miss and keeps the pair waiting, even once it is matched', () => {
    const game = startGame(IDS, 5, seeded(11));
    const [id, other] = game.round.terms;
    const missed = connect(game, id, other);
    expect(missed.result).toBe('miss');
    expect(missed.game.round).toMatchObject({ matched: [], missed: [id], misses: 1 });
    const again = connect(missed.game, id, other).game;
    expect(again.round).toMatchObject({ missed: [id], misses: 2 });

    const matched = connect(again, id, id);
    expect(matched.result).toBe('matched');
    expect(matched.game.round.matched).toEqual([id]);
    expect(matched.game.cleared).not.toContain(id);
    expect(matched.game.queue).toContain(id);
    // The definition it was wrongly joined to has no miss of its own.
    expect(connect(matched.game, other, other).game.cleared).toEqual([other]);
  });

  it('ignores anything already matched or outside the round', () => {
    const game = startGame(IDS, 5, seeded(11));
    const [id, other] = game.round.terms;
    const outside = game.queue[7];
    const matched = connect(game, id, id).game;
    expect(connect(matched, id, other)).toEqual({ game: matched, result: 'ignored' });
    expect(connect(matched, other, id)).toEqual({ game: matched, result: 'ignored' });
    expect(connect(matched, outside, other)).toEqual({ game: matched, result: 'ignored' });
    expect(connect(matched, other, outside)).toEqual({ game: matched, result: 'ignored' });
  });

  it('finishes a round when every pair is matched, and says how it went', () => {
    let game = startGame(IDS, 5, seeded(11));
    expect(isRoundDone(game.round)).toBe(false);
    expect(roundSummary(game.round)).toBe('0 of 5 matched, no misses');
    const [id, other] = game.round.terms;
    game = connect(game, id, other).game;
    expect(roundSummary(game.round)).toBe('0 of 5 matched, 1 miss');
    game = connect(game, other, id).game;
    game = finish(game);
    expect(isRoundDone(game.round)).toBe(true);
    expect(roundSummary(game.round)).toBe('5 of 5 matched, 2 misses');
  });

  it('brings missed pairs back in the next round, and clean ones not until the deck restarts', () => {
    let game = startGame(IDS, 5, seeded(11));
    const first = game.round.terms;
    const [slow, alsoSlow, wrong] = first;
    game = connect(game, slow, wrong).game;
    game = connect(game, alsoSlow, wrong).game;
    game = finish(game);
    const second = nextRound(game, 5, seeded(12));
    expect(second.finished).toBe(1);
    expect(second.round.terms).toHaveLength(5);
    expect(second.round.terms).toEqual(expect.arrayContaining([slow, alsoSlow]));
    for (const id of first.filter((x) => x !== slow && x !== alsoSlow)) expect(second.round.terms).not.toContain(id);
    expect(sorted(second.cleared)).toEqual(sorted(first.filter((x) => x !== slow && x !== alsoSlow)));
  });

  it('clears the deck in three clean rounds of five from twelve pairs, then deals it again', () => {
    let game = startGame(IDS, 5, seeded(21));
    game = finish(game);
    expect(isDeckCleared(game)).toBe(false);
    game = finish(nextRound(game, 5, seeded(22)));
    expect(game.cleared).toHaveLength(10);
    // Two pairs are left, so the last round is topped up with three already cleared.
    game = nextRound(game, 5, seeded(23));
    expect(game.round.terms).toHaveLength(5);
    expect(game.round.terms).toEqual(expect.arrayContaining(game.queue));
    game = finish(game);
    expect(isDeckCleared(game)).toBe(true);
    expect(sorted(game.cleared)).toEqual(IDS);

    const again = nextRound(game, 5, seeded(24));
    expect(sorted(again.queue)).toEqual(IDS);
    expect(again.cleared).toEqual([]);
    expect(again.finished).toBe(3);
    expect(isDeckCleared(again)).toBe(false);
  });

  it('puts a cleared pair back in the queue when it is missed in a topped-up round', () => {
    let game = startGame(IDS, 5, seeded(21));
    game = finish(game);
    game = finish(nextRound(game, 5, seeded(22)));
    game = nextRound(game, 5, seeded(23));
    const filler = game.round.terms.find((id) => !game.queue.includes(id))!;
    const other = game.round.terms.find((id) => id !== filler)!;
    expect(game.cleared).toContain(filler);
    game = connect(game, filler, other).game;
    expect(game.cleared).not.toContain(filler);
    expect(game.queue).toContain(filler);
    game = finish(game);
    expect(isDeckCleared(game)).toBe(false);
    expect(nextRound(game, 5, seeded(24)).round.terms).toContain(filler);
  });
});
