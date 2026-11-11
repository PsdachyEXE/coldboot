import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { cramAreas, cramTotal } from '../../content/cram';
import { buildIndex, type AreaContent } from '../../content/loader';
import { useLessonStore } from '../../content/lessons';
import type { Card, Lesson, PsmFile } from '../../content/schema';
import { useLearn } from '../../state/learn';
import { useTerminal } from '../../terminal/useTerminal';
import { useAnnouncer } from '../../ui/announce';
import { fxCard, fxMcq, fxShort, provideContent, provideLessons, resetStudyStores } from '../study/testing';
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

  describe('the front page', () => {
    const AREAS = [/^U3O1 Programming$/, /^U3O2 Analysis and design$/, /^U4O1 Development and evaluation$/, /^U4O2 Cyber security$/, /^Problem-solving methodology/];
    const startIn = (region: HTMLElement) => fireEvent.click(within(region).getByRole('button', { name: 'Start matching' }), { detail: 1 });
    const termButtons = (region: HTMLElement) => within(within(region).getByRole('list', { name: 'Terms' })).getAllByRole('button');
    const definitionButtons = (region: HTMLElement) => within(within(region).getByRole('list', { name: 'Definitions' })).getAllByRole('button');

    it('sets the course out as short definitions by area, with the official terms marked', () => {
      renderAt('/learn');
      expect(screen.getByRole('heading', { level: 1, name: 'Learn' })).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`^${cramTotal} definitions in 5 areas\\.`))).toBeInTheDocument();
      for (const name of AREAS) expect(screen.getByRole('region', { name })).toBeInTheDocument();
      expect(screen.getAllByRole('term')).toHaveLength(cramTotal);
      expect(screen.getAllByRole('definition')).toHaveLength(cramTotal);

      const programming = screen.getByRole('region', { name: /^U3O1 Programming$/ });
      expect(within(programming).getByRole('heading', { level: 2 })).toHaveTextContent('U3O1 Programming');
      expect(within(programming).getAllByRole('term')).toHaveLength(cramAreas[0].entries.length);
      const validation = within(programming).getByText('Validation').closest('div')!;
      expect(within(validation).getByText('Official')).toBeInTheDocument();
      expect(within(validation).getByRole('definition')).toHaveTextContent('Checking, by hand or electronically, that data is reasonable and complete');
      const syntax = within(programming).getByText('Syntax error').closest('div')!;
      expect(within(syntax).queryByText('Official')).toBeNull();
      // All 42 of the study design's terms are there, each marked.
      expect(screen.getAllByText('Official')).toHaveLength(42);
      // The lessons are still a link away.
      expect(screen.getByRole('link', { name: 'syllabus map' })).toHaveAttribute('href', '/map');
    });

    it('follows each area with its own matching game, and ends with a mixed one', () => {
      renderAt('/learn');
      for (const [i, name] of AREAS.entries()) {
        const region = screen.getByRole('region', { name });
        expect(within(region).getByRole('heading', { level: 3, name: `Match: ${cramAreas[i].title}` })).toBeInTheDocument();
        expect(within(region).getByText(new RegExp(`^${cramAreas[i].entries.length} pairs, 5 at a time\\.`))).toBeInTheDocument();
      }
      const mixed = screen.getByRole('region', { name: 'Mixed' });
      expect(within(mixed).getByRole('heading', { level: 3, name: 'Match: every area' })).toBeInTheDocument();
      expect(within(mixed).getByText(new RegExp(`^${cramTotal} pairs, 5 at a time\\.`))).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Start matching' })).toHaveLength(6);
    });

    it("plays a round from an area's own definitions, and Back to the list returns to its heading", () => {
      const scrolled = vi.fn();
      Element.prototype.scrollIntoView = scrolled;
      try {
        renderAt('/learn');
        const cyber = screen.getByRole('region', { name: /^U4O2 Cyber security$/ });
        startIn(cyber);
        const entries = cramAreas[3].entries;
        expect(termButtons(cyber)).toHaveLength(5);
        for (const button of termButtons(cyber)) {
          const entry = entries.find((e) => e.term === button.textContent)!;
          expect(entry, button.textContent ?? '').toBeDefined();
          fireEvent.click(button, { detail: 1 });
          fireEvent.click(definitionButtons(cyber).find((d) => d.textContent === entry.definition)!, { detail: 1 });
          expect(button).toHaveTextContent('Matched');
        }
        expect(within(cyber).getByText('5 of 5 matched, no misses.')).toBeInTheDocument();
        expect(useAnnouncer.getState().polite).toMatch(/Round finished: 5 of 5 matched, no misses\.$/);
        // Nothing is scored: the game leaves reading records alone.
        expect(useLearn.getState().read).toEqual({});

        fireEvent.click(within(cyber).getByRole('button', { name: 'Back to the list' }));
        expect(within(cyber).getByRole('heading', { level: 2 })).toHaveFocus();
        expect(scrolled).toHaveBeenCalledTimes(1);
      } finally {
        delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
      }
    });

    it('draws the mixed game from more than one area', () => {
      renderAt('/learn');
      const mixed = screen.getByRole('region', { name: 'Mixed' });
      const all = cramAreas.flatMap((a) => a.entries.map((e) => e.term));
      startIn(mixed);
      for (const button of termButtons(mixed)) expect(all).toContain(button.textContent);
    });

    it('jumps to an area from the list at the top', () => {
      renderAt('/learn');
      const nav = screen.getByRole('navigation', { name: 'Areas on this page' });
      expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual([...cramAreas.map((a) => a.title), 'Mixed']);
      fireEvent.click(within(nav).getByRole('button', { name: 'Cyber security' }));
      expect(within(screen.getByRole('region', { name: /^U4O2 Cyber security$/ })).getByRole('heading', { level: 2 })).toHaveFocus();
      fireEvent.click(within(nav).getByRole('button', { name: 'Mixed' }));
      expect(screen.getByRole('heading', { level: 2, name: 'Mixed' })).toHaveFocus();
    });
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
    // The syllabus map lists every topic now that Learn's front page is the definitions.
    expect(screen.getByRole('link', { name: 'See every topic' })).toHaveAttribute('href', '/map');
  });

  describe('with an authored lesson', () => {
    const lesson: Lesson = {
      id: 'l-u3o1-kk04',
      kk: 'U3O1-KK04',
      intro: 'Every value a program keeps has a **type**.',
      sections: [
        { heading: 'Text', body: 'A character holds one symbol; a string holds many.' },
        { heading: 'Numbers', body: 'An integer has no fractional part.\n\n```pseudo\ntotal ← 0\n```' },
        { heading: 'True or false', body: 'A Boolean suits a yes-or-no field.' },
      ],
      worked: {
        commandTerm: 'explain',
        marks: 2,
        prompt: 'Explain why a Wodonga clinic stores phone numbers as strings.',
        points: [
          { text: 'Keeps the leading zero', marks: 1 },
          { text: 'No arithmetic is done on them', marks: 1 },
        ],
        model: 'A string keeps the leading zero, and nobody adds phone numbers.',
      },
      traps: ['Many answers named a type without saying why it suited the data.'],
      source: 'study-design',
    };

    it('shows the lesson, its worked example and what the examiners saw, with the flashcards folded away', () => {
      provideLessons([lesson]);
      renderAt('/learn?kk=U3O1-KK04');
      const ideas = screen.getByRole('region', { name: 'The ideas' });
      expect(within(ideas).getByText('type')).toBeInTheDocument();
      expect(within(ideas).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Text', 'Numbers', 'True or false']);
      const worked = screen.getByRole('region', { name: 'Worked example' });
      expect(within(worked).getByText('Explain, 2 marks')).toBeInTheDocument();
      expect(within(worked).getByText(/Wodonga clinic/)).toBeInTheDocument();
      expect(within(worked).getByRole('heading', { name: 'Model answer' })).toBeInTheDocument();
      expect(within(worked).getByText('Keeps the leading zero')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'What the examiners saw' })).toHaveTextContent('Many answers named a type');
      // The official terms stay; the flashcards and their common mistakes fold into a disclosure.
      expect(screen.getByRole('region', { name: 'Terms used in this study' })).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Common mistakes' })).toBeNull();
      expect(screen.queryByRole('region', { name: 'Definitions' })).toBeNull();
      const folded = screen.getByText('Show 4 flashcards and 1 common mistake on this topic').closest('details')!;
      expect(within(folded).getByRole('group', { name: 'Definitions' })).toBeInTheDocument();
      expect(within(folded).getByRole('group', { name: 'Common mistakes' })).toHaveTextContent('One symbol is a character, not a string.');
      expect(screen.getByText(/A COLDBOOT lesson/)).toBeInTheDocument();
      expect(screen.queryByText(/SECRET/)).toBeNull();
    });

    it('waits for the lessons rather than showing the notes first, and only then offers Practise', () => {
      useLessonStore.setState({ lessons: new Map(), status: 'loading' });
      renderAt('/learn?kk=U3O1-KK04');
      expect(screen.getByRole('status')).toHaveTextContent('Loading the lesson.');
      expect(screen.queryByRole('region', { name: 'Definitions' })).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Practise' })).toBeNull();
      act(() => provideLessons([lesson]));
      expect(screen.getByRole('region', { name: 'The ideas' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Practise' })).toBeInTheDocument();
    });

    it('falls back to the notes when the lessons cannot be loaded', () => {
      useLessonStore.setState({ lessons: new Map(), status: 'error' });
      renderAt('/learn?kk=U3O1-KK04');
      expect(screen.getByRole('region', { name: 'Definitions' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Practise' })).toBeInTheDocument();
    });
  });
});
