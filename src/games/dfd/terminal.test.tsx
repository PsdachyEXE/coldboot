/**
 * The dfd game played through the real terminal view: `play dfd` draws a marked diagram, a right
 * answer prints the feedback and is recorded, a wrong one shows the expected answer, and input
 * that isn't an answer re-prompts without being recorded.
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
import type { QuizItem } from '../types';
import { fromDfdInstance } from './items';

const NOW = new Date('2026-10-01T10:00:00+10:00').getTime();

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

/** The item on screen, regenerated from its instance. */
function currentItem(): QuizItem {
  const current = useTerminalSession.getState().game!.session.current!()!;
  return fromDfdInstance(current.instance!)!;
}

/** The first candidate answer the item accepts, and one it counts as wrong. */
function answersFor(item: QuizItem): { right: string; wrong: string } {
  const candidates = [...'ABCDE', '1', '2', '3', '4', '5', '6', ...(item.chips ?? [])];
  const right = candidates.find((c) => item.check(c).correct)!;
  const wrong = candidates.find((c) => !item.check(c).correct && item.check(c).counted !== false)!;
  return { right, wrong };
}

describe('dfd in the terminal', () => {
  it('plays a question: a marked diagram, then feedback that is recorded', async () => {
    const user = userEvent.setup();
    const { input, container } = renderView();
    await user.type(input, 'play dfd{Enter}');
    await waitFor(() => expect(useTerminalSession.getState().game?.gameId).toBe('dfd'));
    expect(screen.getByText('Data flow diagrams')).toBeInTheDocument();

    // The diagram is drawn with its letter markers and a text description.
    const figure = container.querySelector('figure[data-figure="dfd"], figure[data-figure="context"]');
    expect(figure).not.toBeNull();
    expect(figure!.textContent).toMatch(/Marked on the figure/);

    // Input that isn't an answer re-prompts and isn't recorded.
    await user.type(input, 'maybe{Enter}');
    expect(useAttempts.getState().log).toHaveLength(0);
    expect(useTerminalSession.getState().game?.session.progress).toEqual({ current: 1, total: 10 });

    const first = currentItem();
    const { right } = answersFor(first);
    await user.type(input, `${right}{Enter}`);
    expect(screen.getAllByText('Correct').length).toBeGreaterThan(0);
    expect(useAttempts.getState().log).toHaveLength(1);
    expect(useTerminalSession.getState().game?.session.progress).toEqual({ current: 2, total: 10 });

    const second = currentItem();
    const { wrong } = answersFor(second);
    await user.type(input, `${wrong}{Enter}`);
    expect(screen.getAllByText('Incorrect').length).toBeGreaterThan(0);
    expect(printed()).toContain(second.check(wrong).expected);
    expect(useAttempts.getState().log).toHaveLength(2);
    const [a, b] = useAttempts.getState().log;
    expect(JSON.stringify(a)).toMatch(/gen-dfd-(element|label)/);
    expect(JSON.stringify(b)).toMatch(/gen-dfd-(rule|label)/);
  });
});
