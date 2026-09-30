import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useContent } from '../../content/store';
import { ContentErrorNotice, ContentGate } from './ContentGate';
import { fixtureIndex, resetStudyStores } from './testing';

describe('ContentGate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetStudyStores();
  });

  it('shows a loading line with the page heading while content loads', () => {
    useContent.setState({ status: 'loading', index: null, error: null });
    render(<ContentGate heading="Review">{() => <p>Ready</p>}</ContentGate>);
    expect(screen.getByRole('heading', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading study content');
  });

  it('says what happened on an error and retries', () => {
    const load = vi.fn(() => Promise.resolve(null));
    useContent.setState({ status: 'error', index: null, error: "Study content couldn't be loaded. Check your connection, then try again.", load });
    render(
      <>
        <ContentGate heading="Drill">{() => <p>Ready</p>}</ContentGate>
        <ContentErrorNotice />
      </>,
    );
    expect(screen.getByRole('heading', { name: "Study content didn't load" })).toBeInTheDocument();
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Check your connection, then try again.');
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[1]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('renders the screen once content is ready', () => {
    useContent.setState({ status: 'ready', index: fixtureIndex(), error: null });
    render(<ContentGate heading="Review">{(index) => <p>{index.cards.length} cards</p>}</ContentGate>);
    expect(screen.getByText('0 cards')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Review' })).toBeNull();
  });
});
