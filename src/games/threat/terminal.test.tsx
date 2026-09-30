/**
 * The five G2 games (threat, law, naming, types, oop) played through the real terminal view: a
 * right answer prints the feedback and is recorded through recordAttempt by the host, a wrong one
 * shows the expected answer, and input that isn't an answer re-prompts without being recorded.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAttempts } from '../../state/attempts';
import { useTerminalSession } from '../../terminal/session';
import { TerminalView } from '../../terminal/TerminalView';
import { printed, resetStores } from '../../terminal/testing';
import { fromLawInstance } from '../law/items';
import { fromNamingInstance } from '../naming/items';
import { fromOopInstance } from '../oop/items';
import { fromTypesInstance } from '../types-game/items';
import type { QuizItem } from '../types';
import { fromThreatInstance } from './items';

const NOW = new Date('2026-10-01T10:00:00+10:00').getTime();

const GAMES: { id: string; title: string; regenerate: (instance: string) => QuizItem | null; ids: RegExp }[] = [
  { id: 'threat', title: 'Security weaknesses and controls', regenerate: fromThreatInstance, ids: /^gen-threat-(match|e8)$/ },
  { id: 'law', title: 'Privacy, health records and copyright law', regenerate: fromLawInstance, ids: /^gen-law-(act|why)$/ },
  { id: 'naming', title: 'Naming conventions', regenerate: fromNamingInstance, ids: /^gen-naming-(identify|rewrite)$/ },
  { id: 'types', title: 'Data types, structures and sources', regenerate: fromTypesInstance, ids: /^gen-types-(type|structure|source)$/ },
  { id: 'oop', title: 'Classes, objects and access', regenerate: fromOopInstance, ids: /^gen-oop-(principle|object|access)$/ },
];

beforeEach(() => {
  resetStores();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  resetStores();
});

function renderView() {
  const inputRef = createRef<HTMLInputElement>();
  const view = render(
    <MemoryRouter>
      <TerminalView presentation="route" inputRef={inputRef} />
    </MemoryRouter>,
  );
  return { input: screen.getByRole('textbox', { name: /Terminal command|Your answer/ }), container: view.container };
}

function currentItem(regenerate: (instance: string) => QuizItem | null): QuizItem {
  const current = useTerminalSession.getState().game!.session.current!()!;
  return regenerate(current.instance!)!;
}

/** A wrong answer the item counts: another chip or letter, or the expected identifier in capitals. */
function wrongFor(item: QuizItem): string {
  const expected = item.check('?').expected;
  const candidates = [...(item.chips ?? []), 'A', 'B', 'C', 'D', 'camel case', 'none', expected.toUpperCase()];
  return candidates.find((c) => item.check(c).counted !== false && !item.check(c).correct)!;
}

describe('G2 games in the terminal', () => {
  it.each(GAMES)('plays $id: feedback, recording and re-prompts', async ({ id, title, regenerate, ids }) => {
    const user = userEvent.setup();
    const { input } = renderView();
    await user.type(input, `play ${id}{Enter}`);
    await waitFor(() => expect(useTerminalSession.getState().game?.gameId).toBe(id));
    expect(screen.getByText(title)).toBeInTheDocument();

    const first = currentItem(regenerate);
    if (first.check('maybe').counted === false) {
      await user.type(input, 'maybe{Enter}');
      expect(useAttempts.getState().log).toHaveLength(0);
      expect(useTerminalSession.getState().game?.session.progress).toEqual({ current: 1, total: 10 });
    }

    await user.type(input, `${first.check('?').expected}{Enter}`);
    expect(screen.getAllByText('Correct').length).toBeGreaterThan(0);
    expect(useAttempts.getState().log).toHaveLength(1);
    expect(useTerminalSession.getState().game?.session.progress).toEqual({ current: 2, total: 10 });

    const second = currentItem(regenerate);
    const wrong = wrongFor(second);
    await user.type(input, `${wrong}{Enter}`);
    expect(screen.getAllByText('Incorrect').length).toBeGreaterThan(0);
    expect(printed()).toContain(second.check(wrong).expected);
    expect(useAttempts.getState().log).toHaveLength(2);
    for (const attempt of useAttempts.getState().log) expect(JSON.stringify(attempt)).toMatch(new RegExp(ids.source.slice(1, -1)));
  });

  it('draws the object description for an oop object question', async () => {
    const user = userEvent.setup();
    const { input, container } = renderView();
    await user.type(input, 'play oop{Enter}');
    await waitFor(() => expect(useTerminalSession.getState().game?.gameId).toBe('oop'));
    for (let guard = 0; guard < 10; guard++) {
      const item = currentItem(fromOopInstance);
      if (item.id === 'gen-oop-object') break;
      await user.type(input, `${item.check('?').expected}{Enter}`);
    }
    const table = container.querySelector('[data-figure="object"] table');
    expect(table).not.toBeNull();
    expect(table!.textContent).toContain('?');
  });
});
