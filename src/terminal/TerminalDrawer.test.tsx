import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '../state/session';
import { SUDO_MESSAGE } from './commands';
import { useTerminalSession } from './session';
import { TerminalDrawer } from './TerminalDrawer';
import TerminalScreen from './TerminalScreen';
import { resetStores } from './testing';
import { useTerminal } from './useTerminal';

function Page() {
  return (
    <>
      <button type="button">Page button</button>
      <label>
        Page field
        <input />
      </label>
      <TerminalDrawer />
    </>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Page />} />
        <Route
          path="/terminal"
          element={
            <>
              <button type="button">Route button</button>
              <TerminalScreen />
              <TerminalDrawer />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const drawer = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const drawerInput = () => within(drawer()).getByRole('textbox', { name: 'Terminal command' });

beforeEach(() => resetStores());
afterEach(() => resetStores());

describe('terminal drawer', () => {
  it('toggles with the backtick, moves focus in, and returns it on close', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const pageButton = screen.getByRole('button', { name: 'Page button' });
    pageButton.focus();
    expect(drawer()).toHaveAttribute('data-open', 'false');
    await user.keyboard('`');
    expect(drawer()).toHaveAttribute('data-open', 'true');
    expect(drawer()).toHaveAccessibleName('Terminal');
    expect(drawerInput()).toHaveFocus();
    expect(drawerInput()).toHaveValue('');
    // Inside the terminal input, the backtick closes the drawer.
    await user.keyboard('`');
    expect(drawer()).toHaveAttribute('data-open', 'false');
    expect(pageButton).toHaveFocus();
  });

  it('closes with Esc and with the close button', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const pageButton = screen.getByRole('button', { name: 'Page button' });
    pageButton.focus();
    await user.keyboard('`');
    await user.keyboard('{Escape}');
    expect(drawer()).toHaveAttribute('data-open', 'false');
    expect(pageButton).toHaveFocus();
    await user.keyboard('`');
    await user.click(within(drawer()).getByRole('button', { name: 'Close' }));
    expect(useTerminal.getState().open).toBe(false);
  });

  it('leaves the backtick alone in other text fields', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const field = screen.getByRole('textbox', { name: 'Page field' });
    await user.click(field);
    await user.keyboard('`');
    expect(field).toHaveValue('`');
    expect(useTerminal.getState().open).toBe(false);
  });

  it('keeps Tab inside the open drawer', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.keyboard('`');
    const close = within(drawer()).getByRole('button', { name: 'Close' });
    close.focus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(drawer().contains(document.activeElement)).toBe(true);
    const chips = within(drawer()).getAllByRole('button');
    chips.at(-1)!.focus();
    await user.keyboard('{Tab}');
    expect(close).toHaveFocus();
  });

  it('runs a command another screen asks for', async () => {
    renderAt('/');
    act(() => useTerminal.getState().run('sudo make coffee'));
    await waitFor(() => expect(within(drawer()).getByText(SUDO_MESSAGE)).toBeInTheDocument());
    expect(drawer()).toHaveAttribute('data-open', 'true');
    expect(useTerminal.getState().pending).toBeNull();
  });

  it('clears with Ctrl+L and echoes ^C with Ctrl+C', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.keyboard('`');
    await user.keyboard('help{Enter}');
    expect(within(drawer()).getByRole('table', { name: 'Commands' })).toBeInTheDocument();
    await user.keyboard('{Control>}l{/Control}');
    expect(within(drawer()).queryByRole('table')).toBeNull();
    expect(useTerminalSession.getState().entries).toEqual([]);
    await user.keyboard('abc{Control>}c{/Control}');
    expect(within(drawer()).getByText('abc^C')).toBeInTheDocument();
    expect(drawerInput()).toHaveValue('');
    // With focus on the output log, Ctrl+C still aborts a game.
    await user.keyboard('play sort{Enter}');
    await waitFor(() => expect(useTerminalSession.getState().game).not.toBeNull());
    within(drawer()).getByRole('log').focus();
    await user.keyboard('{Control>}c{/Control}');
    expect(useTerminalSession.getState().game).toBeNull();
    expect(within(drawer()).getByText('Game aborted.')).toBeInTheDocument();
  });

  it('completes with Tab and walks history with Up and Down', async () => {
    const user = userEvent.setup();
    useSession.getState().pushHistory('ls');
    renderAt('/');
    await user.keyboard('`');
    await user.keyboard('pl{Tab}');
    expect(drawerInput()).toHaveValue('play ');
    await user.keyboard('{Tab}');
    expect(drawerInput()).toHaveValue('play s');
    expect(within(drawer()).getByText('sort search')).toBeInTheDocument();
    await user.keyboard('{ArrowUp}');
    expect(drawerInput()).toHaveValue('ls');
    await user.keyboard('{ArrowDown}');
    expect(drawerInput()).toHaveValue('play s');
  });

  it('closes when a command opens a study screen', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.keyboard('`');
    await user.keyboard('map{Enter}');
    expect(useTerminal.getState().open).toBe(false);
  });
});

describe('terminal route', () => {
  it('focuses its own input on the backtick and never opens the drawer', async () => {
    const user = userEvent.setup();
    renderAt('/terminal');
    expect(screen.getByRole('heading', { level: 1, name: 'Terminal' })).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: 'Terminal command' });
    await waitFor(() => expect(input).toHaveFocus());
    screen.getByRole('button', { name: 'Route button' }).focus();
    await user.keyboard('`');
    expect(input).toHaveFocus();
    expect(useTerminal.getState().open).toBe(false);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('runs pending commands and shares the session with the drawer', async () => {
    useTerminalSession.getState().print({ kind: 'text', text: 'From the drawer' });
    renderAt('/terminal');
    expect(screen.getByText('From the drawer')).toBeInTheDocument();
    act(() => useTerminal.getState().run('sudo ls'));
    await waitFor(() => expect(screen.getByText(SUDO_MESSAGE)).toBeInTheDocument());
    expect(useTerminal.getState().open).toBe(false);
  });

  it('exit goes home', async () => {
    const user = userEvent.setup();
    renderAt('/terminal');
    await user.type(screen.getByRole('textbox', { name: 'Terminal command' }), 'exit{Enter}');
    expect(await screen.findByRole('button', { name: 'Page button' })).toBeInTheDocument();
  });
});
