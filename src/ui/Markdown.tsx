import { memo, useMemo, useRef } from 'react';
import { renderInline, renderMarkdown } from '../content/markdown';
import { useScrollableChildren } from './useScrollableChildren';
import './markdown.css';

/** Wide listings and tables scroll inside their own box; name them for keyboard users. */
const scrollLabel = (el: HTMLElement) => (el.matches('pre') ? 'Code listing' : 'Table');

interface MarkdownProps {
  /** Bundled content text only. Never pass user-typed or imported strings. */
  text: string;
  inline?: boolean;
  className?: string;
}

/** Renders the content Markdown subset. markdown-it escapes raw HTML, so the output is safe to inject. */
export const Markdown = memo(function Markdown({ text, inline = false, className }: MarkdownProps) {
  const html = useMemo(() => (inline ? renderInline(text) : renderMarkdown(text)), [text, inline]);
  const ref = useRef<HTMLDivElement>(null);
  useScrollableChildren(ref, 'pre, .md-table', scrollLabel, html);
  const cls = ['md', className].filter(Boolean).join(' ');
  return inline ? (
    <span className={cls} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <div ref={ref} className={cls} dangerouslySetInnerHTML={{ __html: html }} />
  );
});
