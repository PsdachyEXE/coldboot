import { describe, expect, it } from 'vitest';
import { ISSUE_URL, issueUrl, reportBody, reportClipboardText, reportTitle } from './report';

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

  it('gives the same text for the clipboard', () => {
    expect(reportClipboardText(base)).toContain(reportTitle(base));
    expect(reportClipboardText(base)).toContain(ISSUE_URL);
    expect(reportBody({ ...base, note: '   ' })).toContain('(no note)');
  });
});
