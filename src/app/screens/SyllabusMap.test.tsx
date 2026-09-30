import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { kkById } from '../../content/studyDesign';
import { recordAttempt } from '../../state/record';
import { fixtureIndex, fxCard, fxMcq, fxShort, provideContent, resetStudyStores } from '../study/testing';
import SyllabusMap from './SyllabusMap';

const NOW = new Date(2026, 9, 5, 18, 0).getTime();

function renderMap() {
  const router = createMemoryRouter(
    [
      { path: '/map', element: <SyllabusMap /> },
      { path: '/drill', element: <h1>Drill screen</h1> },
    ],
    { initialEntries: ['/map'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function row(kk: string): HTMLElement {
  return document.querySelector<HTMLElement>(`[data-kk="${kk}"]`)!;
}

describe('Syllabus map', () => {
  beforeEach(() => {
    resetStudyStores();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    provideContent(
      fixtureIndex({
        cards: [fxCard('c-u3o1-kk04-001', ['U3O1-KK04']), fxCard('c-u3o1-kk04-002', ['U3O1-KK04'])],
        mcq: [fxMcq('m-u3o1-kk04-001', ['U3O1-KK04'])],
        short: [fxShort('s-u3o1-kk04-001', ['U3O1-KK04'])],
      }),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    resetStudyStores();
  });

  it('shows four area columns plus the Terms and PSM groups', () => {
    renderMap();
    for (const area of ['U3O1', 'U3O2', 'U4O1', 'U4O2']) {
      expect(screen.getByRole('region', { name: new RegExp(`^${area}`) })).toBeInTheDocument();
    }
    const groups = screen.getByRole('region', { name: 'Across the course' });
    expect(within(groups).getByRole('link', { name: 'Drill Terms used in this study' })).toBeInTheDocument();
    expect(within(groups).getByRole('link', { name: 'Drill Problem-solving methodology' })).toBeInTheDocument();
  });

  it('shows each row\'s id, title, summary, mastery, item counts and last practice', () => {
    recordAttempt({ itemId: 'm-u3o1-kk04-001', kk: ['U3O1-KK04'], score: 0, timestamp: NOW - 3 * 86_400_000, ms: 1000 });
    renderMap();
    const kk04 = row('U3O1-KK04');
    const title = kkById.get('U3O1-KK04')!.title;
    expect(within(kk04).getByRole('link', { name: `Drill U3O1-KK04 ${title}` })).toBeInTheDocument();
    expect(within(kk04).getByText(kkById.get('U3O1-KK04')!.summary)).toBeInTheDocument();
    expect(within(kk04).getByText('2 cards, 1 MCQ, 1 short answer. Practised 3 days ago.')).toBeInTheDocument();
    const weak = within(kk04).getByRole('meter', { name: 'Mastery of U3O1-KK04' });
    expect(weak).toHaveAttribute('aria-valuetext', '0%');

    // An unseen KK is not zero: the meter says Unseen and draws a dashed empty track.
    const kk05 = row('U3O1-KK05');
    const unseen = within(kk05).getByRole('meter', { name: 'Mastery of U3O1-KK05' });
    expect(unseen).toHaveAttribute('aria-valuetext', 'Unseen');
    expect(unseen.className).not.toBe(weak.className);
    expect(unseen.children).toHaveLength(0);
    expect(weak.children).toHaveLength(1);
    expect(within(kk05).getByText('0 cards, 0 MCQs, 0 short answers. Never practised.')).toBeInTheDocument();
    expect(screen.getByText(/You've practised 1 of/)).toBeInTheDocument();
  });

  it('folds each area behind a button on phones, with the weakest area open', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('max-width'), media: query, addEventListener() {}, removeEventListener() {} }));
    try {
      recordAttempt({ itemId: 'm-u3o2-kk08-001', kk: ['U3O2-KK08'], score: 0, timestamp: NOW - 86_400_000, ms: 1000 });
      recordAttempt({ itemId: 'm-u3o1-kk04-001', kk: ['U3O1-KK04'], score: 1, timestamp: NOW - 86_400_000, ms: 1000 });
      renderMap();
      const u3o2 = screen.getByRole('button', { name: /^U3O2/ });
      const u3o1 = screen.getByRole('button', { name: /^U3O1/ });
      expect(u3o2).toHaveAttribute('aria-expanded', 'true');
      expect(u3o1).toHaveAttribute('aria-expanded', 'false');
      expect(row('U3O2-KK08')).not.toBeNull();
      expect(row('U3O1-KK04')).toBeNull();
      fireEvent.click(u3o1);
      expect(u3o1).toHaveAttribute('aria-expanded', 'true');
      expect(row('U3O1-KK04')).not.toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('starts a focused drill from a row, by keyboard or pointer', () => {
    const router = renderMap();
    const link = within(row('U3O2-KK08')).getByRole('link');
    link.focus();
    expect(link).toHaveFocus();
    fireEvent.click(link);
    expect(router.state.location.pathname).toBe('/drill');
    expect(router.state.location.search).toBe('?kk=U3O2-KK08');
  });
});
