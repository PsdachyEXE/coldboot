/**
 * Route table (hash router). Home and first run ship with the shell. Every other screen is its own
 * chunk: the games (inside the terminal), the exam, stats and the daily screen as the brief asks,
 * plus Today's run, Review, Drill, Written, the syllabus map, Settings and About. With the terminal
 * drawer deferred too (TerminalDrawerSlot), the first load leaves out Markdown and the figures.
 *
 * Navigation stays smooth two ways: the router updates in a transition and the Suspense boundary
 * round the Outlet (in Layout) is already showing, so the current page stays up while a chunk
 * loads; and prefetchScreens() fetches every lazy chunk once the shell is idle and the study
 * content has loaded (main.tsx), so usually there is nothing to wait for.
 */
import { createHashRouter, type RouteObject } from 'react-router';
import Layout from './Layout';
import { lazyComponent } from './lazyComponent';
import { paths } from './paths';
import Home from './screens/Home';
import FirstRun from './screens/FirstRun';
import NotFound from './screens/NotFound';
import RouteError from './screens/RouteError';

const screens = {
  review: lazyComponent(() => import('./screens/Review')),
  drill: lazyComponent(() => import('./screens/Drill')),
  run: lazyComponent(() => import('./screens/Run')),
  written: lazyComponent(() => import('./screens/Written')),
  map: lazyComponent(() => import('./screens/SyllabusMap')),
  settings: lazyComponent(() => import('./screens/Settings')),
  about: lazyComponent(() => import('./screens/About')),
  terminal: lazyComponent(() => import('../terminal/TerminalScreen')),
  exam: lazyComponent(() => import('../exam/ExamScreen')),
  stats: lazyComponent(() => import('./screens/Stats')),
  daily: lazyComponent(() => import('./screens/Daily')),
};

const Review = screens.review;
const Drill = screens.drill;
const Run = screens.run;
const Written = screens.written;
const SyllabusMap = screens.map;
const Settings = screens.settings;
const About = screens.about;
const TerminalScreen = screens.terminal;
const ExamScreen = screens.exam;
const Stats = screens.stats;
const Daily = screens.daily;

/**
 * Starts loading the chunk for the screen at `hashPath` (location.hash without the "#") when that
 * screen is lazy. main.tsx calls it before the first render: if the chunk is in by the time React
 * renders, the screen skips lazy() and its Suspense fallback (see lazyComponent). Never rejects; a
 * screen whose chunk failed to load retries and reports the failure itself.
 */
export function preloadScreen(hashPath: string): Promise<void> {
  let pathname = hashPath.split(/[?#]/)[0] ?? '';
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  const name = (Object.keys(screens) as (keyof typeof screens)[]).find((k) => paths[k] === pathname);
  if (!name) return Promise.resolve();
  return screens[name].load().then(
    () => undefined,
    () => undefined,
  );
}

/** Fetches every lazy screen, so the first visit to each doesn't wait on the network. */
export function prefetchScreens(): void {
  for (const screen of Object.values(screens)) void screen.load().catch(() => {});
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    // A screen that throws shows a plain explanation with links to Settings and Home, not a stack trace.
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: paths.welcome.slice(1), element: <FirstRun /> },
      { path: paths.run.slice(1), element: <Run /> },
      { path: paths.review.slice(1), element: <Review /> },
      { path: paths.drill.slice(1), element: <Drill /> },
      { path: paths.written.slice(1), element: <Written /> },
      { path: paths.map.slice(1), element: <SyllabusMap /> },
      { path: paths.settings.slice(1), element: <Settings /> },
      { path: paths.about.slice(1), element: <About /> },
      { path: paths.terminal.slice(1), element: <TerminalScreen /> },
      { path: paths.exam.slice(1), element: <ExamScreen /> },
      { path: paths.stats.slice(1), element: <Stats /> },
      { path: paths.daily.slice(1), element: <Daily /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export function createAppRouter() {
  return createHashRouter(routes);
}
