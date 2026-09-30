import { useAnnouncer } from './announce';
import styles from './VisuallyHidden.module.css';

export interface LiveRegionsProps {
  /**
   * Speak only messages announced after this `seq` (from `useAnnouncer`). A dialog passes the
   * `seq` from when it opened, so its own regions start empty and never re-read an older message.
   * Leave it out for the shell's regions.
   */
  since?: number;
}

/**
 * The app's two live regions, fed by `announce()`. The layout mounts one pair, and every open
 * `Dialog` mounts another inside itself, because a native modal makes the shell's pair inert. Each
 * message is rendered in a freshly keyed node so a repeated message ("Correct", "Correct") is read
 * again.
 */
export function LiveRegions({ since }: LiveRegionsProps = {}) {
  const polite = useAnnouncer((s) => s.polite);
  const politeSeq = useAnnouncer((s) => s.politeSeq);
  const assertive = useAnnouncer((s) => s.assertive);
  const assertiveSeq = useAnnouncer((s) => s.assertiveSeq);
  const fresh = (seq: number) => since === undefined || seq > since;
  const prefix = since === undefined ? '' : 'dialog-';
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className={styles.hidden} data-testid={`${prefix}live-polite`}>
        {polite && fresh(politeSeq) ? <span key={politeSeq}>{polite}</span> : null}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className={styles.hidden} data-testid={`${prefix}live-assertive`}>
        {assertive && fresh(assertiveSeq) ? <span key={assertiveSeq}>{assertive}</span> : null}
      </div>
    </>
  );
}
