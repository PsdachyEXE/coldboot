/**
 * "Report a content problem" (Section 6.11). Mounted once by the layout and opened from anywhere
 * with `openReport({ itemId })` (src/ui/report.ts).
 */
import { useEffect, useRef, useState } from 'react';
import { ISSUE_URL, REPORT_REASONS, issueUrl, reportClipboardText, type ContentReport, type ReportReason } from '../lib/report';
import { Button, ExternalButtonLink } from './Button';
import { Dialog, DialogActions } from './Dialog';
import { RadioGroup, TextArea } from './Field';
import { useReportDialog, type ReportRequest } from './report';
import styles from './ReportDialog.module.css';

const NOTE_MAX = 2000;

/** The build id every report carries, so it names the exact deploy. */
const REPORT_APP_VERSION = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

export function ReportDialog() {
  const request = useReportDialog((s) => s.request);
  const closeReport = useReportDialog((s) => s.closeReport);
  return (
    <Dialog open={request !== null} onClose={closeReport} title="Report a content problem" className={styles.dialog}>
      {request ? <ReportForm key={`${request.itemId}|${request.instance ?? ''}`} request={request} onClose={closeReport} /> : null}
    </Dialog>
  );
}

type CopyState = 'idle' | 'copied' | 'failed';

const NO_REASON = "Choose what's wrong, then open the issue or copy the report.";

function ReportForm({ request, onClose }: { request: ReportRequest; onClose(): void }) {
  // No reason is chosen at first, so a note about a typo is never filed as a wrong answer.
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [reasonError, setReasonError] = useState(false);
  const [note, setNote] = useState('');
  const [copy, setCopy] = useState<CopyState>('idle');
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const reasonRef = useRef<HTMLFieldSetElement>(null);

  const report: ContentReport | null = reason
    ? {
        itemId: request.itemId,
        reason,
        note,
        appVersion: REPORT_APP_VERSION,
        instance: request.instance,
        where: request.where,
      }
    : null;
  const text = report ? reportClipboardText(report) : '';

  /** True when a reason is chosen; otherwise shows the error and moves focus to the choices. */
  const ready = (): boolean => {
    if (report) return true;
    setReasonError(true);
    requestAnimationFrame(() => reasonRef.current?.focus());
    return false;
  };

  useEffect(() => {
    if (copy === 'failed' && fallbackRef.current) {
      fallbackRef.current.focus();
      fallbackRef.current.select();
    }
  }, [copy]);

  async function copyReport() {
    if (!ready()) return;
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  }

  const edited = () => {
    if (copy === 'copied') setCopy('idle');
  };

  return (
    <>
      <dl className={styles.meta}>
        <dt>Item</dt>
        <dd>
          <code>{request.itemId}</code>
        </dd>
        {request.instance ? (
          <>
            <dt>Instance</dt>
            <dd>
              <code>{request.instance}</code>
            </dd>
          </>
        ) : null}
        {request.where ? (
          <>
            <dt>Where</dt>
            <dd>{request.where}</dd>
          </>
        ) : null}
      </dl>

      <RadioGroup<ReportReason | ''>
        ref={reasonRef}
        legend="What's the problem?"
        name="report-reason"
        value={reason}
        error={reasonError && !reason ? NO_REASON : null}
        onChange={(r) => {
          setReason(r);
          setReasonError(false);
          edited();
        }}
        options={REPORT_REASONS.map((r) => ({ value: r.id, label: r.label }))}
      />

      <TextArea
        label="Note"
        hint="Optional. Say what's wrong and, if you know, what it should say."
        value={note}
        maxLength={NOTE_MAX}
        rows={4}
        onChange={(e) => {
          setNote(e.target.value);
          edited();
        }}
      />

      <p className={styles.help}>
        No GitHub account? Copy the report and send it to whoever shared COLDBOOT with you.
      </p>

      <p role="status" className={styles.status}>
        {copy === 'copied' ? 'Report copied to the clipboard.' : ''}
      </p>
      {copy === 'failed' ? (
        <div className={styles.fallback}>
          <TextArea
            ref={fallbackRef}
            label="Report text"
            hint="Your browser didn't allow copying. The text is selected: press Ctrl+C (or Cmd+C on a Mac) to copy it."
            value={text}
            readOnly
            rows={8}
          />
        </div>
      ) : null}

      <DialogActions className={styles.actions}>
        <ExternalButtonLink
          href={report ? issueUrl(report) : ISSUE_URL}
          variant="primary"
          onClick={(e) => {
            if (!ready()) e.preventDefault();
          }}
        >
          Open GitHub issue
        </ExternalButtonLink>
        <Button onClick={() => void copyReport()}>Copy report</Button>
        <Button variant="quiet" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </>
  );
}
