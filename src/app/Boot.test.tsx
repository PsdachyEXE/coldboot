import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_EXAM_AT, parseInstant, studyDay } from '../lib/time';
import { useSession } from '../state/session';
import { useSettings } from '../state/settings';
import { Boot } from './Boot';
import { bootLines, bootText, formatExamTime, type BootData } from './BootLines';

const NOW = parseInstant('2026-09-30T00:00:00Z');
const EXAM = parseInstant(DEFAULT_EXAM_AT);

const data: BootData = {
  buildId: '1.0.0+abc1234',
  kkCounts: { U3O1: 14, U3O2: 16, U4O1: 12, U4O2: 10 },
  provisional: 52,
  content: { status: 'ready', cards: 412, questions: 180 },
  due: 37,
  now: NOW,
  examAt: EXAM,
};

describe('bootLines', () => {
  it('prints real data: build, KK counts per area, content, reviews and the exam', () => {
    const text = bootText(bootLines(data, 'full'));
    expect(text).toContain('COLDBOOT build 1.0.0+abc1234');
    expect(text).toContain('U3O1     14 key knowledge points  ok');
    expect(text).toContain('U4O2     10 key knowledge points  ok');
    expect(text).toContain('content  412 cards, 180 questions  ok');
    expect(text).toContain('reviews  37 due');
    expect(text).toContain('exam     T-44d 04h to go');
    expect(text).toContain('Fri 13 Nov 2026, 3:00 pm AEDT');
  });

  it('reports content while it loads and when it fails', () => {
    expect(bootText(bootLines({ ...data, content: { status: 'loading', cards: 0, questions: 0 } }, 'full'))).toContain('content  loading');
    expect(bootText(bootLines({ ...data, content: { status: 'error', cards: 0, questions: 0 } }, 'full'))).toContain(
      'content  not loaded, check your connection',
    );
  });

  it('condenses to four lines', () => {
    const lines = bootLines(data, 'condensed');
    expect(lines.map((l) => l.key)).toEqual(['build', 'reviews', 'exam', 'ready']);
  });

  it('follows the exam phases', () => {
    expect(bootText(bootLines({ ...data, now: EXAM + 60_000 }, 'full'))).toContain('exam     underway');
    expect(bootText(bootLines({ ...data, now: EXAM + 3 * 3_600_000 }, 'full'))).toContain('exam     finished');
  });

  it('formats the exam in Melbourne time', () => {
    expect(formatExamTime(EXAM)).toBe('Fri 13 Nov 2026, 3:00 pm AEDT');
  });
});

describe('<Boot />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    useSession.getState().reset();
    useSettings.getState().reset();
  });

  it('plays the full sequence on the first launch of the study day, then gets out of the way', () => {
    render(<Boot />);
    const overlay = screen.getByTestId('boot');
    expect(overlay).toHaveAttribute('data-mode', 'full');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(overlay.querySelector('button, a, input, [tabindex]')).toBeNull();
    expect(useSession.getState().lastBootDay).toBe(studyDay(NOW));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByTestId('boot').textContent).toContain('U3O1');
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.queryByTestId('boot')).toBeNull();
  });

  it('skips on any key press', () => {
    render(<Boot />);
    expect(screen.getByTestId('boot')).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(window, { key: 'a' });
    });
    expect(screen.queryByTestId('boot')).toBeNull();
  });

  it('skips on a click or tap', () => {
    render(<Boot />);
    act(() => {
      fireEvent.pointerDown(window);
    });
    expect(screen.queryByTestId('boot')).toBeNull();
  });

  it('plays the 300 ms condensed version when it already played today', () => {
    useSession.getState().setLastBootDay(studyDay(NOW));
    render(<Boot />);
    expect(screen.getByTestId('boot')).toHaveAttribute('data-mode', 'condensed');
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByTestId('boot').querySelectorAll('li')).toHaveLength(4);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByTestId('boot')).toBeNull();
  });

  it('is instant under reduced motion, and still counts as played', () => {
    useSettings.getState().setMotion('reduce');
    render(<Boot />);
    expect(screen.queryByTestId('boot')).toBeNull();
    expect(useSession.getState().lastBootDay).toBe(studyDay(NOW));
  });
});
