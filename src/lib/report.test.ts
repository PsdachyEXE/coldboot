import { describe, expect, it } from 'vitest';
import { ISSUE_URL, ISSUE_URL_MAX, issueUrl, reportBody, reportClipboardText, reportTitle } from './report';

const base = { itemId: 'm-u3o1-kk12-002', reason: 'wrong-answer' as const, note: 'Option C is also defensible.', appVersion: '1.0.0+abc1234' };

describe('content reports', () => {
  it('builds a prefilled GitHub issue URL', () => {
    const url = new URL(issueUrl(base));
    expect(`${url.origin}${url.pathname}`).toBe(ISSUE_URL);
    expect(url.searchParams.get('title')).toBe('Content: m-u3o1-kk12-002 (wrong answer)');
    expect(url.searchParams.get('body')).toContain('Option C is also defensible.');
    expect(url.searchParams.get('body')).toContain('App version: 1.0.0+abc1234');
  });

  it('includes the instance for generated items and caps long notes', () => {
    const body = reportBody({ ...base, instance: 'deskcheck:seed=12:i=3:hard', note: 'x'.repeat(5000) });
    expect(body).toContain('Instance: deskcheck:seed=12:i=3:hard');
    expect(body.length).toBeLessThan(2300);
  });

  it("shortens a long note in the link to stay under GitHub's URL limit, and keeps it whole for the clipboard", () => {
    // Each CJK character or Devanagari letter is 3 UTF-8 bytes, 9 characters once percent-encoded.
    for (const note of ['漢'.repeat(2000), 'क'.repeat(2000), '😀'.repeat(1000)]) {
      const url = issueUrl({ ...base, note });
      expect(url.length).toBeLessThanOrEqual(ISSUE_URL_MAX);
      const body = new URL(url).searchParams.get('body')!;
      expect(body).toContain('Note shortened to fit the link. Use Copy report for the full text.');
      expect(body).not.toMatch(/\uFFFD/);
      expect(reportClipboardText({ ...base, note })).toContain(note);
    }
    // Short notes, and 2,000 characters of English, even with smart quotes, are left alone.
    for (const note of [base.note, 'a'.repeat(2000), '“quoted”'.repeat(250)]) {
      const body = new URL(issueUrl({ ...base, note })).searchParams.get('body')!;
      expect(body).toContain(note);
      expect(body).not.toContain('Note shortened');
    }
  });

  it('gives the same text for the clipboard', () => {
    expect(reportClipboardText(base)).toContain(reportTitle(base));
    expect(reportClipboardText(base)).toContain(ISSUE_URL);
    expect(reportBody({ ...base, note: '   ' })).toContain('(no note)');
  });
});
