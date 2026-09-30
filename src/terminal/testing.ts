/** Test helpers for the terminal: store resets, printed text and a fake game. Imported by tests only. */
import { vi } from 'vitest';
import { useContent } from '../content/store';
import { createQuizSession } from '../games/engine';
import type { GameMeta, QuizItem } from '../games/types';
import { useAttempts } from '../state/attempts';
import { useSession } from '../state/session';
import { useSettings } from '../state/settings';
import { useSrs } from '../state/srs';
import { useAnnouncer } from '../ui/announce';
import { useReportDialog } from '../ui/report';
import type { TerminalBlock } from './blocks';
import type { TerminalEnv } from './commands';
import { useTerminalSession } from './session';
import { useTerminal } from './useTerminal';

export function resetStores(): void {
  useTerminalSession.getState().reset();
  useSession.getState().reset();
  useAttempts.getState().reset();
  useSettings.getState().reset();
  useSrs.getState().reset();
  useContent.setState({ index: null, status: 'idle', error: null });
  useTerminal.setState({ open: false, pending: null, lastGameEnd: null });
  useReportDialog.setState({ request: null });
  useAnnouncer.setState({ polite: '', assertive: '', seq: 0 });
}

export function mockEnv(presentation: TerminalEnv['presentation'] = 'drawer') {
  return { presentation, navigate: vi.fn<(to: string) => void>(), closeDrawer: vi.fn<() => void>() };
}

export function blockText(b: TerminalBlock): string {
  switch (b.kind) {
    case 'text':
    case 'markdown':
      return b.text;
    case 'pre':
      return `${b.label ?? ''} ${b.text}`.trim();
    case 'command':
      return `${b.prompt} ${b.input}`;
    case 'feedback':
      return `${b.correct ? 'Correct' : 'Incorrect'} ${b.expected ?? ''} ${b.reason ?? ''}`.trim();
    case 'link':
      return `${b.label} -> ${b.to}`;
    case 'list':
      return b.items.join('\n');
    case 'table':
      return [b.caption ?? '', b.columns.join(' | '), ...b.rows.map((r) => r.join(' | '))].join('\n');
    case 'choices':
      return b.options.join('\n');
    case 'progress':
      return `${b.current}/${b.total}`;
    default:
      return b.kind;
  }
}

/** Every printed block as text, joined by newlines. */
export function printed(): string {
  return useTerminalSession
    .getState()
    .entries.map((e) => blockText(e.block))
    .join('\n');
}

export function lastBlocks(n: number): TerminalBlock[] {
  return useTerminalSession
    .getState()
    .entries.slice(-n)
    .map((e) => e.block);
}

export function numberItem(n: number, id = `gen-fake-${n}`): QuizItem {
  return {
    id,
    kk: ['U3O1-KK12'],
    instance: `fake:n=${n}`,
    chips: [String(n), 'other'],
    prompt: [{ kind: 'text', text: `Type ${n}.` }],
    check(input) {
      if (!/^\d+$/.test(input.trim())) return { correct: false, expected: String(n), reason: 'Type a number.', counted: false };
      return { correct: Number(input) === n, expected: String(n), reason: `The answer is ${n}.` };
    },
  };
}

export function fakeGame(opts: { id?: string; items?: QuizItem[]; timedMs?: number; exposeItemIds?: boolean; share?: boolean } = {}): GameMeta {
  const id = opts.id ?? 'fake';
  const items = opts.items ?? [numberItem(1), numberItem(2), numberItem(3)];
  return {
    id,
    title: 'Fake game',
    priority: 'P0',
    kk: ['U3O1-KK12'],
    summary: 'A fake game for tests',
    man: 'Fake.',
    load: async () => ({
      id,
      title: 'Fake game',
      kk: ['U3O1-KK12'],
      man: 'Fake.',
      start: (ctx) =>
        createQuizSession({
          gameId: id,
          now: ctx.now,
          items: opts.timedMs ? undefined : items,
          generate: opts.timedMs ? (i) => numberItem(i) : undefined,
          count: opts.timedMs ? Infinity : undefined,
          deadline: opts.timedMs ? ctx.now() + opts.timedMs : undefined,
          exposeItemIds: opts.exposeItemIds,
          shareText: opts.share ? (s) => `COLDBOOT fake ${s.score}/${s.total}` : undefined,
        }),
    }),
  };
}
