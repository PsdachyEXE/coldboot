import { describe, expect, it } from 'vitest';
import { checkContent, containsRawHtml } from '../src/content/check';
import { readContentDir } from '../scripts/readContent';

const report = checkContent(readContentDir());

describe('content', () => {
  it('passes every schema and integrity rule', () => {
    expect(report.errors).toEqual([]);
  });

  // Floors (Section 8.2). Branch CI sets COLDBOOT_SKIP_FLOORS=1 while content is still being authored;
  // the deploy workflow never does.
  it.skipIf(process.env.COLDBOOT_SKIP_FLOORS === '1')('meets the floors for every KK, Terms, PSM and case studies', () => {
    expect(report.floorErrors).toEqual([]);
  });

  it('detects raw HTML but allows use-case stereotypes and code', () => {
    expect(containsRawHtml('Use <<includes>> here')).toBe(false);
    expect(containsRawHtml('Compare `a < b` and `<div>`')).toBe(false);
    expect(containsRawHtml('Click <b>here</b>')).toBe(true);
  });
});
