/**
 * Game registry (owner: track B). Metadata is available without loading any game code, so `ls`,
 * `man` and tab completion stay instant; `load` dynamic-imports the game module.
 *
 * P0: deskcheck, sort, search, triage, validate, blitz, daily
 * P1: dfd, usecase, reqs, gantt, threat, law, naming, types, oop, psm
 * P2: boss, ux
 *
 * Shipped here: sort, search. Track B2 adds deskcheck, triage, validate, blitz and daily by
 * appending entries to GAMES (daily sets needsContent; generator games set generator: true).
 * The terminal's `daily` command runs `play daily` once a game with the id 'daily' is registered.
 */
import { DRILL_ID, DRILL_MAN, DRILL_SUMMARY, DRILL_TITLE } from './drill/meta';
import { SEARCH_ID, SEARCH_KK, SEARCH_MAN, SEARCH_SUMMARY, SEARCH_TITLE } from './search/meta';
import { SORT_ID, SORT_KK, SORT_MAN, SORT_SUMMARY, SORT_TITLE } from './sort/meta';
import type { GameMeta } from './types';

export const GAMES: GameMeta[] = [
  {
    id: SORT_ID,
    title: SORT_TITLE,
    priority: 'P0',
    kk: SORT_KK,
    summary: SORT_SUMMARY,
    man: SORT_MAN,
    generator: true,
    load: () => import('./sort').then((m) => m.default),
  },
  {
    id: SEARCH_ID,
    title: SEARCH_TITLE,
    priority: 'P0',
    kk: SEARCH_KK,
    summary: SEARCH_SUMMARY,
    man: SEARCH_MAN,
    generator: true,
    load: () => import('./search').then((m) => m.default),
  },
];

export function findGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}

/**
 * The Section A drill behind the terminal's `drill` command. It runs on the same host and engine as
 * the games but is started by `drill [kk|area]`, so it is not listed in GAMES (and not `play`-able).
 */
export const DRILL_GAME: GameMeta = {
  id: DRILL_ID,
  title: DRILL_TITLE,
  priority: 'P0',
  kk: [],
  summary: DRILL_SUMMARY,
  man: DRILL_MAN,
  needsContent: true,
  load: () => import('./drill').then((m) => m.default),
};
