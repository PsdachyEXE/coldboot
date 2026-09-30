import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fromSortInstance } from '../games/sort/items';
import { useAttempts } from '../state/attempts';
import { useSettings } from '../state/settings';
import { useAnnouncer } from '../ui/announce';
import { BlockView } from './BlockView';
import { useTerminalSession } from './session';
import { resetStores } from './testing';
import { TerminalView } from './TerminalView';
import { useTerminal } from './useTerminal';

beforeEach(() => resetStores());
afterEach(() => resetStores());

/** user-event treats [ and { as key syntax; doubling them types them literally. */
const typeable = (s: string) => s.replace(/[[{]/g, '$&$&');

function renderView() {
  const inputRef = createRef<HTMLInputElement>();
  render(
    <MemoryRouter>
      <TerminalView presentation="route" inputRef={inputRef} />
    </MemoryRouter>,
  );
  return screen.getByRole('textbox', { name: /Terminal command|Your answer/ });
}

describe('terminal view', () => {
  it('shows the prompt with the name, a labelled input and idle chips', () => {
    useSettings.getState().setName('Ana');
    const input = renderView();
    expect(screen.getByText('Ana@coldboot:~$')).toBeInTheDocument();
    expect(input).toHaveAttribute('autocapitalize', 'off');
    expect(input).toHaveAttribute('autocorrect', 'off');
    expect(input).toHaveAttribute('spellcheck', 'false');
    expect(input).toHaveAttribute('enterkeyhint', 'send');
    const chips = screen.getByRole('group', { name: 'Suggested commands' });
    expect(within(chips).getAllByRole('button').map((b) => b.textContent)).toEqual(['help', 'ls', 'daily', 'due', 'play sort']);
    const log = screen.getByRole('log', { name: 'Terminal output' });
    expect(log).toHaveAttribute('aria-live', 'off');
    expect(within(log).getByText('COLDBOOT terminal')).toBeInTheDocument();
  });

  it('offers a share chip once a share line has been printed', () => {
    useTerminalSession.getState().setLastShare('COLDBOOT daily 2026-10-02  8/10');
    renderView();
    const chips = screen.getByRole('group', { name: 'Suggested commands' });
    expect(within(chips).getAllByRole('button')[0]).toHaveTextContent('share');
  });

  it('uses student in the prompt until a name is set', () => {
    renderView();
    expect(screen.getByText('student@coldboot:~$')).toBeInTheDocument();
  });

  it('runs a chip as a command', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole('button', { name: 'ls' }));
    expect(screen.getByRole('table', { name: 'Games' })).toBeInTheDocument();
  });

  it('plays one round of sort, with feedback, chips, announcements and an abort button', async () => {
    const user = userEvent.setup();
    const input = renderView();
    await user.type(input, 'play sort{Enter}');
    await waitFor(() => expect(useTerminalSession.getState().game?.gameId).toBe('sort'));
    expect(screen.getByRole('button', { name: 'Abort game' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toBe(input);

    for (let i = 0; i < 10; i++) {
      const current = useTerminalSession.getState().game!.session.current!()!;
      const item = fromSortInstance(current.instance!)!;
      const expected = item.check('?').expected;
      const chips = useTerminalSession.getState().game!.chips;
      if (chips.length) expect(screen.getByRole('group', { name: 'Suggested answers' })).toBeInTheDocument();
      if (i === 0) {
        // The first answer is wrong on purpose: "Incorrect", the expected answer and the reason.
        const nums = expected.match(/-?\d+/g) ?? [];
        const candidates = [...chips, [...nums].reverse().join(' '), [...nums.slice(1), nums[0]].join(' '), `[${nums.join(' ')}] []`, String(Number(nums[0] ?? 0) + 1)];
        const wrong = candidates.find((c) => {
          const r = item.check(c);
          return r.counted !== false && !r.correct;
        });
        expect(wrong, `no wrong answer found for ${current.instance}`).toBeDefined();
        await user.type(input, `${typeable(wrong!)}{Enter}`);
        expect(useTerminalSession.getState().game?.session.progress?.current).toBe(2);
        expect(screen.getByText('Incorrect')).toBeInTheDocument();
        expect(screen.getByText(`Expected: ${expected}`)).toBeInTheDocument();
        expect(useAnnouncer.getState().polite).toMatch(/^Incorrect\. Expected: /);
        continue;
      }
      await user.type(input, `${typeable(/^[A-D]\. /.test(expected) ? expected[0] : expected)}{Enter}`);
    }

    expect(useTerminalSession.getState().game).toBeNull();
    expect(screen.getByText('Round complete: 9 of 10 correct.')).toBeInTheDocument();
    expect(screen.getAllByText('Correct')).toHaveLength(9);
    expect(useAttempts.getState().log).toHaveLength(10);
    expect(useTerminal.getState().lastGameEnd?.gameId).toBe('sort');
    expect(screen.queryByRole('button', { name: 'Abort game' })).toBeNull();
  });

  it('aborts a game from the button', async () => {
    const user = userEvent.setup();
    const input = renderView();
    await user.type(input, 'play search --hard{Enter}');
    await waitFor(() => expect(useTerminalSession.getState().game?.gameId).toBe('search'));
    expect(screen.getByText('Hard difficulty, 10 questions. Answer at the prompt and press Enter. Press Ctrl+C or select Abort game to stop.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abort game' }));
    expect(screen.getByText('Game aborted.')).toBeInTheDocument();
    expect(useTerminalSession.getState().game).toBeNull();
  });
});

describe('block renderer', () => {
  function renderBlock(block: Parameters<typeof BlockView>[0]['block'], animate = false) {
    return render(
      <MemoryRouter>
        <BlockView block={block} animate={animate} />
      </MemoryRouter>,
    );
  }

  it('renders text as plain text, never HTML', () => {
    const { container } = renderBlock({ kind: 'text', text: '<b>bold</b>', tone: 'muted' });
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('<b>bold</b>')).toBeInTheDocument();
  });

  it('renders Markdown only for markdown blocks', () => {
    const { container } = renderBlock({ kind: 'markdown', text: 'Use **binary** search' });
    expect(container.querySelector('strong')?.textContent).toBe('binary');
  });

  it('renders highlighted pseudocode with the index base', () => {
    const { container } = renderBlock({ kind: 'pseudo', code: 'IF x > 1 THEN\n  DISPLAY x\nENDIF', indexBase: 0, title: 'Module' });
    expect(container.querySelector('pre.pseudo')).not.toBeNull();
    expect(container.querySelectorAll('.ps-kw').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Array indexes start at 0.')).toBeInTheDocument();
  });

  it('renders tables with headers, links, lists, pre, rules and progress', () => {
    renderBlock({ kind: 'table', caption: 'Games', columns: ['Game', 'What'], rows: [['sort', 'Sorting']] });
    expect(screen.getByRole('table', { name: 'Games' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'sort' })).toBeInTheDocument();
    renderBlock({ kind: 'link', label: 'Open review', to: '/review' });
    expect(screen.getByRole('link', { name: 'Open review' })).toHaveAttribute('href', '/review');
    renderBlock({ kind: 'list', items: ['one', 'two'], ordered: true });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    renderBlock({ kind: 'pre', text: '[3, 1]', label: 'Starting array' });
    expect(screen.getByText('[3, 1]').tagName).toBe('PRE');
    renderBlock({ kind: 'rule' });
    expect(screen.getByRole('separator')).toBeInTheDocument();
    renderBlock({ kind: 'progress', current: 3, total: 10 });
    expect(screen.getByText(/Question 3 of 10/)).toBeInTheDocument();
  });

  it('renders lettered choices, with Markdown only when flagged', () => {
    const { container } = renderBlock({ kind: 'choices', options: ['**One**', 'Two'], markdown: true });
    expect(screen.getByText('A.')).toBeInTheDocument();
    expect(screen.getByText('B.')).toBeInTheDocument();
    expect(container.querySelector('strong')?.textContent).toBe('One');
    const plain = renderBlock({ kind: 'choices', options: ['**Three**'], labels: 'numbers' });
    expect(plain.container.querySelector('strong')).toBeNull();
    expect(screen.getByText('1.')).toBeInTheDocument();
  });

  it('renders feedback with a glyph and a word, the expected answer only when wrong, and the nudge', () => {
    const right = renderBlock({ kind: 'feedback', correct: true, expected: '3', reason: 'Because.' });
    expect(within(right.container).getByText('Correct')).toBeInTheDocument();
    expect(within(right.container).getByText('✓')).toHaveAttribute('aria-hidden', 'true');
    expect(within(right.container).queryByText(/Expected/)).toBeNull();
    const wrong = renderBlock({ kind: 'feedback', correct: false, expected: '3, 1', reason: 'Because.' }, true);
    expect(within(wrong.container).getByText('Incorrect')).toBeInTheDocument();
    expect(within(wrong.container).getByText('Expected: 3, 1')).toBeInTheDocument();
    expect(wrong.container.firstElementChild?.className).toMatch(/nudge/);
    const still = renderBlock({ kind: 'feedback', correct: false, expected: '3' }, false);
    expect(still.container.firstElementChild?.className).not.toMatch(/nudge/);
  });

  it('echoes commands with the prompt', () => {
    renderBlock({ kind: 'command', prompt: 'ana@coldboot:~$', input: 'ls' });
    expect(screen.getByText('ana@coldboot:~$')).toBeInTheDocument();
    expect(screen.getByText('ls')).toBeInTheDocument();
  });

  it('renders figures through FigureView', () => {
    const { container } = renderBlock({ kind: 'figure', figure: { id: 'f', kind: 'pseudocode', code: 'DISPLAY 1', title: 'Listing' } });
    expect(container.querySelector('[data-figure="pseudocode"]')).not.toBeNull();
  });
});
