import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_EXAM_AT, formatTimeLeft, parseInstant, studyDay } from '../lib/time';
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

  it('keeps every line short enough for one row on a phone', () => {
    const lines = bootLines(data, 'full', { narrow: true });
    const text = bootText(lines);
    expect(text).toContain('U3O1     14 KK points  ok');
    expect(text).toContain('content  412 cards, 180 Qs  ok');
    expect(text).toContain('13 Nov, 3:00 pm AEDT');
    // 23 characters of Martian Mono fit beside the label column at 360 px.
    for (const l of lines) expect(`${l.detail}${l.result ? `  ${l.result}` : ''}`.length).toBeLessThanOrEqual(23);
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
    expect(bootText(bootLines({ ...data, now: EXAM + 60_000 }, 'full'))).toContain('exam     underway, good luck');
    expect(bootText(bootLines({ ...data, now: EXAM + 3 * 3_600_000 }, 'full'))).toContain('exam     over, well done');
  });

  describe('on exam day', () => {
    const at = (iso: string) => ({ ...data, now: parseInstant(iso) });
    const exam = (d: BootData, mode: 'full' | 'condensed' = 'full', narrow = false) => bootLines(d, mode, { narrow }).find((l) => l.key === 'exam')!.detail;
    const reviews = (d: BootData, mode: 'full' | 'condensed' = 'full', narrow = false) => bootLines(d, mode, { narrow }).find((l) => l.key === 'reviews')?.detail;

    it('counts down in days until midnight in Melbourne, then in hours and minutes', () => {
      expect(exam(at('2026-11-12T23:59:59+11:00'))).toBe('T-0d 15h to go');
      expect(exam(at('2026-11-13T00:00:00+11:00'))).toBe('today, 15h 00m to go');
      expect(exam(at('2026-11-13T10:48:00+11:00'))).toBe('today, 4h 12m to go');
      expect(exam(at('2026-11-13T14:15:30+11:00'), 'condensed')).toBe('today, 44m to go');
      expect(exam(at('2026-11-13T14:59:00+11:00'))).toBe('today, 1m to go');
      expect(exam(at('2026-11-13T14:59:59.999+11:00'))).toBe('today, under 1m to go');
      expect(reviews(at('2026-11-13T14:59:59.999+11:00'))).toBe('37 due');
    });

    it('gives the same time left as Home, rounded down to the minute', () => {
      const cases: [string, string, string][] = [
        ['2026-11-13T10:48:30+11:00', '4h 11m', '4 hours and 11 minutes'],
        ['2026-11-13T11:59:30+11:00', '3h 00m', '3 hours'],
        ['2026-11-13T14:15:30+11:00', '44m', '44 minutes'],
        ['2026-11-13T14:59:30+11:00', 'under 1m', 'less than a minute'],
      ];
      for (const [iso, boot, home] of cases) {
        expect(exam(at(iso)), iso).toBe(`today, ${boot} to go`);
        expect(formatTimeLeft(parseInstant(iso), EXAM), iso).toBe(home);
      }
    });

    it('wishes luck and drops the reviews line while the exam is on', () => {
      for (const iso of ['2026-11-13T15:00:00+11:00', '2026-11-13T15:14:59+11:00', '2026-11-13T15:15:00+11:00', '2026-11-13T17:14:59.999+11:00']) {
        expect(exam(at(iso)), iso).toBe('underway, good luck');
        expect(reviews(at(iso)), iso).toBeUndefined();
        expect(reviews(at(iso), 'condensed'), iso).toBeUndefined();
      }
      expect(bootLines(at('2026-11-13T15:00:00+11:00'), 'condensed').map((l) => l.key)).toEqual(['build', 'exam', 'ready']);
    });

    it('says the exam is over and the exam caps have lifted', () => {
      const after = at('2026-11-13T17:15:00+11:00');
      expect(exam(after)).toBe('over, well done');
      expect(reviews(after)).toBe('37 due, exam caps lifted');
      expect(reviews({ ...after, due: 0 }, 'condensed')).toBe('none due, exam caps lifted');
      expect(reviews(after, 'full', true)).toBe('37 due, caps lifted');
    });

    it('keeps every exam-day line short enough for one row on a phone', () => {
      for (const iso of ['2026-11-13T00:00:00+11:00', '2026-11-13T14:59:59+11:00', '2026-11-13T15:00:00+11:00', '2026-11-13T17:15:00+11:00']) {
        for (const l of bootLines({ ...at(iso), due: 1234 }, 'full', { narrow: true })) {
          expect(`${l.detail}${l.result ? `  ${l.result}` : ''}`.length, `${iso} ${l.key}`).toBeLessThanOrEqual(23);
        }
      }
    });
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

  it.each([
    ['2026-11-13T14:59:59+11:00', 'today, under 1m to go', true],
    ['2026-11-13T15:00:00+11:00', 'underway, good luck', false],
    ['2026-11-13T15:15:00+11:00', 'underway, good luck', false],
    ['2026-11-13T17:15:00+11:00', 'over, well done', true],
  ])('prints the exam-day state for a launch at %s', (iso, exam, reviews) => {
    vi.setSystemTime(parseInstant(iso));
    render(<Boot />);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    const lines = [...screen.getByTestId('boot').querySelectorAll('li')].map((li) => li.textContent);
    expect(lines).toContain(`exam${exam}`);
    expect(lines.some((l) => l?.startsWith('reviews'))).toBe(reviews);
  });

  it('is instant under reduced motion, and still counts as played', () => {
    useSettings.getState().setMotion('reduce');
    render(<Boot />);
    expect(screen.queryByTestId('boot')).toBeNull();
    expect(useSession.getState().lastBootDay).toBe(studyDay(NOW));
  });
});
