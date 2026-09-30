/**
 * Navigation for the shell: the desktop rail and, below 720 px, a five-tab bar whose More tab
 * opens a menu with the remaining destinations.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useTerminal } from '../terminal';
import { Kbd } from '../ui/Kbd';
import { MORE_ITEMS, TAB_ITEMS, navLabel } from './LayoutItems';
import { RAIL, paths } from './paths';
import styles from './Layout.module.css';

function linkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
}

function tabClass({ isActive }: { isActive: boolean }): string {
  return isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab;
}

/** The COLDBOOT wordmark: the only all-caps text in the product. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={[styles.wordmark, className].filter(Boolean).join(' ')}>COLDBOOT</span>;
}

/** Toggles the drop-down terminal (the backtick key does the same). Mainly for touch screens. */
export function TerminalButton({ className }: { className?: string }) {
  const open = useTerminal((s) => s.open);
  return (
    <button
      type="button"
      className={[styles.terminalButton, className].filter(Boolean).join(' ')}
      onClick={() => useTerminal.getState().toggle()}
      aria-keyshortcuts="`"
    >
      {open ? 'Close terminal' : 'Open terminal'}
      <span aria-hidden="true" className={styles.terminalKey}>
        <Kbd>`</Kbd>
      </span>
    </button>
  );
}

export function Rail() {
  return (
    <nav aria-label="Main" className={styles.rail}>
      <Wordmark className={styles.railWordmark} />
      <ul className={styles.navList}>
        {RAIL.map((r) => (
          <li key={r.name}>
            <NavLink to={paths[r.name]} end={r.name === 'home'} className={linkClass}>
              {r.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className={styles.railTerminal}>
        <TerminalButton />
      </div>
      <ul className={`${styles.navList} ${styles.railFooter}`}>
        <li>
          <NavLink to={paths.settings} className={linkClass}>
            Settings
          </NavLink>
        </li>
        <li>
          <NavLink to={paths.about} className={linkClass}>
            About
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export function TabBar() {
  const location = useLocation();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const moreOpen = openOn === location.pathname;
  const setMoreOpen = (open: boolean) => setOpenOn(open ? location.pathname : null);
  const menuId = useId();
  const navRef = useRef<HTMLElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const moreActive = MORE_ITEMS.some((name) => location.pathname === paths[name]);

  // Esc or a tap outside closes it; Esc puts focus back on More.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenOn(null);
        moreRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (navRef.current && e.target instanceof Node && !navRef.current.contains(e.target)) setOpenOn(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [moreOpen]);

  return (
    <nav aria-label="Main" className={styles.tabbar} ref={navRef}>
      <ul className={styles.tabs}>
        {TAB_ITEMS.map((name) => (
          <li key={name}>
            <NavLink to={paths[name]} end={name === 'home'} className={tabClass}>
              {navLabel(name)}
            </NavLink>
          </li>
        ))}
        <li>
          <button
            ref={moreRef}
            type="button"
            className={tabClass({ isActive: moreActive })}
            aria-expanded={moreOpen}
            aria-controls={moreOpen ? menuId : undefined}
            onClick={() => setMoreOpen(!moreOpen)}
          >
            More
          </button>
        </li>
      </ul>
      {moreOpen ? (
        <ul id={menuId} className={styles.moreMenu}>
          {MORE_ITEMS.map((name) => (
            <li key={name}>
              <NavLink to={paths[name]} className={linkClass}>
                {navLabel(name)}
              </NavLink>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}
