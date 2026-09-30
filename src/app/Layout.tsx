/**
 * The app shell: skip link, navigation (rail on desktop, tab bar on phones), the main column, the
 * status bar, the terminal drawer, the live regions, the report dialog, the storage warning, the
 * update prompt and the boot sequence. Until first run is complete, every route except /welcome
 * redirects there and the shell shows only the wordmark and the main column.
 */
import { useEffect, useRef, type MouseEvent } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useContent } from '../content/store';
import { useSettings } from '../state/settings';
import { useStorageHealth } from '../state/storage';
import { TerminalDrawer, useTerminal } from '../terminal';
import { announce } from '../ui/announce';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { LiveRegions } from '../ui/LiveRegions';
import { ReportDialog } from '../ui/ReportDialog';
import { useNarrow } from '../ui/useMediaQuery';
import { Boot } from './Boot';
import { pageTitle } from './LayoutItems';
import { Rail, TabBar, TerminalButton, Wordmark } from './LayoutNav';
import { paths } from './paths';
import { usePwa } from './pwa';
import { StatusBar } from './StatusBar';
import styles from './Layout.module.css';

export default function Layout() {
  const location = useLocation();
  const onboarded = useSettings((s) => s.onboarded);
  const narrow = useNarrow();
  const mainRef = useRef<HTMLElement>(null);
  const firstPath = useRef(location.pathname);

  const atWelcome = location.pathname === paths.welcome;
  const redirect = !onboarded && !atWelcome ? paths.welcome : onboarded && atWelcome ? paths.home : null;

  // Page title per route.
  useEffect(() => {
    document.title = pageTitle(location.pathname);
  }, [location.pathname]);

  // After a route change, start screen readers and keyboard users at the new page. Leave focus
  // alone while the terminal drawer is open, since the terminal can navigate too.
  useEffect(() => {
    if (location.pathname === firstPath.current) return;
    firstPath.current = '';
    if (useTerminal.getState().open) return;
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo?.(0, 0);
  }, [location.pathname]);

  // Load study content in the background once the shell has painted.
  useEffect(() => {
    const t = setTimeout(() => void useContent.getState().load(), 0);
    return () => clearTimeout(t);
  }, []);

  const skipToMain = (e: MouseEvent<HTMLAnchorElement>) => {
    // Hash routing owns the URL fragment, so move focus by hand instead of following #main.
    e.preventDefault();
    mainRef.current?.focus();
    mainRef.current?.scrollIntoView?.({ block: 'start' });
  };

  const layout = !onboarded ? 'bare' : narrow ? 'tabs' : 'rail';

  return (
    <div className={styles.shell} data-layout={layout}>
      <a href="#main" className={styles.skip} onClick={skipToMain}>
        Skip to main content
      </a>
      {layout === 'rail' ? <Rail /> : null}
      {layout !== 'rail' ? (
        <header className={styles.topbar}>
          <Wordmark />
          {/* On the Terminal route the page is the terminal, so the button would only focus it. */}
          {layout === 'tabs' && location.pathname !== paths.terminal ? <TerminalButton className={styles.topbarTerminal} /> : null}
        </header>
      ) : null}
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        <div className={styles.content}>
          <StorageWarning />
          {redirect ? <Navigate to={redirect} replace /> : <Outlet />}
        </div>
      </main>
      {onboarded ? <StatusBar /> : null}
      {layout === 'tabs' ? <TabBar /> : null}
      <UpdatePrompt />
      {onboarded ? <TerminalDrawer /> : null}
      <LiveRegions />
      <ReportDialog />
      <Boot />
    </div>
  );
}

/** Every storage problem seen this session, until the page is reloaded. */
function StorageWarning() {
  const messages = useStorageHealth((s) => s.messages);
  if (!messages.length) return null;
  return (
    <Banner role="alert" title="There's a problem with your saved progress">
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul>
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </Banner>
  );
}

/** "Update ready. Reload now?" when a new build is waiting. */
function UpdatePrompt() {
  const needRefresh = usePwa((s) => s.needRefresh);
  useEffect(() => {
    if (needRefresh) announce('Update ready. Reload now?');
  }, [needRefresh]);
  if (!needRefresh) return null;
  return (
    <section className={styles.update} aria-label="Update">
      <p className={styles.updateText}>Update ready. Reload now?</p>
      <div className={styles.updateActions}>
        <Button variant="primary" size="small" onClick={() => void usePwa.getState().reload()}>
          Reload
        </Button>
        <Button size="small" onClick={() => usePwa.getState().dismiss()}>
          Later
        </Button>
      </div>
    </section>
  );
}
