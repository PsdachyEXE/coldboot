import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAnnouncer } from '../../ui/announce';
import { MatchGame } from './MatchGame';
import type { MatchPair } from './match';

const PAIRS: MatchPair[] = [
  { id: 'p1', term: 'Alpha', definition: 'The first letter.' },
  { id: 'p2', term: 'Bravo', definition: 'The second letter.' },
  { id: 'p3', term: 'Charlie', definition: 'The third letter.' },
  { id: 'p4', term: 'Delta', definition: 'The fourth letter.' },
  { id: 'p5', term: 'Echo', definition: 'The fifth letter.' },
  { id: 'p6', term: 'Foxtrot', definition: 'The sixth letter.' },
];
const definitionOf = (term: string) => PAIRS.find((p) => p.term === term)!.definition;
const idOf = (term: string) => PAIRS.find((p) => p.term === term)!.id;

const said = () => useAnnouncer.getState().polite;
const terms = () => within(screen.getByRole('list', { name: 'Terms' })).getAllByRole('button');
const definitions = () => within(screen.getByRole('list', { name: 'Definitions' })).getAllByRole('button');
const termButton = (term: string) => terms().find((b) => b.textContent?.startsWith(term))!;
const definitionButton = (term: string) => definitions().find((b) => b.textContent?.startsWith(definitionOf(term)))!;
/** The terms on the board, as their names. */
const dealt = () => terms().map((b) => PAIRS.find((p) => b.textContent?.startsWith(p.term))!.term);
const wires = (container: HTMLElement) => [...container.querySelectorAll('line')].map((l) => [l.getAttribute('data-from'), l.getAttribute('data-to')]);

function setup(props: Partial<Parameters<typeof MatchGame>[0]> = {}) {
  const onBack = vi.fn();
  const view = render(<MatchGame title="Letters" pairs={PAIRS} size={3} onBack={onBack} {...props} />);
  return { ...view, onBack };
}

/** Starts the game with a mouse click, which leaves focus where it is. */
function startWithMouse() {
  fireEvent.click(screen.getByRole('button', { name: 'Start matching' }), { detail: 1 });
}

/** Matches every term on the board by clicking it and then its definition. */
function matchAll() {
  for (const term of dealt()) {
    if (termButton(term).getAttribute('aria-disabled') === 'true') continue;
    // A term left selected by a miss stays selected; clicking it again would let it go.
    if (termButton(term).getAttribute('aria-pressed') !== 'true') fireEvent.click(termButton(term), { detail: 1 });
    fireEvent.click(definitionButton(term), { detail: 1 });
  }
}

/** Where a released pointer lands: jsdom has no layout, so the test says what is under it. */
function dropOn(el: Element | null) {
  (document as unknown as { elementFromPoint: () => Element | null }).elementFromPoint = () => el;
}

describe('MatchGame', () => {
  beforeEach(() => {
    useAnnouncer.setState({ polite: '', assertive: '', seq: 0, politeSeq: 0, assertiveSeq: 0 });
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (document as unknown as { elementFromPoint?: unknown }).elementFromPoint;
  });

  it('waits to be started, then deals a round of terms and shuffled definitions', () => {
    setup();
    expect(screen.getByRole('heading', { level: 3, name: 'Match: Letters' })).toBeInTheDocument();
    expect(screen.getByText(/^6 pairs, 3 at a time\./)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Terms' })).toBeNull();

    startWithMouse();
    expect(terms()).toHaveLength(3);
    expect(definitions()).toHaveLength(3);
    // The same three pairs on both sides, in a different order.
    const left = dealt();
    const right = definitions().map((b) => PAIRS.find((p) => b.textContent?.startsWith(p.definition))!.term);
    expect([...right].sort()).toEqual([...left].sort());
    expect(right).not.toEqual(left);
    expect(screen.getByText('Round 1. 0 of 3 matched, no misses.')).toBeInTheDocument();
    expect(screen.getByText('0 of 6 pairs matched without a miss so far.')).toBeInTheDocument();
    expect(said()).toBe('Round 1: 3 pairs.');
  });

  it('connects a pair with two clicks: the term, then its definition', () => {
    const { container } = setup();
    startWithMouse();
    const [first] = dealt();
    fireEvent.click(termButton(first), { detail: 1 });
    expect(termButton(first)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(definitionButton(first), { detail: 1 });

    for (const button of [termButton(first), definitionButton(first)]) {
      expect(button).toHaveTextContent('Matched');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).not.toHaveAttribute('aria-pressed');
    }
    expect(wires(container)).toEqual([[idOf(first), idOf(first)]]);
    expect(said()).toBe(`Matched: ${first}. 1 of 3.`);
    expect(screen.getByText('Round 1. 1 of 3 matched, no misses.')).toBeInTheDocument();
    expect(screen.getByText(/^1 of 6 pairs matched without a miss/)).toBeInTheDocument();
  });

  it('says "Not this one" for a moment on a wrong definition, counts the miss and keeps the term selected', () => {
    vi.useFakeTimers();
    const { container } = setup();
    startWithMouse();
    const [first, second] = dealt();
    fireEvent.click(termButton(first), { detail: 1 });
    fireEvent.click(definitionButton(second), { detail: 1 });

    expect(definitionButton(second)).toHaveTextContent('Not this one');
    expect(definitionButton(second)).not.toHaveAttribute('aria-disabled');
    expect(wires(container)).toEqual([]);
    expect(said()).toBe(`Not this one. ${first} is still unmatched.`);
    expect(screen.getByText('Round 1. 0 of 3 matched, 1 miss.')).toBeInTheDocument();
    // Still selected, so the next definition can be tried straight away.
    expect(termButton(first)).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(definitionButton(second)).not.toHaveTextContent('Not this one');

    fireEvent.click(definitionButton(first), { detail: 1 });
    expect(termButton(first)).toHaveTextContent('Matched');
    // Matched after a miss: the pair is not yet cleared.
    expect(screen.getByText('Round 1. 1 of 3 matched, 1 miss.')).toBeInTheDocument();
    expect(screen.getByText(/^0 of 6 pairs matched without a miss/)).toBeInTheDocument();
  });

  it('lets a selection be changed, dropped, or asked for when it is missing', () => {
    setup();
    startWithMouse();
    const [first, second] = dealt();
    fireEvent.click(definitionButton(first), { detail: 1 });
    expect(said()).toBe('Select a term first, then its definition.');
    expect(definitionButton(first)).not.toHaveTextContent('Matched');

    fireEvent.click(termButton(first), { detail: 1 });
    fireEvent.click(termButton(second), { detail: 1 });
    expect(termButton(first)).toHaveAttribute('aria-pressed', 'false');
    expect(termButton(second)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(termButton(second), { detail: 1 });
    expect(termButton(second)).toHaveAttribute('aria-pressed', 'false');
  });

  it('plays from the keyboard: Enter selects, Tab reaches the definitions, Enter connects, Escape cancels', async () => {
    const user = userEvent.setup();
    const { container } = setup();
    screen.getByRole('button', { name: 'Start matching' }).focus();
    await user.keyboard('{Enter}');
    // Starting from the keyboard puts focus on the first term.
    const [first, second] = dealt();
    expect(termButton(first)).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(termButton(first)).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{Escape}');
    expect(termButton(first)).toHaveAttribute('aria-pressed', 'false');
    expect(said()).toBe('Cancelled.');

    await user.keyboard('{Enter}');
    for (let i = 0; i < 8 && document.activeElement !== definitionButton(first); i++) await user.tab();
    expect(definitionButton(first)).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(termButton(first)).toHaveTextContent('Matched');
    expect(wires(container)).toEqual([[idOf(first), idOf(first)]]);
    // Focus moves on to the next term still to be matched.
    expect(termButton(second)).toHaveFocus();
  });

  it('moves keyboard focus to Next round when a round ends, and to the first term of the next', async () => {
    const user = userEvent.setup();
    setup();
    screen.getByRole('button', { name: 'Start matching' }).focus();
    await user.keyboard('{Enter}');
    for (const term of dealt()) {
      termButton(term).focus();
      await user.keyboard('{Enter}');
      definitionButton(term).focus();
      await user.keyboard('{Enter}');
    }
    expect(screen.getByRole('button', { name: 'Next round' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Round 2. 0 of 3 matched, no misses.')).toBeInTheDocument();
    expect(terms()[0]).toHaveFocus();
  });

  it('connects a pair by dragging from the term and releasing over its definition', () => {
    const { container } = setup();
    startWithMouse();
    const [first] = dealt();
    const term = termButton(first);
    fireEvent.pointerDown(term, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100 });
    expect(wires(container)).toEqual([]);
    // A few pixels is still a click; further than that draws a line from the term.
    fireEvent.pointerMove(term, { pointerId: 1, pointerType: 'mouse', clientX: 102, clientY: 101 });
    expect(wires(container)).toEqual([]);
    dropOn(definitionButton(first).querySelector('span:last-child'));
    fireEvent.pointerMove(term, { pointerId: 1, pointerType: 'mouse', clientX: 220, clientY: 130 });
    expect(wires(container)).toEqual([[idOf(first), null]]);
    expect(container.querySelector('line')).toHaveAttribute('x2');

    fireEvent.pointerUp(term, { pointerId: 1, pointerType: 'mouse', clientX: 300, clientY: 140 });
    expect(termButton(first)).toHaveTextContent('Matched');
    expect(definitionButton(first)).toHaveTextContent('Matched');
    expect(wires(container)).toEqual([[idOf(first), idOf(first)]]);
    expect(said()).toBe(`Matched: ${first}. 1 of 3.`);
  });

  it('drops the line on a wrong definition, and the click that follows a drag selects nothing', () => {
    const { container } = setup();
    startWithMouse();
    const [first, second] = dealt();
    const term = termButton(first);
    fireEvent.pointerDown(term, { pointerId: 4, pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.pointerMove(term, { pointerId: 4, pointerType: 'touch', clientX: 90, clientY: 60 });
    dropOn(definitionButton(second));
    fireEvent.pointerUp(term, { pointerId: 4, pointerType: 'touch', clientX: 200, clientY: 80 });

    expect(wires(container)).toEqual([]);
    expect(definitionButton(second)).toHaveTextContent('Not this one');
    expect(screen.getByText('Round 1. 0 of 3 matched, 1 miss.')).toBeInTheDocument();
    // Browsers send a click to the term the drag started on.
    fireEvent.click(term, { detail: 1 });
    expect(termButton(first)).toHaveAttribute('aria-pressed', 'false');
  });

  it('cancels a drag released anywhere else, or by another pointer taking over', () => {
    const { container } = setup();
    startWithMouse();
    const [first, second] = dealt();
    const term = termButton(first);
    fireEvent.pointerDown(term, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(term, { pointerId: 1, pointerType: 'mouse', clientX: 90, clientY: 60 });
    dropOn(document.body);
    fireEvent.pointerUp(term, { pointerId: 1, pointerType: 'mouse', clientX: 600, clientY: 600 });
    expect(wires(container)).toEqual([]);
    expect(screen.getByText('Round 1. 0 of 3 matched, no misses.')).toBeInTheDocument();

    // A press with the right mouse button never starts a drag.
    dropOn(definitionButton(second));
    fireEvent.pointerDown(termButton(second), { pointerId: 1, pointerType: 'mouse', button: 2, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(termButton(second), { pointerId: 1, pointerType: 'mouse', clientX: 90, clientY: 60 });
    fireEvent.pointerUp(termButton(second), { pointerId: 1, pointerType: 'mouse', clientX: 200, clientY: 80 });
    expect(wires(container)).toEqual([]);
    expect(termButton(second)).not.toHaveTextContent('Matched');

    fireEvent.pointerDown(term, { pointerId: 2, pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.pointerMove(term, { pointerId: 2, pointerType: 'touch', clientX: 90, clientY: 60 });
    expect(wires(container)).toEqual([[idOf(first), null]]);
    fireEvent.pointerCancel(term, { pointerId: 2, pointerType: 'touch' });
    expect(wires(container)).toEqual([]);
  });

  it('chooses the term when a drag is let go over the term it started from, as a wobbly tap is', () => {
    const { container } = setup();
    startWithMouse();
    const [first] = dealt();
    const term = termButton(first);
    fireEvent.pointerDown(term, { pointerId: 7, pointerType: 'touch', clientX: 40, clientY: 40 });
    fireEvent.pointerMove(term, { pointerId: 7, pointerType: 'touch', clientX: 49, clientY: 44 });
    expect(wires(container)).toEqual([[idOf(first), null]]);
    dropOn(term.querySelector('span'));
    fireEvent.pointerUp(term, { pointerId: 7, pointerType: 'touch', clientX: 49, clientY: 44 });
    expect(wires(container)).toEqual([]);
    expect(termButton(first)).toHaveAttribute('aria-pressed', 'true');
    // If the browser also sends its click, the term stays chosen.
    fireEvent.click(term, { detail: 1 });
    expect(termButton(first)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(definitionButton(first), { detail: 1 });
    expect(termButton(first)).toHaveTextContent('Matched');
  });

  it('sums up a finished round, then deals the next with any missed pair back in it', () => {
    const { onBack } = setup();
    startWithMouse();
    const [first, second] = dealt();
    fireEvent.click(termButton(first), { detail: 1 });
    fireEvent.click(definitionButton(second), { detail: 1 });
    matchAll();

    expect(screen.getByText('Round 1. 3 of 3 matched, 1 miss.')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: 'Next round' }).closest('div')!.parentElement!).getByText('3 of 3 matched, 1 miss.')).toBeInTheDocument();
    expect(said()).toMatch(/Round finished: 3 of 3 matched, 1 miss\.$/);
    expect(screen.queryByText(/Every pair in Letters/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the list' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Next round' }), { detail: 1 });
    expect(screen.getByText('Round 2. 0 of 3 matched, no misses.')).toBeInTheDocument();
    expect(screen.getByText(/^2 of 6 pairs matched without a miss/)).toBeInTheDocument();
    expect(dealt()).toContain(first);
    expect(dealt()).not.toContain(second);
    expect(screen.queryByRole('button', { name: 'Next round' })).toBeNull();
    expect(said()).toBe('Round 2: 3 pairs.');
  });

  it('says so once every pair has been matched without a miss, then starts the set again', () => {
    setup();
    startWithMouse();
    matchAll();
    fireEvent.click(screen.getByRole('button', { name: 'Next round' }), { detail: 1 });
    matchAll();
    expect(screen.getByText('Every pair in Letters has now been matched without a miss. The next round starts the set again.')).toBeInTheDocument();
    expect(said()).toMatch(/Every pair in Letters has now been matched without a miss\.$/);
    fireEvent.click(screen.getByRole('button', { name: 'Next round' }), { detail: 1 });
    expect(screen.getByText('Round 3. 0 of 3 matched, no misses.')).toBeInTheDocument();
    expect(screen.getByText('0 of 6 pairs matched without a miss so far.')).toBeInTheDocument();
  });

  it('deals five pairs a round unless told otherwise', () => {
    setup({ size: undefined });
    expect(screen.getByText(/^6 pairs, 5 at a time\./)).toBeInTheDocument();
    startWithMouse();
    expect(terms()).toHaveLength(5);
  });
});
