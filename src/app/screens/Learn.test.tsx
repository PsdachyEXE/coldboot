import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { buildIndex, type AreaContent } from '../../content/loader';
import type { Card, PsmFile } from '../../content/schema';
import { useLearn } from '../../state/learn';
import { recordAttempt } from '../../state/record';
import { useTerminal } from '../../terminal/useTerminal';
import { fxCard, fxMcq, fxShort, provideContent, resetStudyStores } from '../study/testing';
import Learn from './Learn';

const NOW = new Date(2026, 10, 2, 18, 0).getTime();

const term = (id: string, front: string, kk: Card['kk'], back: string, opts: Partial<Card> = {}): Card =>
  fxCard(id, ['TERMS', ...kk], { type: 'reverse', front, back, source: 'study-design', ...opts });

const PSM = {
  stages: [
    {
      id: 'analysis',
      name: 'Analysis',
      summary: 'Working out what the solution must do.',
      activities: [{ id: 'solution-requirements', name: 'Solution requirements', summary: 'What the solution must do.' }],
    },
  ],
  specifications: ['Analysis: the requirements are recorded.'],
  cards: [fxCard('psm-c-001', ['PSM'], { mistake: 'Analysis says what, not how.' })],
  mcq: [],
  short: [],
} as unknown as PsmFile;

function content() {
  const area: AreaContent = {
    cards: [
      fxCard('c-u3o1-kk04-001', ['U3O1-KK04'], { type: 'reverse', front: 'Character', back: 'A single letter, digit or symbol.', mistake: 'One symbol is a character, not a string.' }),
      fxCard('c-u3o1-kk04-002', ['U3O1-KK04'], { type: 'compare', front: 'Character versus string', back: 'One symbol against a sequence.' }),
      fxCard('c-u3o1-kk04-003', ['U3O1-KK04'], { type: 'cloze', front: 'Money is stored as {{floating point}}.', back: 'It has cents.' }),
      fxCard('c-u3o1-kk04-004', ['U3O1-KK04'], { front: 'Why store a phone number as a string?', back: 'It starts with 0.' }),
    ],
    mcq: [fxMcq('m-u3o1-kk04-001', ['U3O1-KK04'], { explanation: 'SECRET EXPLANATION' })],
    short: [fxShort('s-u3o1-kk04-001', ['U3O1-KK04'], { model: 'SECRET MODEL' })],
  };
  const empty: AreaContent = { cards: [], mcq: [], short: [] };
  const terms = [
    term('t-data-sources', 'Data sources', ['U3O1-KK04'], 'Where data comes from: files and databases.', { aliases: ['data source'] }),
    term('t-ethics', 'Ethics', [], 'Principles of right conduct.'),
  ];
  return buildIndex({ areas: [area, empty, empty, empty], terms, psm: PSM, caseStudies: [] });
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/learn', element: <Learn /> },
      { path: '/drill', element: <h1>Drill screen</h1> },
      { path: '/review', element: <h1>Review screen</h1> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('Learn', () => {
  beforeEach(() => {
    resetStudyStores();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    provideContent(content());
  });
  afterEach(() => {
    vi.useRealTimers();
    resetStudyStores();
    useTerminal.setState({ open: false, pending: null });
  });

  it('lists every topic by area, and suggests the first one not yet practised or read', () => {
    recordAttempt({ itemId: 'm-u3o1-kk04-001', kk: ['U3O1-KK01'], score: 1, timestamp: NOW - 1000, ms: 1000 });
    useLearn.getState().markRead('U3O1-KK02', NOW - 86_400_000 * 2);
    renderAt('/learn');
    expect(screen.getByRole('heading', { level: 1, name: 'Learn' })).toBeInTheDocument();
    for (const area of ['U3O1', 'U3O2', 'U4O1', 'U4O2']) expect(screen.getByRole('region', { name: new RegExp(`^${area}`) })).toBeInTheDocument();
    // KK01 has been practised and KK02 read, so the suggestion is KK03, linked in the tip and in its row.
    expect(screen.getByText(/Not sure where to begin\?/)).toHaveTextContent('Start with U3O1-KK03 Design tools for modules');
    for (const link of screen.getAllByRole('link', { name: 'U3O1-KK03 Design tools for modules' })) expect(link).toHaveAttribute('href', '/learn?kk=U3O1-KK03');
    const u3o1 = screen.getByRole('region', { name: /^U3O1/ });
    expect(within(u3o1).getByText(/100% mastery\. Not read yet\./)).toBeInTheDocument();
    expect(within(u3o1).getByText(/Not practised yet\. Read 2 days ago\./)).toBeInTheDocument();
    const groups = screen.getByRole('region', { name: 'Across the course' });
    expect(within(groups).getByRole('link', { name: 'Terms used in this study' })).toHaveAttribute('href', '/learn?kk=TERMS');
  });

  it("teaches a key knowledge point from its cards and terms, without its questions' answers", () => {
    renderAt('/learn?kk=u3o1-kk04');
    expect(screen.getByRole('heading', { level: 1, name: 'Data types' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'In the study design' })).toBeInTheDocument();
    const defs = screen.getByRole('region', { name: 'Definitions' });
    expect(within(defs).getByText('Character')).toBeInTheDocument();
    expect(within(defs).getByText('A single letter, digit or symbol.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Character versus string' })).toBeInTheDocument();
    const points = screen.getByRole('region', { name: 'Key points' });
    expect(within(points).getByText('floating point').tagName).toBe('STRONG');
    const terms = screen.getByRole('region', { name: 'Terms used in this study' });
    expect(within(terms).getByText('Data sources')).toBeInTheDocument();
    expect(within(terms).queryByText('Ethics')).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Common mistakes' })).getByText('One symbol is a character, not a string.')).toBeInTheDocument();
    expect(screen.queryByText(/SECRET/)).toBeNull();
    const pager = screen.getByRole('navigation', { name: 'Other topics' });
    expect(within(pager).getByRole('link', { name: /^Next: U3O1-KK05/ })).toBeInTheDocument();
  });

  it('records a read only when a Practise action is used, and never touches mastery', () => {
    const router = renderAt('/learn?kk=U3O1-KK04');
    expect(useLearn.getState().read['U3O1-KK04']).toBeUndefined();
    expect(screen.getByText(/Not practised yet\. Not read yet\./)).toBeInTheDocument();
    const practise = screen.getByRole('region', { name: 'Practise' });
    expect(within(practise).getByRole('link', { name: 'Written questions' })).toHaveAttribute('href', '/written?kk=U3O1-KK04');
    fireEvent.click(within(practise).getByRole('link', { name: 'Drill this topic' }));
    expect(useLearn.getState().read['U3O1-KK04']).toBe(NOW);
    expect(router.state.location.search).toBe('?kk=U3O1-KK04');
    expect(router.state.location.pathname).toBe('/drill');
  });

  it('opens a game for the topic in the terminal', () => {
    renderAt('/learn?kk=U3O1-KK04');
    fireEvent.click(screen.getByRole('button', { name: /^Play types in the terminal/ }));
    expect(useTerminal.getState()).toMatchObject({ open: true, pending: 'play types' });
    expect(useLearn.getState().read['U3O1-KK04']).toBe(NOW);
  });

  it('shows the glossary grouped by area, untied terms last', () => {
    renderAt('/learn?kk=TERMS');
    expect(screen.getByRole('heading', { level: 1, name: 'Terms used in this study' })).toBeInTheDocument();
    const u3o1 = screen.getByRole('region', { name: /^U3O1/ });
    expect(within(u3o1).getByText('Data sources')).toBeInTheDocument();
    expect(within(u3o1).getByText('(also data source)')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Not tied to one key knowledge point' })).getByText('Ethics')).toBeInTheDocument();
  });

  it('shows the PSM by stage, with its activities and specifications', () => {
    renderAt('/learn?kk=PSM');
    const analysis = screen.getByRole('region', { name: 'Analysis' });
    expect(within(analysis).getByText('Solution requirements')).toBeInTheDocument();
    expect(within(analysis).getByText('The requirements are recorded.')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Common mistakes' })).getByText('Analysis says what, not how.')).toBeInTheDocument();
  });

  it('says so for a topic that does not exist', () => {
    renderAt('/learn?kk=U3O1-KK99');
    expect(screen.getByRole('heading', { name: "That topic isn't in the study design" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See every topic' })).toHaveAttribute('href', '/learn');
  });
});
