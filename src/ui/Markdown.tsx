import { memo, useMemo } from 'react';
import { renderInline, renderMarkdown } from '../content/markdown';
import './markdown.css';

interface MarkdownProps {
  /** Bundled content text only. Never pass user-typed or imported strings. */
  text: string;
  inline?: boolean;
  className?: string;
}

/** Renders the content Markdown subset. markdown-it escapes raw HTML, so the output is safe to inject. */
export const Markdown = memo(function Markdown({ text, inline = false, className }: MarkdownProps) {
  const html = useMemo(() => (inline ? renderInline(text) : renderMarkdown(text)), [text, inline]);
  const cls = ['md', className].filter(Boolean).join(' ');
  return inline ? (
    <span className={cls} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <div className={cls} dangerouslySetInnerHTML={{ __html: html }} />
  );
});
