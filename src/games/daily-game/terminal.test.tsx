/**
 * The daily challenge played through the real terminal view with fixture content: the host keeps
 * the daily record, a stopped day resumes where it left off, and a finished day shows its stored
 * result instead of counting again.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContent } from '../../content/store';
import { useAttempts } from '../../state/attempts';
import { useSession } from '../../state/session';
import { useTerminalSession } from '../../terminal/session';
import { TerminalView } from '../../terminal/TerminalView';
import { resetStores } from '../../terminal/testing';
import { fixtureContent } from '../drill/fixture';
import { dailyItem, dailyRefs, loadGenerators, type Generators } from './index';
import { typedAnswer, wrongAnswer } from './testing';

const NOW = new Date('2026-10-01T10:00:00+10:00').getTime();
const TODAY = '2026-10-01';

/** user-event treats [ and { as key syntax; doubling them types them literally. */
const typeable = (s: string) => s.replace(/[[{]/g, '$&$&');

let generators: Generators;
beforeAll(async () => {
  generators = await loadGenerators();
});

beforeEach(() => {
  resetStores();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  useContent.setState({ index: fixtureContent(), status: 'ready' });
});

afterEach(() => {
  vi.useRealTimers();
  resetStores();
});

function renderView() {
  const inputRef = createRef<HTMLInputElement>();
  render(
    <MemoryRouter>
      <TerminalView presentation="route" inputRef={inputRef} />
    </MemoryRouter>,
  );
  return screen.getByRole('textbox', { name: /Terminal command|Your answer/ });
}

/** The item on screen, rebuilt from the same content and generators. */
function currentItem() {
  const id = useTerminalSession.getState().game!.session.current!()!.itemId;
  const record = useSession.getState().daily[TODAY] ?? null;
  const ref = dailyRefs(TODAY, fixtureContent(), record).refs.find((r) => r.id === id)!;
  return dailyItem(ref, fixtureContent(), generators);
}

async function startDaily(user: ReturnType<typeof userEvent.setup>, input: HTMLElement) {
  await user.type(input, 'daily{Enter}');
  await waitFor(() => expect(useTerminalSession.getState().game?.gameId).toBe('daily'));
}

describe('daily challenge in the terminal', () => {
  it('plays a round, records first attempts and prints the share line', async () => {
    const user = userEvent.setup();
    const input = renderView();
    await startDaily(user, input);
    expect(screen.getByText('Daily challenge')).toBeInTheDocument();
    expect(screen.getByText('10 questions. Answer at the prompt and press Enter. Press Ctrl+C or select Abort game to stop.')).toBeInTheDocument();
    const record = useSession.getState().daily[TODAY];
    expect(record.itemIds).toHaveLength(10);
    expect(record.results).toEqual([]);

    for (let i = 0; i < 10; i++) {
      expect(useTerminalSession.getState().game?.session.progress).toEqual({ current: i + 1, total: 10 });
      const item = currentItem();
      await user.type(input, `${typeable(i === 0 ? wrongAnswer(item) : typedAnswer(item))}{Enter}`);
    }

    expect(useTerminalSession.getState().game).toBeNull();
    expect(screen.getByText('Daily challenge complete: 9 of 10 correct.')).toBeInTheDocument();
    expect(screen.getByText('The next set is ready in 14 h 0 min, at midnight in Melbourne.')).toBeInTheDocument();
    expect(screen.getByText('Type share to copy it to the clipboard.')).toBeInTheDocument();
    const share = 'COLDBOOT daily 2026-10-01  9/10\n⬛🟦🟦🟦🟦🟦🟦🟦🟦🟦';
    expect(useTerminalSession.getState().lastShare).toBe(share);
    expect(screen.getByText((_, el) => el?.tagName === 'PRE' && el.textContent === share)).toBeInTheDocument();
    expect(useSession.getState().daily[TODAY]).toMatchObject({ results: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1], completedAt: NOW });
    expect(useAttempts.getState().log).toHaveLength(10);
  });

  it('carries on after stopping, then shows the stored result without counting again', async () => {
    const user = userEvent.setup();
    const input = renderView();
    await startDaily(user, input);
    for (let i = 0; i < 3; i++) await user.type(input, `${typeable(typedAnswer(currentItem()))}{Enter}`);
    await user.click(screen.getByRole('button', { name: 'Abort game' }));
    expect(screen.getByText('Game aborted.')).toBeInTheDocument();
    expect(useSession.getState().daily[TODAY].results).toEqual([1, 1, 1]);

    await startDaily(user, input);
    expect(screen.getByText('Carrying on from question 4 of 10. Your earlier answers still count.')).toBeInTheDocument();
    expect(useTerminalSession.getState().game?.session.progress).toEqual({ current: 4, total: 10 });
    for (let i = 3; i < 10; i++) {
      const item = currentItem();
      await user.type(input, `${typeable(i === 9 ? wrongAnswer(item) : typedAnswer(item))}{Enter}`);
    }
    expect(screen.getByText('Daily challenge complete: 9 of 10 correct.')).toBeInTheDocument();
    const stored = useSession.getState().daily[TODAY];
    expect(stored.results).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 0]);
    expect(useAttempts.getState().log).toHaveLength(10);

    await user.type(input, 'daily{Enter}');
    await waitFor(() => expect(screen.getByText("You've already finished today's daily challenge: 9 of 10 correct.")).toBeInTheDocument());
    expect(screen.getByText('Only the first attempt counts, so this set is done for today.')).toBeInTheDocument();
    expect(useTerminalSession.getState().game).toBeNull();
    expect(useTerminalSession.getState().lastShare).toBe('COLDBOOT daily 2026-10-01  9/10\n🟦🟦🟦🟦🟦🟦🟦🟦🟦⬛');
    expect(useSession.getState().daily[TODAY]).toEqual(stored);
    expect(useAttempts.getState().log).toHaveLength(10);
  });

  it('refuses a difficulty for the daily challenge', async () => {
    const user = userEvent.setup();
    const input = renderView();
    await user.type(input, 'daily --hard{Enter}');
    expect(screen.getByText('The daily challenge is the same set for everyone, so it has no --easy or --hard option. Type daily to start it.')).toBeInTheDocument();
    expect(useTerminalSession.getState().game).toBeNull();
    expect(useSession.getState().daily[TODAY]).toBeUndefined();
  });
});
