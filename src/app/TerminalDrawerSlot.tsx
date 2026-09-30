/**
 * Where the shell mounts the terminal drawer. The drawer brings the terminal, the figure renderers
 * and Markdown with it, so it loads once the shell is idle instead of with the first page. Until it
 * has loaded, a backtick (or anything that opens the terminal) loads it straight away and it opens
 * as soon as it arrives.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { whenIdle } from '../lib/idle';
import { isEditable, modalDialogOpen } from '../terminal/dom';
import { focusRouteInput } from '../terminal/routeFocus';
import { useTerminal } from '../terminal/useTerminal';
import { paths } from './paths';

const loadDrawer = () => import('../terminal/TerminalDrawer').then((m) => ({ default: m.TerminalDrawer }));
const TerminalDrawer = lazy(loadDrawer);

export function TerminalDrawerSlot() {
  const open = useTerminal((s) => s.open);
  const onRoute = useLocation().pathname === paths.terminal;
  const [wanted, setWanted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => whenIdle(() => setWanted(true)), []);

  useEffect(() => {
    if (!wanted && !open) return;
    let live = true;
    void loadDrawer().then(() => {
      if (live) setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [wanted, open]);

  // Until the drawer (which handles the backtick itself) has loaded, open it from here.
  useEffect(() => {
    if (loaded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (e.target instanceof Element && e.target.closest('[data-terminal-input]')) return;
      if (isEditable(e.target) || modalDialogOpen()) return;
      e.preventDefault();
      if (onRoute) focusRouteInput();
      else useTerminal.getState().setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loaded, onRoute]);

  if (!wanted && !open) return null;
  return (
    <Suspense fallback={null}>
      <TerminalDrawer />
    </Suspense>
  );
}
