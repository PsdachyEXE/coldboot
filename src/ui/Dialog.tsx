import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import styles from './Dialog.module.css';

export interface DialogProps {
  /** Whether the dialog is showing. The parent owns this state. */
  open: boolean;
  /** Called when the user dismisses the dialog (Esc or a close button). Set `open` to false in it. */
  onClose(): void;
  /** Heading text. It also labels the dialog for screen readers. */
  title: ReactNode;
  children: ReactNode;
  /**
   * Button row at the bottom (for example a primary action and "Close"). Children are mounted only
   * while the dialog is open, so any state inside them resets each time it opens.
   */
  actions?: ReactNode;
  /** Element to focus when the dialog opens. Defaults to the first focusable element. */
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
}

/** A dialog's button row, for content that manages its own buttons instead of passing `actions`. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

/**
 * A modal dialog built on the native `<dialog>` element and `showModal()`, so the browser traps
 * focus and makes the rest of the page inert. Esc closes it, and focus returns to the element that
 * opened it.
 */
export function Dialog({ open, onClose, title, children, actions, initialFocus, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const openRef = useRef(open);
  useEffect(() => {
    onCloseRef.current = onClose;
    openRef.current = open;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (typeof el.showModal === 'function') {
        try {
          el.showModal();
        } catch {
          el.setAttribute('open', '');
        }
      } else {
        // Older browsers and jsdom: show it in place; Esc is still handled below.
        el.setAttribute('open', '');
      }
      const target = initialFocus?.current ?? el.querySelector<HTMLElement>('[autofocus], input, textarea, select, button, a[href]');
      target?.focus();
    } else if (!open && el.open) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
    if (!open && opener.current) {
      const back = opener.current;
      opener.current = null;
      if (back.isConnected) back.focus();
    }
  }, [open, initialFocus]);

  // Close the native dialog if the component unmounts while open.
  useEffect(() => {
    const el = ref.current;
    return () => {
      if (el?.open && typeof el.close === 'function') el.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={[styles.dialog, className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Esc: let React state close the dialog so `open` stays the single source of truth.
        e.preventDefault();
        onCloseRef.current();
      }}
      onClose={() => {
        // The browser closed it (for example a second Esc that can't be cancelled): sync the state.
        if (openRef.current) onCloseRef.current();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !(typeof ref.current?.showModal === 'function')) {
          e.preventDefault();
          onCloseRef.current();
        }
      }}
    >
      {open ? (
        <div className={styles.body}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <div className={styles.content}>{children}</div>
          {actions ? <DialogActions>{actions}</DialogActions> : null}
        </div>
      ) : null}
    </dialog>
  );
}
