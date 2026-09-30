/* eslint-disable react-refresh/only-export-components -- route table module */
/**
 * Route table (hash router). Games (inside the terminal), the exam, stats and the daily screen are
 * lazy-loaded; the everyday study screens ship with the shell.
 */
import { lazy, Suspense, type ReactNode } from 'react';
import { createHashRouter, type RouteObject } from 'react-router';
import Layout from './Layout';
import { paths } from './paths';
import Home from './screens/Home';
import FirstRun from './screens/FirstRun';
import Run from './screens/Run';
import Review from './screens/Review';
import Drill from './screens/Drill';
import Written from './screens/Written';
import SyllabusMap from './screens/SyllabusMap';
import Settings from './screens/Settings';
import About from './screens/About';
import NotFound from './screens/NotFound';

const TerminalScreen = lazy(() => import('../terminal/TerminalScreen'));
const ExamScreen = lazy(() => import('../exam/ExamScreen'));
const Stats = lazy(() => import('./screens/Stats'));
const Daily = lazy(() => import('./screens/Daily'));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<p role="status">Loading</p>}>{children}</Suspense>;
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
      { path: paths.terminal.slice(1), element: <Lazy><TerminalScreen /></Lazy> },
      { path: paths.exam.slice(1), element: <Lazy><ExamScreen /></Lazy> },
      { path: paths.stats.slice(1), element: <Lazy><Stats /></Lazy> },
      { path: paths.daily.slice(1), element: <Lazy><Daily /></Lazy> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export function createAppRouter() {
  return createHashRouter(routes);
}
