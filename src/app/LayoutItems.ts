/** Navigation labels, phone tab groupings and page titles for the shell. */
import { RAIL, paths, type PathName } from './paths';

const LABELS: Record<PathName, string> = {
  home: 'Home',
  welcome: 'Welcome',
  run: "Today's run",
  review: 'Review',
  drill: 'Drill',
  written: 'Written',
  exam: 'Exam',
  map: 'Syllabus map',
  stats: 'Stats',
  daily: 'Daily challenge',
  terminal: 'Terminal',
  settings: 'Settings',
  about: 'About',
};

/** Tabs on a phone: the four daily destinations, then More. */
export const TAB_ITEMS: readonly PathName[] = ['home', 'review', 'drill', 'terminal'];

/** Behind More on a phone. */
export const MORE_ITEMS: readonly PathName[] = ['written', 'exam', 'map', 'stats', 'settings', 'about'];

/** The short navigation label ("Map"), from the rail where it has one. */
export function navLabel(name: PathName): string {
  return RAIL.find((r) => r.name === name)?.label ?? LABELS[name];
}

/** Page titles, e.g. "Review - COLDBOOT". Unknown paths are "Page not found - COLDBOOT". */
export function pageTitle(pathname: string): string {
  const entry = (Object.entries(paths) as [PathName, string][]).find(([, p]) => p === pathname);
  return `${entry ? LABELS[entry[0]] : 'Page not found'} - COLDBOOT`;
}
