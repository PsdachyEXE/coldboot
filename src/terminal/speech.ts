/**
 * Screen reader output for the terminal. The output log is a role="log" region with aria-live off,
 * so nothing is announced twice: after each submitted line (and when a timed game ends), the
 * terminal announces one plain-text digest of what it printed through announce(). Answer feedback
 * leads the digest ("Correct." or "Incorrect. Expected: ..."), followed by the next question.
 */
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
      return sentence(b.text);
    case 'markdown':
      return sentence(stripMarkdown(b.text));
    case 'pseudo':
      return sentence(`${b.title ? `${b.title}. ` : ''}Pseudocode listing, ${b.code.replace(/\s+$/, '').split('\n').length} lines, shown in the terminal`);
    case 'table': {
      const rows = [b.columns, ...b.rows].map((r) => sentence(r.join(', ')));
      return [b.caption ? sentence(b.caption) : '', ...rows].filter(Boolean).join(' ');
    }
    case 'figure':
      return sentence(`Figure: ${b.figure.title ?? b.figure.kind}`);
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
