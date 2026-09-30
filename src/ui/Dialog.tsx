import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useAnnouncer } from './announce';
import { LiveRegions } from './LiveRegions';
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
export function DialogActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[styles.actions, className].filter(Boolean).join(' ')}>{children}</div>;
}

/**
 * Live regions inside an open dialog. `showModal()` makes the shell's regions inert, so a time
 * warning or an answer announced while a dialog is open is spoken from here instead. They start
 * empty: only what is announced after the dialog opened is read.
 */
function DialogLiveRegions() {
  const [since] = useState(() => useAnnouncer.getState().seq);
  return <LiveRegions since={since} />;
}

/**
 * Where focus goes when a dialog closes and the control that opened it has gone (the view changed
 * underneath it, for example when writing time ran out): the page's focusable heading, else main.
 */
function focusPageStart() {
  const target = document.querySelector<HTMLElement>('main h1[tabindex="-1"]') ?? document.getElementById('main');
  target?.focus();
}

/**
 * A modal dialog built on the native `<dialog>` element and `showModal()`, so the browser traps
 * focus and makes the rest of the page inert. Esc closes it, and focus returns to the element that
 * opened it (or to the page's heading, if that element has gone). It carries its own live regions,
 * so `announce()` still speaks while it is open.
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
      else focusPageStart();
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
          <DialogLiveRegions />
        </div>
      ) : null}
    </dialog>
  );
}
