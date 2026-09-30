/**
 * Game registry (owner: track B). Metadata is available without loading any game code, so `ls`,
 * `man` and tab completion stay instant; `load` dynamic-imports the game module.
 *
 * P0: deskcheck, sort, search, triage, validate, blitz, daily
 * P1: dfd, usecase, reqs, gantt, threat, law, naming, types, oop, psm
 * P2: boss, ux
 *
 * GAMES lists the P0 games in the brief's order, then the P1 games, then the P2 games, each in the
 * brief's order; that is the order `ls` prints. Games that need study content set needsContent; games with
 * Game.generate set generator: true. The terminal's `daily` command runs `play daily`. boss draws on
 * every generator game but has no `generate` of its own, so it never feeds the daily challenge.
 */
import { BLITZ_ID, BLITZ_KK, BLITZ_MAN, BLITZ_SUMMARY, BLITZ_TITLE } from './blitz/meta';
import { BOSS_ID, BOSS_KK, BOSS_MAN, BOSS_SUMMARY, BOSS_TITLE } from './boss/meta';
import { DAILY_ID, DAILY_KK, DAILY_MAN, DAILY_SUMMARY, DAILY_TITLE } from './daily-game/meta';
import { DESKCHECK_ID, DESKCHECK_KK, DESKCHECK_MAN, DESKCHECK_SUMMARY, DESKCHECK_TITLE } from './deskcheck/meta';
import { DFD_GAME_KK, DFD_ID, DFD_MAN, DFD_SUMMARY, DFD_TITLE } from './dfd/meta';
import { DRILL_ID, DRILL_MAN, DRILL_SUMMARY, DRILL_TITLE } from './drill/meta';
import { GANTT_GAME_KK, GANTT_ID, GANTT_MAN, GANTT_SUMMARY, GANTT_TITLE } from './gantt/meta';
import { LAW_GAME_KK, LAW_ID, LAW_MAN, LAW_SUMMARY, LAW_TITLE } from './law/meta';
import { NAMING_GAME_KK, NAMING_ID, NAMING_MAN, NAMING_SUMMARY, NAMING_TITLE } from './naming/meta';
import { OOP_GAME_KK, OOP_ID, OOP_MAN, OOP_SUMMARY, OOP_TITLE } from './oop/meta';
import { PSM_ID, PSM_KK, PSM_MAN, PSM_SUMMARY, PSM_TITLE } from './psm/meta';
import { REQS_ID, REQS_KK, REQS_MAN, REQS_SUMMARY, REQS_TITLE } from './reqs/meta';
import { SEARCH_ID, SEARCH_KK, SEARCH_MAN, SEARCH_SUMMARY, SEARCH_TITLE } from './search/meta';
import { SORT_ID, SORT_KK, SORT_MAN, SORT_SUMMARY, SORT_TITLE } from './sort/meta';
import { THREAT_GAME_KK, THREAT_ID, THREAT_MAN, THREAT_SUMMARY, THREAT_TITLE } from './threat/meta';
import { TRIAGE_ID, TRIAGE_KK, TRIAGE_MAN, TRIAGE_SUMMARY, TRIAGE_TITLE } from './triage/meta';
import { TYPES_GAME_KK, TYPES_ID, TYPES_MAN, TYPES_SUMMARY, TYPES_TITLE } from './types-game/meta';
import { USECASE_GAME_KK, USECASE_ID, USECASE_MAN, USECASE_SUMMARY, USECASE_TITLE } from './usecase/meta';
import { UX_GAME_KK, UX_ID, UX_MAN, UX_SUMMARY, UX_TITLE } from './ux/meta';
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
    id: THREAT_ID,
    title: THREAT_TITLE,
    priority: 'P1',
    kk: THREAT_GAME_KK,
    summary: THREAT_SUMMARY,
    man: THREAT_MAN,
    generator: true,
    load: () => import('./threat').then((m) => m.default),
  },
  {
    id: LAW_ID,
    title: LAW_TITLE,
    priority: 'P1',
    kk: LAW_GAME_KK,
    summary: LAW_SUMMARY,
    man: LAW_MAN,
    generator: true,
    load: () => import('./law').then((m) => m.default),
  },
  {
    id: NAMING_ID,
    title: NAMING_TITLE,
    priority: 'P1',
    kk: NAMING_GAME_KK,
    summary: NAMING_SUMMARY,
    man: NAMING_MAN,
    generator: true,
    load: () => import('./naming').then((m) => m.default),
  },
  {
    id: TYPES_ID,
    title: TYPES_TITLE,
    priority: 'P1',
    kk: TYPES_GAME_KK,
    summary: TYPES_SUMMARY,
    man: TYPES_MAN,
    generator: true,
    // types-game, because ./types is the game contract (src/games/types.ts).
    load: () => import('./types-game').then((m) => m.default),
  },
  {
    id: OOP_ID,
    title: OOP_TITLE,
    priority: 'P1',
    kk: OOP_GAME_KK,
    summary: OOP_SUMMARY,
    man: OOP_MAN,
    generator: true,
    load: () => import('./oop').then((m) => m.default),
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
  {
    id: BOSS_ID,
    title: BOSS_TITLE,
    priority: 'P2',
    kk: BOSS_KK,
    summary: BOSS_SUMMARY,
    man: BOSS_MAN,
    // The case study slice needs the study content; the climb always runs from easy to hard.
    needsContent: true,
    fixedDifficulty: true,
    // Loads every generator game the climb draws on (boss/index.ts), then the game.
    load: () => import('./boss').then((m) => m.loadBossGame()),
  },
  {
    id: UX_ID,
    title: UX_TITLE,
    priority: 'P2',
    kk: UX_GAME_KK,
    summary: UX_SUMMARY,
    man: UX_MAN,
    generator: true,
    load: () => import('./ux').then((m) => m.default),
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
