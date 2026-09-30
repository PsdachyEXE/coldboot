/**
 * Markdown rendering for bundled study content only. markdown-it runs with HTML disabled, so raw
 * HTML in content is escaped rather than rendered. Fenced ```pseudo blocks get line numbers and
 * keyword highlighting in the exam's style. Imported or user-typed strings never pass through here.
 */
import MarkdownIt from 'markdown-it';

type MarkdownRenderer = InstanceType<typeof MarkdownIt>;

/** Uppercase pseudocode keywords highlighted in `pseudo` blocks. */
export const PSEUDO_KEYWORDS = [
  'BEGIN', 'END', 'IF', 'THEN', 'ELSEIF', 'ELSE', 'ENDIF', 'WHILE', 'DO', 'ENDWHILE', 'FOR', 'TO', 'STEP',
  'NEXT', 'ENDFOR', 'REPEAT', 'UNTIL', 'RETURN', 'DISPLAY', 'INPUT', 'OUTPUT', 'PRINT', 'FUNCTION',
  'ENDFUNCTION', 'PROCEDURE', 'ENDPROCEDURE', 'CALL', 'AND', 'OR', 'NOT', 'MOD', 'DIV', 'TRUE', 'FALSE',
  'CASE', 'OF', 'OTHERWISE', 'ENDCASE', 'OPEN', 'CLOSE', 'READ', 'WRITE', 'FROM', 'EACH', 'IN', 'CLASS',
  'ENDCLASS', 'METHOD', 'ENDMETHOD', 'NEW', 'RETURNS',
] as const;

const KEYWORD_SET = new Set<string>(PSEUDO_KEYWORDS);

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const TOKEN = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\/\/.*$)|(\b\d+(?:\.\d+)?\b)|(\b[A-Z][A-Z]+\b)|([^"'/\dA-Z]+|.)/g;

/** Highlights one line of pseudocode into escaped HTML spans. */
export function highlightPseudoLine(line: string): string {
  let out = '';
  for (const m of line.matchAll(TOKEN)) {
    const [whole, str, comment, num, word] = m;
    if (str) out += `<span class="ps-str">${escapeHtml(str)}</span>`;
    else if (comment) out += `<span class="ps-cm">${escapeHtml(comment)}</span>`;
    else if (num) out += `<span class="ps-num">${escapeHtml(num)}</span>`;
    else if (word && KEYWORD_SET.has(word)) out += `<span class="ps-kw">${word}</span>`;
    else out += escapeHtml(whole);
  }
  return out;
}

export interface PseudoOptions {
  /** Number every line from 1 (default true). Exam questions refer to these line numbers. */
  numbered?: boolean;
  /** 1-based line numbers to emphasise (e.g. the line a question asks about). */
  highlightLines?: readonly number[];
}

/** Renders a pseudocode listing as `<pre class="pseudo">` HTML. Trailing blank lines are dropped. */
export function renderPseudo(code: string, opts: PseudoOptions = {}): string {
  const numbered = opts.numbered !== false;
  const marks = new Set(opts.highlightLines ?? []);
  const lines = code.replace(/\s+$/, '').split('\n');
  const width = String(lines.length).length;
  const body = lines
    .map((line, i) => {
      const n = i + 1;
      const ln = numbered ? `<span class="ps-ln" aria-hidden="false">${String(n).padStart(width, ' ')}</span>` : '';
      const cls = marks.has(n) ? 'ps-line ps-mark' : 'ps-line';
      return `<span class="${cls}">${ln}<span class="ps-src">${highlightPseudoLine(line)}</span></span>`;
    })
    .join('\n');
  return `<pre class="pseudo"><code>${body}</code></pre>`;
}

function createRenderer(): MarkdownRenderer {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: false });
  md.disable(['image']);

  // Only same-app hash routes and https links are allowed.
  const defaultValidate = md.validateLink.bind(md);
  md.validateLink = (url: string) => (url.startsWith('#/') || /^https:\/\//i.test(url)) && defaultValidate(url);

  const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = String(tokens[idx].attrGet('href') ?? '');
    if (/^https:\/\//i.test(href)) {
      tokens[idx].attrSet('target', '_blank');
      tokens[idx].attrSet('rel', 'noopener noreferrer');
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const lang = token.info.trim().split(/\s+/)[0];
    if (lang === 'pseudo') return renderPseudo(token.content);
    return `<pre class="code"><code>${escapeHtml(token.content.replace(/\n$/, ''))}</code></pre>\n`;
  };

  // Tables scroll horizontally on narrow screens instead of widening the page.
  md.renderer.rules.table_open = () => '<div class="md-table"><table>\n';
  md.renderer.rules.table_close = () => '</table></div>\n';
  return md;
}

let renderer: MarkdownRenderer | null = null;
function getRenderer(): MarkdownRenderer {
  renderer ??= createRenderer();
  return renderer;
}

/** Block Markdown to HTML. */
export function renderMarkdown(src: string): string {
  return getRenderer().render(src);
}

/** Inline Markdown (no paragraphs) to HTML, for option text, table cells and labels. */
export function renderInline(src: string): string {
  return getRenderer().renderInline(src);
}

/** Replaces cloze gaps `{{text}}` with a visible blank, or reveals them. Returns Markdown. */
export function renderCloze(front: string, reveal: boolean): string {
  return front.replace(/\{\{([^{}]+)\}\}/g, (_m, gap: string) => (reveal ? `**${gap}**` : '[ ... ]'));
}
