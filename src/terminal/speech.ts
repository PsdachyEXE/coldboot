/**
 * Screen reader output for the terminal. The output log is a role="log" region with aria-live off,
 * so nothing is announced twice: after each submitted line (and when a timed game ends), the
 * terminal announces one plain-text digest of what it printed through announce(). Answer feedback
 * leads the digest ("Correct." or "Incorrect. Expected: ..."), followed by the next question. A text
 * or markdown block's `speech` replaces its text in the digest, so a long passage that is already
 * in the log (a case study insert, a model answer) can be a pointer that leaves room for the question.
 */
import { describeFigure } from '../figures/describe';
import { highlightMarkers } from '../figures/highlight';
import { announce } from '../ui/announce';
import type { TerminalBlock } from './blocks';
import { useTerminalSession } from './session';

export const SPEECH_MAX = 1500;

/** Removes the Markdown markers the content subset uses, keeping the words. */
export function stripMarkdown(s: string): string {
  return s
    .replace(/```[a-z]*\n?/g, '')
    .replace(/\*\*|__|\*|`/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*#+\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

function sentence(s: string): string {
  const t = s.replace(/\s*\n+\s*/g, '. ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return /[.?!:]$/.test(t) ? t : `${t}.`;
}

const LETTERS = 'ABCDEFGH';

export function blockToSpeech(b: TerminalBlock): string {
  switch (b.kind) {
    case 'text':
      return sentence(b.speech ?? b.text);
    case 'markdown':
      return sentence(b.speech ?? stripMarkdown(b.text));
    case 'pseudo': {
      const base = b.indexBase === undefined ? '' : ` Array indexes start at ${b.indexBase}.`;
      return `${sentence(`${b.title ? `${b.title}. ` : ''}Pseudocode listing, ${b.code.replace(/\s+$/, '').split('\n').length} lines, shown in the terminal`)}${base}`;
    }
    case 'table': {
      const rows = [b.columns, ...b.rows].map((r) => sentence(r.join(', ')));
      return [b.caption ? sentence(b.caption) : '', ...rows].filter(Boolean).join(' ');
    }
    case 'figure': {
      // Marked elements are read out, so a question about "the element marked B" can be answered
      // without the picture. The full text description sits below the figure.
      const marked = b.highlight ? describeFigure(b.figure, highlightMarkers(b.highlight)).sections.find((s) => s.heading === 'Marked on the figure') : undefined;
      const tail = marked ? ` Marked: ${marked.items.join('; ')}.` : '';
      return `${sentence(`Figure: ${b.figure.title ?? b.figure.kind}`)}${tail}`;
    }
    case 'link':
      return sentence(`Link: ${b.label}`);
    case 'list':
      return b.items.map(sentence).join(' ');
    case 'pre':
      return [b.label ? sentence(b.label) : '', sentence(b.text)].filter(Boolean).join(' ');
    case 'choices':
      return b.options.map((o, i) => sentence(`${b.labels === 'numbers' ? i + 1 : LETTERS[i]}: ${b.markdown ? stripMarkdown(o) : o}`)).join(' ');
    case 'feedback': {
      const strip = (s: string) => (b.markdown ? stripMarkdown(s) : s);
      const parts = [b.correct ? 'Correct.' : 'Incorrect.'];
      if (!b.correct && b.expected) parts.push(sentence(`Expected: ${strip(b.expected)}`));
      if (b.reason) parts.push(sentence(strip(b.reason)));
      return parts.join(' ');
    }
    case 'progress':
      return sentence(`${b.label ?? 'Question'} ${b.current} of ${b.total}`);
    case 'command':
    case 'rule':
      return '';
  }
}

/** One digest for a run of blocks, capped at SPEECH_MAX characters on a word boundary. */
export function blocksToSpeech(blocks: readonly TerminalBlock[], max = SPEECH_MAX): string {
  const text = blocks.map(blockToSpeech).filter(Boolean).join(' ');
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(0, cut.lastIndexOf(' ')))} … The rest is in the terminal output.`;
}

/** Announces everything printed from entry id `from` onwards (skipping command echoes). */
export function announceSince(from: number): void {
  const blocks = useTerminalSession
    .getState()
    .entries.filter((e) => e.id >= from)
    .map((e) => e.block);
  const text = blocksToSpeech(blocks);
  if (text) announce(text);
}
