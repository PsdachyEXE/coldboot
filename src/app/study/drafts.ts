/**
 * Written-answer drafts, kept in sessionStorage so a reload or a trip to another screen doesn't lose
 * them, and gone when the tab closes. Drafts are the student's own text: render them only as React
 * text. Storage failures are ignored; the draft simply isn't kept.
 */
import { storageKey } from '../../state/storage';

const MAX_DRAFT = 20_000;

function key(itemId: string): string {
  return storageKey(`draft:${itemId}`);
}

export function readDraft(itemId: string): string {
  try {
    const value = window.sessionStorage.getItem(key(itemId));
    return typeof value === 'string' ? value.slice(0, MAX_DRAFT) : '';
  } catch {
    return '';
  }
}

export function writeDraft(itemId: string, text: string): void {
  try {
    if (text) window.sessionStorage.setItem(key(itemId), text.slice(0, MAX_DRAFT));
    else window.sessionStorage.removeItem(key(itemId));
  } catch {
    // Private mode or storage disabled: the draft lives only in this screen.
  }
}

export function clearDraft(itemId: string): void {
  writeDraft(itemId, '');
}
