import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { issueUrl, reportClipboardText } from '../lib/report';
import { ReportDialog } from './ReportDialog';
import { openReport, useReportDialog } from './report';

const BUILD = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

function setClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

describe('ReportDialog', () => {
  afterEach(() => {
    act(() => useReportDialog.getState().closeReport());
    setClipboard(undefined);
  });

  it('stays closed until a report is requested', () => {
    render(<ReportDialog />);
    expect(screen.queryByText('Report a content problem')).not.toBeInTheDocument();
  });

  it('shows the item and instance and builds the GitHub issue URL from the choices', () => {
    render(<ReportDialog />);
    act(() => openReport({ itemId: 'gen-sort-selection', instance: 'sort:seed=12:i=3:hard', where: 'Review' }));

    const dialog = screen.getByRole('dialog', { name: 'Report a content problem' });
    expect(within(dialog).getByText('gen-sort-selection')).toBeInTheDocument();
    expect(within(dialog).getByText('sort:seed=12:i=3:hard')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByLabelText('Typo'));
    fireEvent.change(within(dialog).getByLabelText('Note'), { target: { value: 'Pass 2 is wrong.' } });

    const link = within(dialog).getByRole('link', { name: /Open GitHub issue/ });
    const expected = issueUrl({
      itemId: 'gen-sort-selection',
      reason: 'typo',
      note: 'Pass 2 is wrong.',
      appVersion: BUILD,
      instance: 'sort:seed=12:i=3:hard',
      where: 'Review',
    });
    expect(link).toHaveAttribute('href', expected);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('copies the report and confirms it in words', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    setClipboard(writeText);
    render(<ReportDialog />);
    act(() => openReport({ itemId: 'm-u3o1-kk12-002' }));
    fireEvent.click(screen.getByLabelText('Wrong answer'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));
    });
    expect(writeText).toHaveBeenCalledWith(
      reportClipboardText({ itemId: 'm-u3o1-kk12-002', reason: 'wrong-answer', note: '', appVersion: BUILD }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Report copied to the clipboard.');
  });

  it('falls back to selectable text when the clipboard is blocked', async () => {
    setClipboard(() => Promise.reject(new Error('NotAllowedError')));
    render(<ReportDialog />);
    act(() => openReport({ itemId: 'm-u3o1-kk12-002' }));
    fireEvent.click(screen.getByLabelText('Unclear'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));
    });
    const fallback = screen.getByLabelText('Report text') as HTMLTextAreaElement;
    expect(fallback).toHaveAttribute('readonly');
    expect(fallback.value).toContain('Item: m-u3o1-kk12-002');
    expect(fallback).toHaveFocus();
  });

  it('falls back when there is no clipboard API at all', async () => {
    setClipboard(undefined);
    render(<ReportDialog />);
    act(() => openReport({ itemId: 'c-u3o1-kk04-003' }));
    fireEvent.click(screen.getByLabelText('Other'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));
    });
    expect(screen.getByLabelText('Report text')).toBeInTheDocument();
  });

  it('starts with no reason and asks for one before sending or copying', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    setClipboard(writeText);
    render(<ReportDialog />);
    act(() => openReport({ itemId: 'm-u3o1-kk12-002' }));
    const dialog = screen.getByRole('dialog', { name: 'Report a content problem' });
    expect(within(dialog).getAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(false);

    const link = within(dialog).getByRole('link', { name: /Open GitHub issue/ });
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => {
      link.dispatchEvent(click);
    });
    expect(click.defaultPrevented).toBe(true);
    const group = within(dialog).getByRole('group', { name: "What's the problem?" });
    expect(group).toHaveAccessibleDescription(/Choose what's wrong/);

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Copy report' }));
    });
    expect(writeText).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByLabelText('Typo'));
    expect(within(dialog).queryByText(/Choose what's wrong/)).toBeNull();
    expect(link.getAttribute('href')).toContain('typo');
  });

  it('closes with Esc and returns focus to the opener', () => {
    render(
      <>
        <button type="button" onClick={() => openReport({ itemId: 'c-u3o1-kk04-003' })}>
          Report
        </button>
        <ReportDialog />
      </>,
    );
    const opener = screen.getByRole('button', { name: 'Report' });
    opener.focus();
    act(() => opener.click());
    const dialog = screen.getByRole('dialog', { name: 'Report a content problem' });
    expect(opener).not.toHaveFocus();
    act(() => {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    });
    expect(useReportDialog.getState().request).toBeNull();
    expect(opener).toHaveFocus();
  });
});
