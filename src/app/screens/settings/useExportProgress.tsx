/**
 * Export progress (Section 6.10): downloads the progress file and says what happened. Settings and
 * Home (after the exam) share it, so the file and the wording are the same in both places.
 */
import { useState, type ReactNode } from 'react';
import { buildExport, exportFilename } from '../../../state/exportImport';
import { announce } from '../../../ui/announce';
import { downloadJson } from '../../../ui/download';
import styles from '../ShellScreens.module.css';

export function useExportProgress(): { exportProgress(): void; status: ReactNode } {
  const [exported, setExported] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  function exportProgress() {
    const now = Date.now();
    const name = exportFilename(now);
    const ok = downloadJson(name, buildExport(now));
    setFailed(!ok);
    setExported(ok ? name : null);
    if (ok) announce(`Progress exported as ${name}.`);
  }

  const status = (
    <>
      {exported ? (
        <p className={styles.status}>
          Progress exported as {exported}. Keep it somewhere safe, such as your school drive.
        </p>
      ) : null}
      {failed ? (
        <p role="alert" className={styles.status}>
          Your browser blocked the download. Allow downloads for this site, then try again.
        </p>
      ) : null}
    </>
  );
  return { exportProgress, status };
}
