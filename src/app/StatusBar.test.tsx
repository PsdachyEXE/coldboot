import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { DEFAULT_EXAM_AT, parseInstant, studyDay, addDays } from '../lib/time';
import { useSession } from '../state/session';
import { useSettings } from '../state/settings';
import { useSrs } from '../state/srs';
import { useStorageHealth } from '../state/storage';
import { StatusBar } from './StatusBar';
import { countdownSegment, statusSegments } from './StatusBarSegments';
import { resetPwaForTests, usePwa } from './pwa';

const EXAM = parseInstant(DEFAULT_EXAM_AT);
const HOUR = 3_600_000;
const NOW = parseInstant('2026-09-30T00:00:00Z'); // 44 days 4 hours before the exam

const base = { now: NOW, examAt: EXAM, due: 37, streak: 6, offlineReady: true, storageOk: true, narrow: false };

describe('statusSegments', () => {
  it('formats the normal bar', () => {
    const segs = statusSegments(base);
    expect(segs.map((s) => s.text)).toEqual(['T-44d 04h', '37 due', 'streak 6', 'offline ready']);
    expect(segs.map((s) => s.label)).toEqual([
      '44 days and 4 hours until the exam',
      '37 reviews due',
      'Study streak: 6 days',
      'Ready to work offline',
    ]);
  });

  it('says so while the exam is underway, through reading and writing time', () => {
    for (const offset of [0, 10 * 60_000, 90 * 60_000, 134 * 60_000]) {
      const seg = countdownSegment(EXAM + offset, EXAM);
      expect(seg.text).toBe('exam underway');
      expect(seg.label).toBe('The exam is underway');
    }
  });

  it('says so once the exam has finished', () => {
    const seg = countdownSegment(EXAM + 135 * 60_000, EXAM);
    expect(seg).toMatchObject({ text: 'exam finished', label: 'The exam has finished' });
  });

  it('counts down the last day in hours', () => {
    expect(countdownSegment(EXAM - 5 * HOUR - 1, EXAM)).toMatchObject({ text: 'T-0d 05h', label: '5 hours until the exam' });
    expect(countdownSegment(EXAM - 20 * 60_000, EXAM)).toMatchObject({ text: 'T-0d 00h', label: 'Less than an hour until the exam' });
    expect(countdownSegment(EXAM - 25 * HOUR, EXAM).label).toBe('1 day and 1 hour until the exam');
  });

  it('shows only the countdown and due count when narrow', () => {
    expect(statusSegments({ ...base, narrow: true, storageOk: false }).map((s) => s.id)).toEqual(['countdown', 'due']);
  });

  it('omits offline ready until precached and adds not saving when storage fails', () => {
    const segs = statusSegments({ ...base, offlineReady: false, storageOk: false, due: 0, streak: 1 });
    expect(segs.map((s) => s.text)).toEqual(['T-44d 04h', '0 due', 'streak 1', 'not saving']);
    expect(segs[1].label).toBe('No reviews due');
    expect(segs[2].label).toBe('Study streak: 1 day');
    expect(segs[3].label).toBe('Progress is not being saved');
  });
});

describe('<StatusBar />', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    useSrs.getState().reset();
    useSession.getState().reset();
    useSettings.getState().reset();
    useStorageHealth.setState({ ok: true, reason: null, messages: [] });
    resetPwaForTests();
    vi.unstubAllGlobals();
  });

  it('renders bracketed segments with spoken labels, and is not a live region', () => {
    const card = { reps: 1, interval: 1, ease: 2.5, due: NOW - 1000, lapses: 0, last: NOW - 86_400_000 };
    useSrs.getState().setCard('c-u3o1-kk04-001', card);
    useSrs.getState().setCard('c-u3o1-kk04-002', { ...card, due: NOW + 86_400_000 });
    const today = studyDay(NOW);
    const activity = { n: 3, s: 2, reviews: 1, ms: 1000, areas: {} };
    useSession.setState({ activity: { [today]: activity, [addDays(today, -1)]: activity } });
    act(() => usePwa.setState({ offlineReady: true }));

    render(<StatusBar />);
    const bar = screen.getByRole('contentinfo', { name: 'Status' });
    expect(bar).not.toHaveAttribute('aria-live');
    expect(within(bar).queryByRole('status')).toBeNull();
    const items = within(bar).getAllByRole('listitem');
    expect(items.map((li) => li.querySelector('[aria-hidden="true"]')?.textContent)).toEqual([
      '[T-44d 04h]',
      '[1 due]',
      '[streak 2]',
      '[offline ready]',
    ]);
    expect(within(bar).getByText('1 review due')).toBeInTheDocument();
    expect(within(bar).getByText('44 days and 4 hours until the exam')).toBeInTheDocument();
  });

  it('shows not saving when storage is unhealthy', () => {
    useStorageHealth.setState({ ok: false, reason: 'x', messages: ['x'] });
    render(<StatusBar />);
    expect(screen.getByText('not saving')).toBeInTheDocument();
    expect(screen.getByText('Progress is not being saved')).toBeInTheDocument();
  });

  it('shrinks to the countdown and due count below 720 px', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query.includes('max-width'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    render(<StatusBar />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
