/**
 * The cold-boot sequence: COLDBOOT's one orchestrated motion moment (Section 9). At launch an
 * overlay prints POST-style lines built from real data. The full version (about 1.2 s) plays on the
 * first launch of each study day; later launches get a 300 ms condensed version. Under reduced
 * motion it doesn't play at all.
 *
 * Any key, click or tap skips it. The overlay is aria-hidden, holds nothing focusable and never
 * makes the app inert, so it can't trap focus or get in a screen reader's way.
 */
import { useEffect, useState } from 'react';
import { AREA_IDS, type AreaId } from '../content/schema';
import { useContent } from '../content/store';
import { kksByArea, studyDesign } from '../content/studyDesign';
import { studyDay } from '../lib/time';
import { useSession } from '../state/session';
import { examAtMs, useSettings } from '../state/settings';
import { countDue, useSrs } from '../state/srs';
import { prefersReducedMotion } from '../ui/motion';
import { bootLines, type BootMode } from './BootLines';
import styles from './Boot.module.css';

const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

/** Timings: lines print over `print` ms, then the screen holds for `hold` ms. */
const BOOT_TIMING: Readonly<Record<BootMode, { print: number; hold: number }>> = {
  full: { print: 1000, hold: 200 },
  condensed: { print: 200, hold: 100 },
};

const KK_COUNTS = Object.fromEntries(AREA_IDS.map((a) => [a, kksByArea[a].length])) as Record<AreaId, number>;
const PROVISIONAL = studyDesign.kks.filter((k) => k.status !== 'confirmed').length;

function chooseMode(now: number): BootMode | 'none' {
  if (prefersReducedMotion()) return 'none';
  return useSession.getState().lastBootDay === studyDay(now) ? 'condensed' : 'full';
}

export function Boot() {
  const [startedAt] = useState(() => Date.now());
  const [mode] = useState(() => chooseMode(startedAt));
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(mode === 'none');

  const examAt = useSettings((s) => examAtMs(s));
  const cards = useSrs((s) => s.cards);
  const status = useContent((s) => s.status);
  const index = useContent((s) => s.index);

  // The sequence counts as played for today whether it ran, was skipped or was reduced away.
  useEffect(() => {
    useSession.getState().setLastBootDay(studyDay(startedAt));
  }, [startedAt]);

  const lines =
    mode === 'none'
      ? []
      : bootLines(
          {
            buildId: BUILD_ID,
            kkCounts: KK_COUNTS,
            provisional: PROVISIONAL,
            content: {
              status,
              cards: index?.cards.length ?? 0,
              questions: index ? index.mcq.length + index.short.length + index.caseStudies.reduce((n, cs) => n + cs.questions.length, 0) : 0,
            },
            due: countDue(cards, startedAt, index?.cardIds),
            now: startedAt,
            examAt,
          },
          mode,
        );
  const total = lines.length;

  // Print one line per step, then hold, then get out of the way.
  useEffect(() => {
    if (done || mode === 'none') return;
    const { print, hold } = BOOT_TIMING[mode];
    const step = Math.max(10, Math.floor(print / total));
    let count = 0;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      count++;
      setShown(count);
      if (count >= total) {
        clearInterval(interval);
        holdTimer = setTimeout(() => setDone(true), hold);
      }
    }, step);
    return () => {
      clearInterval(interval);
      if (holdTimer) clearTimeout(holdTimer);
    };
  }, [done, mode, total]);

  // Any key, click or tap skips.
  useEffect(() => {
    if (done) return;
    const skip = () => setDone(true);
    window.addEventListener('keydown', skip, true);
    window.addEventListener('pointerdown', skip, true);
    return () => {
      window.removeEventListener('keydown', skip, true);
      window.removeEventListener('pointerdown', skip, true);
    };
  }, [done]);

  if (done || mode === 'none') return null;

  return (
    <div className={styles.overlay} aria-hidden="true" data-testid="boot" data-mode={mode}>
      <ol className={styles.lines}>
        {lines.slice(0, Math.max(1, shown)).map((l) => (
          <li key={l.key} className={styles.line}>
            <span className={l.key === 'build' ? styles.wordmark : styles.label}>{l.label}</span>
            <span className={styles.detail}>
              {l.detail}
              {l.result ? <span className={styles.result}>{l.result}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.hint}>Press any key or tap to skip</p>
    </div>
  );
}
