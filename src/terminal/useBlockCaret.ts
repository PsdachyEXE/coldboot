import { useCallback, useEffect, type RefObject } from 'react';

/**
 * Draws a block caret over a real <input>. The input keeps the native editing, selection and
 * on-screen keyboard; its own caret is transparent, and the block (with the character under it)
 * follows the cursor in `ch` units, which is exact in a monospace font. The caret is updated
 * directly in the DOM so typing doesn't re-render the terminal. It hides while text is selected.
 */
export function useBlockCaret(inputRef: RefObject<HTMLInputElement | null>, caretRef: RefObject<HTMLSpanElement | null>): () => void {
  const sync = useCallback(() => {
    const input = inputRef.current;
    const caret = caretRef.current;
    if (!input || !caret) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    caret.hidden = start !== end;
    caret.style.transform = `translateX(calc(${start}ch - ${input.scrollLeft}px))`;
    caret.textContent = input.value.charAt(start) || ' ';
  }, [inputRef, caretRef]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const later = () => requestAnimationFrame(sync);
    const events = ['input', 'keyup', 'select', 'click', 'focus', 'scroll', 'mouseup'] as const;
    events.forEach((type) => input.addEventListener(type, sync));
    input.addEventListener('keydown', later);
    document.addEventListener('selectionchange', sync);
    sync();
    return () => {
      events.forEach((type) => input.removeEventListener(type, sync));
      input.removeEventListener('keydown', later);
      document.removeEventListener('selectionchange', sync);
    };
  }, [inputRef, sync]);

  return sync;
}
