/**
 * Single-key shortcuts for the study screens (Space, 1 to 4, A to D, Enter, R). They never fire
 * while the user types in a field, while a dialog or the terminal drawer is open, or with a
 * modifier held, so they can't steal keys from anything else.
 */
import { useEffect, useRef } from 'react';
import { useTerminal } from '../../terminal/useTerminal';
import { useReportDialog } from '../../ui/report';

const TEXT_INPUTS = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'time']);

/** True when a key press on this element types text (inputs, text areas, selects, editable content). */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && TEXT_INPUTS.has(target.type);
}

/** True when Space or Enter on this element already activates it (buttons, links, summaries). */
export function isActivatingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.closest('button, a[href], summary, [role="button"], [role="link"]') !== null;
}

/** True while something else owns the keyboard: a dialog, the report dialog or the terminal drawer. */
export function shortcutsBlocked(): boolean {
  if (useReportDialog.getState().request) return true;
  if (useTerminal.getState().open) return true;
  return typeof document !== 'undefined' && document.querySelector('dialog[open]') !== null;
}

/** Listens for single-key shortcuts on the document while `active`. The handler sees only plain keys. */
export function useShortcuts(handler: (e: KeyboardEvent) => void, active = true): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
      if (isEditableTarget(e.target) || shortcutsBlocked()) return;
      ref.current(e);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
}
