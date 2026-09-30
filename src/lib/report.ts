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
  return bodyWithNote(r, r.note.trim().slice(0, NOTE_MAX) || '(no note)');
}

function bodyWithNote(r: ContentReport, note: string): string {
  const label = REPORT_REASONS.find((x) => x.id === r.reason)?.label ?? 'Other';
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

/**
 * Longest issue link offered. GitHub answers 414 (URI too long) from a little over 8,100
 * characters, and percent-encoding turns each non-Latin character into 6 to 12, so a long note in
 * another script can pass it well within the note's 2,000-character cap.
 */
export const ISSUE_URL_MAX = 8000;
const SHORTENED = '\n\n[Note shortened to fit the link. Use Copy report for the full text.]';

/**
 * Prefilled new-issue URL. Title and body are URL-encoded; GitHub renders them as plain Markdown
 * text. A note too long for the link is shortened in the link only (the clipboard text keeps it).
 */
export function issueUrl(r: ContentReport): string {
  const link = (body: string) => `${ISSUE_URL}?${new URLSearchParams({ title: reportTitle(r), body }).toString()}`;
  const full = link(reportBody(r));
  if (full.length <= ISSUE_URL_MAX) return full;
  // The longest start of the note that fits, in whole code points so a surrogate pair is never split.
  const chars = Array.from(r.note.trim().slice(0, NOTE_MAX));
  const shortened = (n: number) => link(bodyWithNote(r, `${chars.slice(0, n).join('').trimEnd()}${SHORTENED}`));
  let lo = 0;
  let hi = chars.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (shortened(mid).length <= ISSUE_URL_MAX) lo = mid;
    else hi = mid - 1;
  }
  return shortened(lo);
}

/** Clipboard text for people without GitHub accounts. */
export function reportClipboardText(r: ContentReport): string {
  return `${reportTitle(r)}\n\n${reportBody(r)}\n\nReport at ${ISSUE_URL}`;
}
