/**
 * Game registry (owner: track B). Metadata is available without loading any game code, so `ls`,
 * `man` and tab completion stay instant; `load` dynamic-imports the game module.
 *
 * P0: deskcheck, sort, search, triage, validate, blitz, daily
 * P1: dfd, usecase, reqs, gantt, threat, law, naming, types, oop, psm
 * P2: boss, ux
 *
 * GAMES lists the P0 games in the brief's order, then the P1 games in the brief's order; that is
 * the order `ls` prints. Games that need study content set needsContent; games with
 * Game.generate set generator: true. The terminal's `daily` command runs `play daily`.
 */
import { BLITZ_ID, BLITZ_KK, BLITZ_MAN, BLITZ_SUMMARY, BLITZ_TITLE } from './blitz/meta';
import { DAILY_ID, DAILY_KK, DAILY_MAN, DAILY_SUMMARY, DAILY_TITLE } from './daily-game/meta';
import { DFD_GAME_KK, DFD_ID, DFD_MAN, DFD_SUMMARY, DFD_TITLE } from './dfd/meta';
import { DESKCHECK_ID, DESKCHECK_KK, DESKCHECK_MAN, DESKCHECK_SUMMARY, DESKCHECK_TITLE } from './deskcheck/meta';
import { DRILL_ID, DRILL_MAN, DRILL_SUMMARY, DRILL_TITLE } from './drill/meta';
import { GANTT_GAME_KK, GANTT_ID, GANTT_MAN, GANTT_SUMMARY, GANTT_TITLE } from './gantt/meta';
import { PSM_ID, PSM_KK, PSM_MAN, PSM_SUMMARY, PSM_TITLE } from './psm/meta';
import { REQS_ID, REQS_KK, REQS_MAN, REQS_SUMMARY, REQS_TITLE } from './reqs/meta';
import { USECASE_GAME_KK, USECASE_ID, USECASE_MAN, USECASE_SUMMARY, USECASE_TITLE } from './usecase/meta';
import { SEARCH_ID, SEARCH_KK, SEARCH_MAN, SEARCH_SUMMARY, SEARCH_TITLE } from './search/meta';
import { SORT_ID, SORT_KK, SORT_MAN, SORT_SUMMARY, SORT_TITLE } from './sort/meta';
import { TRIAGE_ID, TRIAGE_KK, TRIAGE_MAN, TRIAGE_SUMMARY, TRIAGE_TITLE } from './triage/meta';
import { VALIDATE_ID, VALIDATE_KK, VALIDATE_MAN, VALIDATE_SUMMARY, VALIDATE_TITLE } from './validate/meta';
import type { GameMeta } from './types';

export const GAMES: GameMeta[] = [
  {
    id: DESKCHECK_ID,
    title: DESKCHECK_TITLE,
    priority: 'P0',
    kk: DESKCHECK_KK,
    summary: DESKCHECK_SUMMARY,
    man: DESKCHECK_MAN,
    generator: true,
    load: () => import('./deskcheck').then((m) => m.default),
  },
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
  {
    id: TRIAGE_ID,
    title: TRIAGE_TITLE,
    priority: 'P0',
    kk: TRIAGE_KK,
    summary: TRIAGE_SUMMARY,
    man: TRIAGE_MAN,
    generator: true,
    load: () => import('./triage').then((m) => m.default),
  },
  {
    id: VALIDATE_ID,
    title: VALIDATE_TITLE,
    priority: 'P0',
    kk: VALIDATE_KK,
    summary: VALIDATE_SUMMARY,
    man: VALIDATE_MAN,
    generator: true,
    load: () => import('./validate').then((m) => m.default),
  },
  {
    id: BLITZ_ID,
    title: BLITZ_TITLE,
    priority: 'P0',
    kk: BLITZ_KK,
    summary: BLITZ_SUMMARY,
    man: BLITZ_MAN,
    needsContent: true,
    fixedDifficulty: true,
    load: () => import('./blitz').then((m) => m.default),
  },
  {
    id: DAILY_ID,
    title: DAILY_TITLE,
    priority: 'P0',
    kk: DAILY_KK,
    summary: DAILY_SUMMARY,
    man: DAILY_MAN,
    needsContent: true,
    fixedDifficulty: true,
    // Loads the generator games the set draws on (daily-game/index.ts), then the game.
    load: () => import('./daily-game').then((m) => m.loadDailyGame()),
  },
  {
    id: DFD_ID,
    title: DFD_TITLE,
    priority: 'P1',
    kk: DFD_GAME_KK,
    summary: DFD_SUMMARY,
    man: DFD_MAN,
    generator: true,
    load: () => import('./dfd').then((m) => m.default),
  },
  {
    id: USECASE_ID,
    title: USECASE_TITLE,
    priority: 'P1',
    kk: USECASE_GAME_KK,
    summary: USECASE_SUMMARY,
    man: USECASE_MAN,
    generator: true,
    load: () => import('./usecase').then((m) => m.default),
  },
  {
    id: REQS_ID,
    title: REQS_TITLE,
    priority: 'P1',
    kk: REQS_KK,
    summary: REQS_SUMMARY,
    man: REQS_MAN,
    generator: true,
    load: () => import('./reqs').then((m) => m.default),
  },
  {
    id: GANTT_ID,
    title: GANTT_TITLE,
    priority: 'P1',
    kk: GANTT_GAME_KK,
    summary: GANTT_SUMMARY,
    man: GANTT_MAN,
    generator: true,
    load: () => import('./gantt').then((m) => m.default),
  },
  {
    id: PSM_ID,
    title: PSM_TITLE,
    priority: 'P1',
    kk: PSM_KK,
    summary: PSM_SUMMARY,
    man: PSM_MAN,
    needsContent: true,
    load: () => import('./psm').then((m) => m.default),
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
