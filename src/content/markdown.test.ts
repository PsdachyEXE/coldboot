import { describe, expect, it } from 'vitest';
import { renderCloze, renderInline, renderMarkdown, renderPseudo } from './markdown';

describe('markdown', () => {
  it('escapes raw HTML instead of rendering it', () => {
    const html = renderMarkdown('Hello <script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('blocks javascript: and data: links but keeps https and app routes', () => {
    expect(renderInline('[x](javascript:alert(1))')).not.toContain('href');
    expect(renderInline('[x](data:text/html;base64,AAAA)')).not.toContain('href');
    expect(renderInline('[VCAA](https://www.vcaa.vic.edu.au/)')).toContain('rel="noopener noreferrer"');
    expect(renderInline('[Drill](#/drill?kk=U3O1-KK04)')).toContain('href="#/drill?kk=U3O1-KK04"');
  });

  it('never emits inline style attributes (the CSP blocks them)', () => {
    const html = renderMarkdown('| Left | Right | Centre |\n|:--|--:|:-:|\n| a | b | c |');
    expect(html).not.toContain('style=');
    expect(html).toContain('md-align-right');
    expect(html).toContain('md-align-center');
  });

  it('renders pseudo fences with numbered lines and highlighted keywords', () => {
    const html = renderMarkdown('```pseudo\nBEGIN\n  x ← 5\n  DISPLAY "done"\nEND\n```');
    expect(html).toContain('class="pseudo"');
    expect(html).toContain('<span class="ps-kw">BEGIN</span>');
    expect(html).toContain('<span class="ps-str">&quot;done&quot;</span>');
    expect(html.match(/class="ps-ln"/g)).toHaveLength(4);
    expect(renderPseudo('IF a < b THEN', { highlightLines: [1] })).toContain('ps-mark');
    expect(renderPseudo('a < b')).toContain('&lt;');
  });

  it('hides and reveals cloze gaps', () => {
    expect(renderCloze('A {{binary search}} needs sorted data.', false)).toBe('A [ ... ] needs sorted data.');
    expect(renderCloze('A {{binary search}} needs sorted data.', true)).toBe('A **binary search** needs sorted data.');
  });
});
