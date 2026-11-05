/**
 * Whether reloading the page now would lose nothing the student is in the middle of (D-223), so a
 * waiting update can be applied without asking. Only screens that keep no work in memory count:
 * Home, Learn, the map, Stats, Settings and About, with the terminal closed and no game under way.
 * A drill, a review, a written answer, a paper, a run step, the daily challenge or a terminal game
 * all hold something a reload would interrupt, so they wait for the prompt.
 */
import { useTerminal } from '../terminal/useTerminal';
import { useTerminalSession } from '../terminal/session';
import { paths } from './paths';

const QUIET_ROUTES: ReadonlySet<string> = new Set([paths.home, paths.learn, paths.map, paths.stats, paths.settings, paths.about]);

/** The route a location hash shows: "#/learn?kk=U3O1-KK04" is "/learn", and no hash is Home. */
export function routeOf(hash: string): string {
  return hash.replace(/^#/, '').split('?')[0] || paths.home;
}

export function canReloadNow(hash: string = window.location.hash): boolean {
  return QUIET_ROUTES.has(routeOf(hash)) && !useTerminal.getState().open && useTerminalSession.getState().game === null;
}
