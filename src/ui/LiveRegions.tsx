import { useAnnouncer } from './announce';
import styles from './VisuallyHidden.module.css';

/**
 * The app's two live regions, fed by `announce()`. Mounted once by the layout. Each message is
 * rendered in a freshly keyed node so a repeated message ("Correct", "Correct") is read again.
 */
export function LiveRegions() {
  const polite = useAnnouncer((s) => s.polite);
  const politeSeq = useAnnouncer((s) => s.politeSeq);
  const assertive = useAnnouncer((s) => s.assertive);
  const assertiveSeq = useAnnouncer((s) => s.assertiveSeq);
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className={styles.hidden} data-testid="live-polite">
        {polite ? <span key={politeSeq}>{polite}</span> : null}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className={styles.hidden} data-testid="live-assertive">
        {assertive ? <span key={assertiveSeq}>{assertive}</span> : null}
      </div>
    </>
  );
}
