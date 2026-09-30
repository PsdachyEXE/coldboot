/**
 * Boxes that scroll sideways become labelled tab stops. They are groups, not regions: the terminal
 * log and a card can hold several with the same label, and duplicate region landmarks are an axe
 * violation (landmark-unique).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlockView } from '../terminal/BlockView';
import { Markdown } from './Markdown';

/** Every box is wider than it is allowed to be, and the observer reports straight away. */
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private cb: () => void) {}
      observe() {
        this.cb();
      }
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('sideways scroll boxes', () => {
  it('makes a wide Markdown listing a focusable group, not a region', () => {
    render(<Markdown text={'```\nDISPLAY "a line far too long to fit in the column"\n```'} />);
    const box = screen.getByRole('group', { name: 'Code listing (scrolls sideways)' });
    expect(box).toHaveAttribute('tabindex', '0');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('does the same for terminal pseudocode, tables and preformatted text', () => {
    render(
      <>
        <BlockView block={{ kind: 'pseudo', code: 'BEGIN\n    DISPLAY "a line far too long"\nEND', title: 'Pseudocode' }} />
        <BlockView block={{ kind: 'table', columns: ['Step', 'i', 'total'], rows: [['1', '0', '0']], caption: 'Trace table' }} />
        <BlockView block={{ kind: 'pre', text: '[#####.....] 5 of 10', label: 'Share line' }} />
      </>,
    );
    for (const name of ['Pseudocode (scrolls sideways)', 'Trace table (scrolls sideways)', 'Share line (scrolls sideways)']) {
      expect(screen.getByRole('group', { name })).toHaveAttribute('tabindex', '0');
    }
    expect(screen.queryByRole('region')).toBeNull();
  });
});
