/**
 * The terminal itself: the output log, the prompt with a real <input>, and tappable chips. The
 * drawer and the full-screen route both render this over the one shared session.
 */
import { useLayoutEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent, type MouseEvent, type RefObject } from 'react';
import { HISTORY_ENTRY_MAX } from '../state/session';
import { useSettings } from '../state/settings';
import { useReducedMotion } from '../ui/motion';
import { BlockView } from './BlockView';
import type { TerminalEnv } from './commands';
import { GAME_INPUT_MAX, useTerminalSession } from './session';
import { IDLE_CHIPS, clearScreen, completeAt, historyDown, historyUp, interrupt, promptFor, submitLine } from './shell';
import { useBlockCaret } from './useBlockCaret';
import { useTerminal } from './useTerminal';
import { useTerminalEnv } from './useTerminalEnv';
import styles from './TerminalView.module.css';

function cx(...names: (string | false | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

interface TerminalViewProps {
  presentation: TerminalEnv['presentation'];
  inputRef: RefObject<HTMLInputElement | null>;
  className?: string;
}

function TerminalOutput({ presentation, inputRef }: { presentation: TerminalEnv['presentation']; inputRef: RefObject<HTMLInputElement | null> }) {
  const entries = useTerminalSession((s) => s.entries);
  const reduced = useReducedMotion();
  // Only blocks printed after this view mounted may animate, so remounting never replays a nudge.
  const [firstNew] = useState(() => useTerminalSession.getState().nextId);
  const logRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (window.getSelection()?.toString()) return;
    if ((e.target as Element).closest('a, button, input, [tabindex="0"]:not([role="log"])')) return;
    inputRef.current?.focus({ preventScroll: true });
  };

  const onNavigate = presentation === 'drawer' ? () => useTerminal.getState().setOpen(false) : undefined;

  return (
    <div ref={logRef} className={styles.output} role="log" aria-live="off" aria-label="Terminal output" tabIndex={0} onClick={onClick}>
      {entries.map((e) => (
        <BlockView key={e.id} block={e.block} animate={!reduced && e.id >= firstNew} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function TerminalInput({ env, inputRef }: { env: TerminalEnv; inputRef: RefObject<HTMLInputElement | null> }) {
  const draft = useTerminalSession((s) => s.draft);
  const inGame = useTerminalSession((s) => s.game !== null);
  const name = useSettings((s) => s.name);
  const caretRef = useRef<HTMLSpanElement>(null);
  const cursorAfterRender = useRef<number | null>(null);
  const syncCaret = useBlockCaret(inputRef, caretRef);

  // After history, completion or a submit changes the draft, put the cursor where it belongs.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const at = cursorAfterRender.current;
    if (at !== null) {
      cursorAfterRender.current = null;
      input.setSelectionRange(at, at);
      if (at >= input.value.length) input.scrollLeft = input.scrollWidth;
    }
    syncCaret();
  }, [draft, inputRef, syncCaret]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void submitLine(draft, env);
  };

  /** Moves the cursor now if the draft didn't change, or after the re-render if it did. */
  const placeCursor = (input: HTMLInputElement, at: number) => {
    if (useTerminalSession.getState().draft === input.value) {
      input.setSelectionRange(at, at);
      syncCaret();
    } else {
      cursorAfterRender.current = at;
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    const input = e.currentTarget;
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    if (e.key === 'Tab' && plain && !e.shiftKey) {
      // Completion only when there is something to complete; otherwise Tab moves focus as usual.
      if (!inGame && input.value.trim()) {
        e.preventDefault();
        placeCursor(input, completeAt(input.value, input.selectionStart ?? input.value.length).cursor);
      }
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && plain) {
      e.preventDefault();
      if (e.key === 'ArrowUp') historyUp();
      else historyDown();
      placeCursor(input, useTerminalSession.getState().draft.length);
    } else if (e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'c') {
      // With text selected, Ctrl+C copies as usual.
      if (input.selectionStart !== input.selectionEnd) return;
      e.preventDefault();
      interrupt();
    } else if (e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      clearScreen();
    } else if (e.key === '`' && plain && env.presentation === 'drawer') {
      e.preventDefault();
      useTerminal.getState().setOpen(false);
    }
  };

  const prompt = promptFor(name);
  const id = `terminal-input-${env.presentation}`;
  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.prompt} htmlFor={id}>
        <span aria-hidden="true">{prompt}</span>
        <span className={styles.visuallyHidden}>{inGame ? 'Your answer' : 'Terminal command'}</span>
      </label>
      <span className={styles.inputWrap}>
        <input
          ref={inputRef}
          id={id}
          className={styles.input}
          data-terminal-input={env.presentation}
          type="text"
          value={draft}
          onChange={(e) => useTerminalSession.getState().setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          maxLength={inGame ? GAME_INPUT_MAX : HISTORY_ENTRY_MAX}
        />
        <span ref={caretRef} className={styles.caret} aria-hidden="true" />
      </span>
    </form>
  );
}

function TerminalChips({ env, inputRef }: { env: TerminalEnv; inputRef: RefObject<HTMLInputElement | null> }) {
  const inGame = useTerminalSession((s) => s.game !== null);
  const gameChips = useTerminalSession((s) => s.game?.chips);
  const canShare = useTerminalSession((s) => s.lastShare !== null);
  // Once a share line has been printed, copying it is one tap away.
  const chips = inGame ? (gameChips ?? []) : canShare ? ['share', ...IDLE_CHIPS] : IDLE_CHIPS;

  // After a chip: mouse users go back to typing; a keyboard user whose chip disappeared with the
  // next question lands in the input; touch users keep the keyboard closed.
  const refocus = (e: MouseEvent<HTMLButtonElement>) => {
    const keyboard = e.detail === 0;
    const touch = (e.nativeEvent as PointerEvent).pointerType === 'touch';
    requestAnimationFrame(() => {
      const lost = !document.activeElement || document.activeElement === document.body;
      if (keyboard ? lost : !touch) inputRef.current?.focus({ preventScroll: true });
    });
  };
  // On phones the chips share one row that scrolls sideways, and the browser doesn't scroll a
  // partly visible button into view when it takes focus, so do it here.
  const reveal = (e: FocusEvent<HTMLButtonElement>) => e.currentTarget.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });

  return (
    <div className={styles.chipRow}>
      {chips.length > 0 && (
        <div className={styles.chips} role="group" aria-label={inGame ? 'Suggested answers' : 'Suggested commands'}>
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className={styles.chip}
              onFocus={reveal}
              onClick={(e) => {
                void submitLine(chip, env);
                refocus(e);
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
      {inGame && (
        <button
          type="button"
          className={cx(styles.chip, styles.abort)}
          onFocus={reveal}
          onClick={(e) => {
            interrupt();
            refocus(e);
          }}
        >
          Abort game
        </button>
      )}
    </div>
  );
}

export function TerminalView({ presentation, inputRef, className }: TerminalViewProps) {
  const env = useTerminalEnv(presentation);

  // Ctrl+C and Ctrl+L also work with focus on the output or a chip (the input handles its own).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || !e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 'c' && !window.getSelection()?.toString()) {
      e.preventDefault();
      interrupt();
    } else if (key === 'l') {
      e.preventDefault();
      clearScreen();
    }
  };

  return (
    // The handler only adds shortcuts to the interactive elements inside; it is not a control itself.
    <div className={cx(styles.root, className)} onKeyDown={onKeyDown}>
      <TerminalOutput presentation={presentation} inputRef={inputRef} />
      <TerminalInput env={env} inputRef={inputRef} />
      <TerminalChips env={env} inputRef={inputRef} />
    </div>
  );
}
