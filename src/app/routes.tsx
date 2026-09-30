/* eslint-disable react-refresh/only-export-components -- route table module */
/**
 * Route table (hash router). Home and first run ship with the shell. Every other screen is its own
 * chunk: the games (inside the terminal), the exam, stats and the daily screen as the brief asks,
 * plus Today's run, Review, Drill, Written, the syllabus map, Settings and About. With the terminal
 * drawer deferred too (TerminalDrawerSlot), the first load leaves out Markdown and the figures.
 *
 * Navigation stays smooth two ways: the router updates in a transition and the Suspense boundary
 * round the Outlet (in Layout) is already showing, so the current page stays up while a chunk
 * loads; and prefetchScreens() fetches every lazy chunk once the shell is idle, so usually there
 * is nothing to wait for.
 */
import { lazy } from 'react';
import { createHashRouter, type RouteObject } from 'react-router';
import Layout from './Layout';
import { paths } from './paths';
import Home from './screens/Home';
import FirstRun from './screens/FirstRun';
import NotFound from './screens/NotFound';

const screens = {
  review: () => import('./screens/Review'),
  drill: () => import('./screens/Drill'),
  run: () => import('./screens/Run'),
  written: () => import('./screens/Written'),
  map: () => import('./screens/SyllabusMap'),
  settings: () => import('./screens/Settings'),
  about: () => import('./screens/About'),
  terminal: () => import('../terminal/TerminalScreen'),
  exam: () => import('../exam/ExamScreen'),
  stats: () => import('./screens/Stats'),
  daily: () => import('./screens/Daily'),
};

const Review = lazy(screens.review);
const Drill = lazy(screens.drill);
const Run = lazy(screens.run);
const Written = lazy(screens.written);
const SyllabusMap = lazy(screens.map);
const Settings = lazy(screens.settings);
const About = lazy(screens.about);
const TerminalScreen = lazy(screens.terminal);
const ExamScreen = lazy(screens.exam);
const Stats = lazy(screens.stats);
const Daily = lazy(screens.daily);

/** Fetches every lazy screen, so the first visit to each doesn't wait on the network. */
export function prefetchScreens(): void {
  for (const load of Object.values(screens)) void load().catch(() => {});
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
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
