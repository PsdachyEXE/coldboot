/** Small DOM helpers for the terminal's keyboard handling. */

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'radio', 'range', 'color', 'file', 'image', 'reset', 'submit']);

/** True for fields where a typed backtick belongs to the field (text inputs, textareas, selects, contenteditable). */
export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  return false;
}

/**
 * True while a native modal dialog (the report dialog, a confirmation) is open. The backtick is
 * ignored then: the drawer would open behind the dialog, where its input can't take focus.
 */
export function modalDialogOpen(): boolean {
  return typeof document !== 'undefined' && document.querySelector('dialog[open]') !== null;
}

let drawerListening = false;

/**
 * Set while the loaded drawer listens for the backtick itself. Until then the shell's stand-in
 * listener (TerminalDrawerSlot) opens it, and it steps aside only once this is set, so no keypress
 * falls between the two.
 */
export function setDrawerListening(on: boolean): void {
  drawerListening = on;
}

export function drawerIsListening(): boolean {
  return drawerListening;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusablesIn(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest('[hidden], [inert]'));
}

/** Keeps Tab and Shift+Tab inside `container`, wrapping at either end. */
export function trapTab(event: KeyboardEvent | { key: string; shiftKey: boolean; preventDefault(): void }, container: HTMLElement): void {
  if (event.key !== 'Tab') return;
  const items = focusablesIn(container);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !container.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}
