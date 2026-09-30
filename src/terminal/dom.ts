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
