/**
 * "Import progress": choose a file, see what's in it, then confirm. The file is validated before
 * anything changes, and nothing from it is ever rendered as HTML.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { applyImport, readImportFile, type ValidatedImport } from '../../../state/exportImport';
import { announce } from '../../../ui/announce';
import { Button } from '../../../ui/Button';
import { FieldError } from '../../../ui/Field';
import styles from './parts.module.css';

type Phase = { kind: 'idle' } | { kind: 'reading' } | { kind: 'confirm'; file: ValidatedImport; summary: string } | { kind: 'error'; message: string };

interface ImportProgressProps {
  /** The confirm button, named for its result, e.g. "Replace my progress". */
  confirmLabel: string;
  /** Shown with the summary before the user confirms. */
  warning: ReactNode;
  /** Called after the progress has been replaced. */
  onImported(): void;
}

export function ImportProgress({ confirmLabel, warning, onImported }: ImportProgressProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const summaryId = useId();
  const warningId = useId();
  // After Cancel or a finished import the chooser button comes back; put focus on it once it has.
  const refocus = useRef(false);
  useEffect(() => {
    if (refocus.current && chooseRef.current) {
      refocus.current = false;
      chooseRef.current.focus();
    }
  });

  async function onFile(file: File | undefined) {
    if (!file) return;
    setPhase({ kind: 'reading' });
    announce('Checking the file.');
    const result = await readImportFile(file);
    if (inputRef.current) inputRef.current.value = '';
    setPhase(result.ok ? { kind: 'confirm', file: result.file, summary: result.summary } : { kind: 'error', message: result.error });
  }

  function confirm() {
    if (phase.kind !== 'confirm') return;
    applyImport(phase.file);
    refocus.current = true;
    setPhase({ kind: 'idle' });
    announce('Progress imported.');
    onImported();
  }

  function cancel() {
    refocus.current = true;
    setPhase({ kind: 'idle' });
  }

  return (
    <div className={styles.import}>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className={styles.fileInput}
        aria-label="Progress file"
        tabIndex={-1}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {phase.kind !== 'confirm' ? (
        <Button ref={chooseRef} onClick={() => inputRef.current?.click()}>
          Import progress
        </Button>
      ) : null}
      {phase.kind === 'reading' ? (
        <p className={styles.note}>Checking the file</p>
      ) : null}
      {phase.kind === 'error' ? (
        <div role="alert">
          <FieldError>{phase.message}</FieldError>
        </div>
      ) : null}
      {phase.kind === 'confirm' ? (
        <div className={styles.confirm} role="group" aria-label="Confirm import">
          <p className={styles.summary} id={summaryId}>
            <strong>Ready to import.</strong> This file has {phase.summary}
          </p>
          <div className={styles.note} id={warningId}>
            {warning}
          </div>
          <div className={styles.actions}>
            <Button variant="primary" onClick={confirm} autoFocus aria-describedby={`${summaryId} ${warningId}`}>
              {confirmLabel}
            </Button>
            <Button onClick={cancel}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
