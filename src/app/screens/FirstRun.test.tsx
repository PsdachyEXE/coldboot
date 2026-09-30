import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { parseInstant } from '../../lib/time';
import { buildExport } from '../../state/exportImport';
import { useSettings } from '../../state/settings';
import FirstRun from './FirstRun';

function renderFirstRun() {
  const router = createMemoryRouter(
    [
      { path: '/welcome', element: <FirstRun /> },
      { path: '/', element: <p>Home screen</p> },
    ],
    { initialEntries: ['/welcome'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function jsonFile(data: unknown, name = 'coldboot-progress.json'): File {
  return new File([typeof data === 'string' ? data : JSON.stringify(data)], name, { type: 'application/json' });
}

describe('FirstRun', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(parseInstant('2026-09-30T10:00:00+10:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
    useSettings.getState().reset();
  });

  it('prefills the exam as 3:00 pm on Friday 13 November 2026, Melbourne time, and 25 new cards', () => {
    renderFirstRun();
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-13');
    expect(screen.getByLabelText('Start time')).toHaveValue('15:00');
    expect(screen.getByLabelText('New cards per day')).toHaveValue(25);
  });

  it('previews the terminal prompt as the name is typed', () => {
    renderFirstRun();
    expect(screen.getByText('you@coldboot:~$')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Lachie' } });
    expect(screen.getByText('Lachie@coldboot:~$')).toBeInTheDocument();
  });

  it('stores a Melbourne ISO instant, onboards and goes home on Start', async () => {
    const router = renderFirstRun();
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Lachie' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-20' } });
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '09:30' } });
    fireEvent.change(screen.getByLabelText('New cards per day'), { target: { value: '40' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    });
    const s = useSettings.getState();
    expect(s.examAt).toBe('2026-11-20T09:30:00+11:00');
    expect(s.name).toBe('Lachie');
    expect(s.newCardLimit).toBe(40);
    expect(s.onboarded).toBe(true);
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByText('Home screen')).toBeInTheDocument();
  });

  it('keeps the default exam instant when it is left alone', async () => {
    renderFirstRun();
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Sam' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    });
    expect(useSettings.getState().examAt).toBe('2026-11-13T15:00:00+11:00');
  });

  it('shows an error for an empty name, focuses the field and stays put', () => {
    const router = renderFirstRun();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    const input = screen.getByLabelText('Display name');
    expect(screen.getByText('Enter a display name. It appears in the terminal prompt.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();
    expect(useSettings.getState().onboarded).toBe(false);
    expect(router.state.location.pathname).toBe('/welcome');
  });

  it('imports progress for a returning user, confirming first', async () => {
    useSettings.setState({ name: 'Returner', onboarded: true });
    const file = jsonFile(buildExport());
    useSettings.getState().reset();

    const router = renderFirstRun();
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Progress file'), { target: { files: [file] } });
    });
    expect(await screen.findByText(/Ready to import/)).toBeInTheDocument();
    expect(useSettings.getState().onboarded).toBe(false);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Import this file' }));
    });
    expect(useSettings.getState().name).toBe('Returner');
    expect(router.state.location.pathname).toBe('/');
  });

  it('shows import errors verbatim', async () => {
    renderFirstRun();
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Progress file'), { target: { files: [jsonFile('{"app":"other"}')] } });
    });
    expect(await screen.findByText('That file is not a COLDBOOT progress export. Choose the file you exported from Settings.')).toBeInTheDocument();
  });
});
