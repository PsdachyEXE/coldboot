/**
 * The drop-down console (Section 7.1). The backtick key toggles it from anywhere except other text
 * fields; on the /terminal route the backtick focuses the route's input instead. It slides down from
 * the top over everything (180 ms, instant under reduced motion), moves focus to its input when it
 * opens and returns focus when it closes. Other screens start commands with useTerminal.run().
 */
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router';
import { paths } from '../app/paths';
import { useReducedMotion } from '../ui/motion';
import { isEditable, trapTab } from './dom';
import { focusRouteInput } from './routeFocus';
import { submitLine } from './shell';
import { TerminalView } from './TerminalView';
import { useTerminal } from './useTerminal';
import { useTerminalEnv } from './useTerminalEnv';
import styles from './TerminalDrawer.module.css';

function cx(...names: (string | false | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

export function TerminalDrawer() {
  const open = useTerminal((s) => s.open);
  const pending = useTerminal((s) => s.pending);
  const onRoute = useLocation().pathname === paths.terminal;
  const visible = open && !onRoute;
  const reduced = useReducedMotion();
  const env = useTerminalEnv('drawer');
  const drawerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  // Backtick from anywhere. The terminal inputs handle their own backtick.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const target = e.target;
      if (target instanceof Element && target.closest('[data-terminal-input]')) return;
      if (isEditable(target)) return;
      e.preventDefault();
      if (onRoute) focusRouteInput();
      else useTerminal.getState().toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRoute]);

  // Focus moves in when the drawer opens and back to where it was when it closes.
  useEffect(() => {
    const drawer = drawerRef.current;
    if (visible) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body && !drawer?.contains(active)) returnFocus.current = active;
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    const back = returnFocus.current;
    returnFocus.current = null;
    const active = document.activeElement;
    const focusWasInside = !active || active === document.body || !!drawer?.contains(active);
    if (focusWasInside && back?.isConnected) back.focus({ preventScroll: true });
  }, [visible]);

  // Commands other screens asked for (useTerminal.run), e.g. Today's run starting `daily`.
  useEffect(() => {
    if (!visible || pending === null) return;
    const command = useTerminal.getState().takePending();
    if (command) void submitLine(command, env, { fromPending: true });
  }, [visible, pending, env]);

  if (onRoute) return null;

  const close = () => useTerminal.getState().setOpen(false);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab' && !e.defaultPrevented && drawerRef.current) {
      trapTab(e, drawerRef.current);
    }
  };

  return (
    <div
      ref={drawerRef}
      className={cx(styles.drawer, visible && styles.open, reduced && styles.instant)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminal-drawer-title"
      inert={!visible}
      data-open={visible ? 'true' : 'false'}
      onKeyDown={onKeyDown}
    >
      <div className={styles.bar}>
        <h2 id="terminal-drawer-title" className={styles.title}>
          Terminal
        </h2>
        <p className={styles.hint}>Press ` or Esc to close</p>
        <button type="button" className={styles.close} onClick={close}>
          Close
        </button>
      </div>
      <TerminalView presentation="drawer" inputRef={inputRef} className={styles.view} />
    </div>
  );
}
