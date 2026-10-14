import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { drawerIsListening, setDrawerListening } from '../terminal/dom';
import { TerminalDrawer } from '../terminal/TerminalDrawer';
import { resetStores } from '../terminal/testing';
import { useTerminal } from '../terminal/useTerminal';
import { TerminalDrawerSlot } from './TerminalDrawerSlot';

const backtick = () => act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: '`', cancelable: true })));

beforeEach(() => resetStores());
afterEach(() => {
  setDrawerListening(false);
  resetStores();
});

describe('TerminalDrawerSlot', () => {
  it('opens the terminal on a backtick while the drawer is not yet listening', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TerminalDrawerSlot />
      </MemoryRouter>,
    );
    expect(drawerIsListening()).toBe(false);
    backtick();
    expect(useTerminal.getState().open).toBe(true);
  });

  it('leaves the backtick to the drawer once it listens, so the key is handled exactly once', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TerminalDrawerSlot />
      </MemoryRouter>,
    );
    setDrawerListening(true);
    backtick();
    expect(useTerminal.getState().open).toBe(false);
  });

  it('is told when the drawer starts and stops listening', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <TerminalDrawer />
      </MemoryRouter>,
    );
    expect(drawerIsListening()).toBe(true);
    unmount();
    expect(drawerIsListening()).toBe(false);
  });
});
