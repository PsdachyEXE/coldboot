/**
 * Route map (hash routing: GitHub Pages has no SPA fallback, so path routes would 404 on refresh).
 * Paths here are router paths; links render as `#/drill?kk=...`.
 */
import type { AreaId, KkId } from '../content/schema';

export const paths = {
  home: '/',
  welcome: '/welcome',
  run: '/run',
  review: '/review',
  drill: '/drill',
  written: '/written',
  exam: '/exam',
  map: '/map',
  stats: '/stats',
  daily: '/daily',
  terminal: '/terminal',
  settings: '/settings',
  about: '/about',
} as const;

export type PathName = keyof typeof paths;

/** Rail order (Section 9 layout). Daily, settings and about are reached from Home and the rail footer. */
export const RAIL: { name: PathName; label: string }[] = [
  { name: 'home', label: 'Home' },
  { name: 'review', label: 'Review' },
  { name: 'drill', label: 'Drill' },
  { name: 'written', label: 'Written' },
  { name: 'exam', label: 'Exam' },
  { name: 'map', label: 'Map' },
  { name: 'stats', label: 'Stats' },
  { name: 'terminal', label: 'Terminal' },
];

export type DrillMode = 'kk' | 'area' | 'weak' | 'random';

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const q = Object.entries(query).filter((e): e is [string, string] => e[1] !== undefined);
  return q.length ? `${path}?${new URLSearchParams(q).toString()}` : path;
}

/** `/drill?kk=U3O1-KK04`, `/drill?area=U3O2`, `/drill?mode=weak`, plus `&timed=1` for Section A pace. */
export function drillPath(opts: { kk?: KkId; area?: AreaId; mode?: 'weak' | 'random'; timed?: boolean } = {}): string {
  return withQuery(paths.drill, { kk: opts.kk, area: opts.area, mode: opts.mode, timed: opts.timed ? '1' : undefined });
}

/**
 * `/written?kk=...`, `/written?area=...`, or Section C practice on a case study:
 * `/written?cs=cs-01` (optionally `&q=cs-01-q03`), which shows the insert and figures beside the question.
 */
export function writtenPath(opts: { kk?: KkId; area?: AreaId; cs?: string; q?: string; mode?: 'weak' | 'random' } = {}): string {
  return withQuery(paths.written, { kk: opts.kk, area: opts.area, cs: opts.cs, q: opts.q, mode: opts.mode });
}

/** `/review?kk=U3O1-KK04`; `due: true` adds `due=1`, a review of the cards that are due with no new cards. */
export function reviewPath(opts: { kk?: KkId; due?: boolean } = {}): string {
  return withQuery(paths.review, { kk: opts.kk, due: opts.due ? '1' : undefined });
}

/**
 * Where a KK link goes to practise it: a focused drill, except the glossary (TERMS), which has
 * flashcards and blitz but no multiple-choice questions, so it opens Review on its cards.
 */
export function practisePath(kk: KkId): string {
  return kk === 'TERMS' ? reviewPath({ kk }) : drillPath({ kk });
}

export function examPath(opts: { mini?: boolean } = {}): string {
  return withQuery(paths.exam, { mini: opts.mini ? '1' : undefined });
}

/** Absolute href for a router path under hash routing. */
export function href(path: string): string {
  return `#${path}`;
}
