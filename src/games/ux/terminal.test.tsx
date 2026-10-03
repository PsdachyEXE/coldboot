/**
 * The ux game played through the real terminal view: `play ux` draws a mock-up with its notes and
 * text description, a characteristic typed by name is recorded, the follow-up asks why without
 * drawing the mock-up again, and input that isn't an answer re-prompts without being recorded.
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
import { CHARACTERISTIC_OPTIONS, fromUxInstance } from './items';

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

function currentItem(): QuizItem {
  const current = useTerminalSession.getState().game!.session.current!()!;
  return fromUxInstance(current.instance!)!;
}

describe('ux in the terminal', () => {
  it('draws a mock-up, takes a characteristic by name, then asks why', async () => {
    const user = userEvent.setup();
    const inputRef = createRef<HTMLInputElement>();
    const { container } = render(
      <MemoryRouter>
        <TerminalView presentation="route" inputRef={inputRef} />
      </MemoryRouter>,
    );
    const input = screen.getByRole('textbox', { name: /Terminal command|Your answer/ });
    await user.type(input, 'play ux{Enter}');
    await waitFor(() => expect(useTerminalSession.getState().game?.gameId).toBe('ux'));
    expect(screen.getByText('User experience')).toBeInTheDocument();
    expect(container.querySelectorAll('figure[data-figure="mockup"]')).toHaveLength(1);
    expect(container.querySelector('figure[data-figure="mockup"] svg')).not.toBeNull();
    expect(container.querySelector('figure[data-figure="mockup"]')!.textContent).toMatch(/Text description/);

    await user.type(input, 'maybe{Enter}');
    expect(useAttempts.getState().log).toHaveLength(0);

    const which = currentItem();
    const right = CHARACTERISTIC_OPTIONS.find((name) => which.check(name).correct)!;
    await user.type(input, `${right.toLowerCase()}{Enter}`);
    expect(screen.getAllByText('Correct').length).toBeGreaterThan(0);
    expect(useAttempts.getState().log).toHaveLength(1);
    expect(JSON.stringify(useAttempts.getState().log[0])).toMatch(/gen-ux-which/);

    // The follow-up doesn't draw the mock-up again.
    expect(printed()).toContain(`Follow-up on the same mock-up: its weakest characteristic is ${right.toLowerCase()}.`);
    expect(container.querySelectorAll('figure[data-figure="mockup"]')).toHaveLength(1);
    const why = currentItem();
    const wrong = 'ABCD'.split('').find((l) => !why.check(l).correct)!;
    await user.type(input, `${wrong}{Enter}`);
    expect(screen.getAllByText('Incorrect').length).toBeGreaterThan(0);
    expect(printed()).toContain("That isn't true of this screen");
    expect(useAttempts.getState().log).toHaveLength(2);
    expect(JSON.stringify(useAttempts.getState().log[1])).toMatch(/gen-ux-why/);
  });
});
