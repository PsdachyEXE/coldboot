/**
 * The tmux-style status bar along the bottom of every screen: `[T-44d 04h] [37 due] [streak 6]
 * [offline ready]`. It is deliberately not a live region, so the ticking countdown never
 * interrupts a screen reader; each segment has a spoken label instead of its bracketed text.
 */
import { useContent } from '../content/store';
import { studyDay } from '../lib/time';
import { useNow } from '../lib/useNow';
import { streak, useSession } from '../state/session';
import { examAtMs, useSettings } from '../state/settings';
import { countDue, useSrs } from '../state/srs';
import { useStorageHealth } from '../state/storage';
import { VisuallyHidden } from '../ui/VisuallyHidden';
import { useNarrow } from '../ui/useMediaQuery';
import { usePwa } from './pwa';
import { statusSegments } from './StatusBarSegments';
import styles from './StatusBar.module.css';

/** How often the bar refreshes: the countdown shows hours, so 15 s is plenty. */
const TICK_MS = 15_000;

export function StatusBar() {
  const now = useNow(TICK_MS);
  const examAt = useSettings((s) => examAtMs(s));
  const cards = useSrs((s) => s.cards);
  const cardIds = useContent((s) => s.index?.cardIds);
  const activity = useSession((s) => s.activity);
  const offlineReady = usePwa((s) => s.offlineReady);
  const storageOk = useStorageHealth((s) => s.ok);
  const narrow = useNarrow();

  const segments = statusSegments({
    now,
    examAt,
    due: countDue(cards, now, cardIds),
    streak: streak(activity, studyDay(now)),
    offlineReady,
    storageOk,
    narrow,
  });

  return (
    <footer className={[styles.bar, narrow ? styles.narrow : ''].filter(Boolean).join(' ')} aria-label="Status">
      <ul className={styles.list}>
        {segments.map((s) => (
          <li key={s.id} className={styles.segment} data-segment={s.id}>
            <span aria-hidden="true">
              <span className={styles.bracket}>[</span>
              {s.text}
              <span className={styles.bracket}>]</span>
            </span>
            <VisuallyHidden>{s.label}</VisuallyHidden>
          </li>
        ))}
      </ul>
    </footer>
  );
}
