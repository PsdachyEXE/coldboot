import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useNow } from './useNow';

function Clock({ interval }: { interval: number }) {
  return <output>{useNow(interval)}</output>;
}

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T09:00:00+10:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('ticks at the requested interval', () => {
    render(<Clock interval={1000} />);
    const start = Number(screen.getByRole('status').textContent);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(Number(screen.getByRole('status').textContent)).toBe(start + 3000);
  });

  it('refreshes when the page becomes visible again', () => {
    render(<Clock interval={60_000} />);
    const start = Number(screen.getByRole('status').textContent);
    vi.setSystemTime(start + 5000);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(Number(screen.getByRole('status').textContent)).toBe(start + 5000);
  });

  it('stops ticking after unmount', () => {
    const { unmount } = render(<Clock interval={1000} />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
