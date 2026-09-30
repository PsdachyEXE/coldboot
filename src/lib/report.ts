/** Content problem reports (Section 6.11): a prefilled GitHub issue URL and the same text for the clipboard. */

export const REPO_URL = 'https://github.com/PsdachyEXE/coldboot';
export const ISSUE_URL = `${REPO_URL}/issues/new`;
export const PAGES_URL = 'https://psdachyexe.github.io/coldboot/';

export const REPORT_REASONS = [
  { id: 'wrong-answer', label: 'Wrong answer' },
  { id: 'unclear', label: 'Unclear' },
  { id: 'typo', label: 'Typo' },
  { id: 'outside-scope', label: 'Outside the study design' },
  { id: 'other', label: 'Other' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['id'];

export interface ContentReport {
  itemId: string;
  reason: ReportReason;
  note: string;
  /** Build id (`1.0.0+abc1234`) so a report names the exact deploy. */
  appVersion: string;
  /** Generated items only: the instance string that regenerates the item (see AnswerResult.instance). */
  instance?: string;
  /** Optional context line, e.g. "Review" or "terminal: play sort". */
  where?: string;
}

const NOTE_MAX = 2000;

export function reportTitle(r: ContentReport): string {
  const label = REPORT_REASONS.find((x) => x.id === r.reason)?.label ?? 'Other';
  return `Content: ${r.itemId} (${label.toLowerCase()})`;
}

export function reportBody(r: ContentReport): string {
  const label = REPORT_REASONS.find((x) => x.id === r.reason)?.label ?? 'Other';
  const note = r.note.trim().slice(0, NOTE_MAX) || '(no note)';
  return [
    `Item: ${r.itemId}`,
    r.instance ? `Instance: ${r.instance}` : null,
    `Reason: ${label}`,
    r.where ? `Where: ${r.where}` : null,
    `App version: ${r.appVersion}`,
    '',
    'Note:',
    note,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

/** Prefilled new-issue URL. Title and body are URL-encoded; GitHub renders them as plain Markdown text. */
export function issueUrl(r: ContentReport): string {
  const q = new URLSearchParams({ title: reportTitle(r), body: reportBody(r) });
  return `${ISSUE_URL}?${q.toString()}`;
}

/** Clipboard text for people without GitHub accounts. */
export function reportClipboardText(r: ContentReport): string {
  return `${reportTitle(r)}\n\n${reportBody(r)}\n\nReport at ${ISSUE_URL}`;
}
