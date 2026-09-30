import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { parseInstant } from '../../lib/time';
import { exportFilename } from '../../state/exportImport';
import { useSettings } from '../../state/settings';
import { useSrs } from '../../state/srs';
import { resetPwaForTests } from '../pwa';
import Settings from './Settings';

function renderSettings() {
  const router = createMemoryRouter(
    [
      { path: '/settings', element: <Settings /> },
      { path: '/welcome', element: <p>Welcome screen</p> },
    ],
    { initialEntries: ['/settings'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const NOW = parseInstant('2026-09-30T10:00:00+10:00');
const realObjectUrl = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };

describe('Settings', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    useSettings.setState({ name: 'Lachie', onboarded: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    URL.createObjectURL = realObjectUrl.create;
    URL.revokeObjectURL = realObjectUrl.revoke;
    useSettings.getState().reset();
    useSrs.getState().reset();
    resetPwaForTests();
  });

  it('keeps Reset progress disabled until RESET is typed exactly', async () => {
    useSrs.getState().setCard('c-u3o1-kk04-001', { reps: 1, interval: 1, ease: 2.5, due: 1, lapses: 0, last: 1 });
    const router = renderSettings();
    const reset = screen.getByRole('button', { name: 'Reset progress' });
    const confirm = screen.getByLabelText('Type RESET to confirm');
    expect(reset).toBeDisabled();
    fireEvent.change(confirm, { target: { value: 'reset' } });
    expect(reset).toBeDisabled();
    fireEvent.change(confirm, { target: { value: 'RESET ' } });
    expect(reset).toBeDisabled();
    fireEvent.change(confirm, { target: { value: 'RESET' } });
    expect(reset).toBeEnabled();
    await act(async () => {
      fireEvent.click(reset);
    });
    expect(useSettings.getState().onboarded).toBe(false);
    expect(useSettings.getState().name).toBe('');
    expect(Object.keys(useSrs.getState().cards)).toHaveLength(0);
    expect(router.state.location.pathname).toBe('/welcome');
  });

  it('exports progress as a JSON download', async () => {
    const createObjectURL = vi.fn((blob: Blob) => {
      void blob;
      return 'blob:coldboot-export';
    });
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clicks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this);
    });

    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Export progress' }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('application/json');
    const parsed = JSON.parse(await blob.text());
    expect(parsed.app).toBe('coldboot');
    expect(Object.keys(parsed.stores)).toEqual(expect.arrayContaining(['settings', 'srs', 'attempts', 'session']));
    expect(clicks).toHaveLength(1);
    expect(clicks[0].download).toBe(exportFilename(NOW));
    expect(clicks[0].href).toBe('blob:coldboot-export');
    expect(screen.getByText(`Progress exported as ${exportFilename(NOW)}. Keep it somewhere safe, such as your school drive.`)).toBeInTheDocument();
  });

  it('surfaces import errors verbatim and changes nothing', async () => {
    renderSettings();
    const bad = new File(['not json at all'], 'notes.txt', { type: 'text/plain' });
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Progress file'), { target: { files: [bad] } });
    });
    expect(await screen.findByText('That file is not valid JSON. Choose the .json file you exported from Settings.')).toBeInTheDocument();
    expect(useSettings.getState().name).toBe('Lachie');
  });

  it('asks before replacing progress with an import', async () => {
    renderSettings();
    const { buildExport } = await import('../../state/exportImport');
    useSettings.setState({ name: 'Imported' });
    const file = new File([JSON.stringify(buildExport())], 'p.json', { type: 'application/json' });
    useSettings.setState({ name: 'Lachie' });
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Progress file'), { target: { files: [file] } });
    });
    expect(await screen.findByText(/Ready to import/)).toBeInTheDocument();
    expect(screen.getByText(/It can't be undone/)).toBeInTheDocument();
    expect(useSettings.getState().name).toBe('Lachie');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Replace my progress' }));
    });
    expect(useSettings.getState().name).toBe('Imported');
    expect(screen.getByLabelText('Display name')).toHaveValue('Imported');
    expect(screen.getByRole('button', { name: 'Import progress' })).toHaveFocus();
  });

  it('cancels an import without changing anything and returns focus to the chooser', async () => {
    renderSettings();
    const { buildExport } = await import('../../state/exportImport');
    const file = new File([JSON.stringify(buildExport())], 'p.json', { type: 'application/json' });
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Progress file'), { target: { files: [file] } });
    });
    const confirm = await screen.findByRole('button', { name: 'Replace my progress' });
    expect(confirm).toHaveFocus();
    expect(confirm).toHaveAccessibleDescription(/Ready to import\. This file has 0 cards scheduled and 0 attempts/);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText(/Ready to import/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Import progress' })).toHaveFocus();
  });

  it('saves study settings and confirms in words', async () => {
    renderSettings();
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Lachlan' } });
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '09:00' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    });
    expect(useSettings.getState().name).toBe('Lachlan');
    expect(useSettings.getState().examAt).toBe('2026-11-13T09:00:00+11:00');
    expect(screen.getByText('Changes saved.')).toBeInTheDocument();
  });

  it('turns sound on and sets the motion override straight away', () => {
    renderSettings();
    const sound = screen.getByLabelText('Play sounds');
    expect(sound).not.toBeChecked();
    fireEvent.click(sound);
    expect(useSettings.getState().sound).toBe(true);
    fireEvent.click(screen.getByLabelText('Reduce motion'));
    expect(useSettings.getState().motion).toBe('reduce');
  });

  it('shows the version and answers the update check', async () => {
    renderSettings();
    expect(screen.getByText('Build')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }));
    });
    expect(screen.getByText("This browser can't check for updates here. Reload the page to get the latest version.")).toBeInTheDocument();
  });
});
