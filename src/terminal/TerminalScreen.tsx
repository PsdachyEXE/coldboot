/**
 * The full-screen Terminal route. It shares the drawer's session, so a game started in one carries
 * on in the other. While this route is showing, the drawer stays closed, the backtick key focuses
 * this input, and commands other screens send with useTerminal.run() run here.
 */
import { useEffect, useRef } from 'react';
import { registerRouteFocus } from './routeFocus';
import { submitLine } from './shell';
import { TerminalView } from './TerminalView';
import { useTerminal } from './useTerminal';
import { useTerminalEnv } from './useTerminalEnv';
import styles from './TerminalScreen.module.css';

export default function TerminalScreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const open = useTerminal((s) => s.open);
  const pending = useTerminal((s) => s.pending);
  const env = useTerminalEnv('route');

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    return registerRouteFocus(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (open) useTerminal.getState().setOpen(false);
    if (pending === null) return;
    const command = useTerminal.getState().takePending();
    if (command) void submitLine(command, env, { fromPending: true });
  }, [open, pending, env]);

  return (
    <section className={styles.screen} aria-labelledby="terminal-route-title">
      <h1 id="terminal-route-title" className={styles.title}>
        Terminal
      </h1>
      <TerminalView presentation="route" inputRef={inputRef} className={styles.terminal} />
    </section>
  );
}
