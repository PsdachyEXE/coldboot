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

  it('gives a comparison table with an empty corner row headers instead of an empty column header', () => {
    // A compare card: the rows are the aspects compared, so each row's first cell heads that row.
    const html = renderMarkdown('| | Linear search | Binary search |\n|---|---|---|\n| Data order | Any | Must be sorted |\n| Method | One by one | Halves the range |');
    expect(html).not.toMatch(/<th[^>]*>\s*<\/th>/);
    expect(html).toMatch(/<thead>\s*<tr>\s*<td><\/td>\s*<th>Linear search<\/th>\s*<th>Binary search<\/th>/);
    expect(html).toContain('<th scope="row">Data order</th>');
    expect(html).toContain('<th scope="row">Method</th>');
    expect(html).toContain('<td>Must be sorted</td>');
    expect(html.match(/<th scope="row">/g)).toHaveLength(2);
  });

  it('leaves a table with a corner header as it is', () => {
    const html = renderMarkdown('| Term | Meaning |\n|---|---|\n| Validation | Checking input is reasonable |');
    expect(html).toContain('<th>Term</th>');
    expect(html).toContain('<td>Validation</td>');
    expect(html).not.toContain('scope="row"');
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

  it('leaves True and False in regular weight, as the exam prints them', () => {
    const html = renderPseudo('IF found = False THEN\n    RETURN True\nENDIF');
    expect(html).toContain('<span class="ps-kw">RETURN</span>');
    expect(html).toContain('<span class="ps-kw">IF</span>');
    expect(html).toMatch(/= False <span class="ps-kw">THEN<\/span>/);
    expect(html).not.toMatch(/<span class="ps-kw">(True|False|TRUE|FALSE)<\/span>/);
    // Older listings that still write TRUE and FALSE aren't bolded either.
    expect(renderPseudo('done ← TRUE')).not.toContain('ps-kw');
    expect(renderPseudo('SET total TO 0')).toContain('<span class="ps-kw">SET</span>');
    // Every reserved word the interpreter knows is upper case and bold, LENGTH included.
    expect(renderPseudo('n ← LENGTH(name) MOD 2')).toContain('<span class="ps-kw">LENGTH</span>(name) <span class="ps-kw">MOD</span>');
  });

  it('renders the ASCII comparisons =, <>, <, <=, >, >= as typed', () => {
    const html = renderPseudo('IF a <> b AND c <= 4 AND d >= 5 AND e < 6 AND f > 7 AND g = 8 THEN');
    for (const op of ['&lt;&gt;', '&lt;=', '&gt;=', '&lt;', '&gt;', ' = ']) expect(html).toContain(op);
    expect(html).not.toMatch(/<(?!\/?span\b|\/?pre\b|\/?code\b)/);
    const text = html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/^\s*1/, '');
    expect(text).toBe('IF a <> b AND c <= 4 AND d >= 5 AND e < 6 AND f > 7 AND g = 8 THEN');
    const fenced = renderMarkdown('```pseudo\nWHILE count <> 0 DO\n    count ← count - 1\nENDWHILE\n```');
    expect(fenced).toContain('count &lt;&gt; <span class="ps-num">0</span>');
  });

  it('hides and reveals cloze gaps', () => {
    expect(renderCloze('A {{binary search}} needs sorted data.', false)).toBe('A [ ... ] needs sorted data.');
    expect(renderCloze('A {{binary search}} needs sorted data.', true)).toBe('A **binary search** needs sorted data.');
  });
});
