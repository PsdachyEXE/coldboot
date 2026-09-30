/**
 * Game registry (owner: track B). Metadata is available without loading any game code, so `ls`,
 * `man` and tab completion stay instant; `load` dynamic-imports the game module.
 *
 * P0: deskcheck, sort, search, triage, validate, blitz, daily
 * P1: dfd, usecase, reqs, gantt, threat, law, naming, types, oop, psm
 * P2: boss, ux
 */
import type { GameMeta } from './types';

export const GAMES: GameMeta[] = [];

export function findGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}
