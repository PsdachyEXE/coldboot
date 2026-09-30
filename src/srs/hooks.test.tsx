import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAttempts } from '../state/attempts';
import { recordAttempt } from '../state/record';
import { useSession } from '../state/session';
import { useSettings } from '../state/settings';
import { useSrs } from '../state/srs';
import { useDueSummary, useMastery } from './hooks';

describe('useMastery', () => {
  afterEach(() => {
    useAttempts.getState().reset();
    useSession.getState().reset();
  });

  it('recomputes when an attempt is recorded and keeps the same map otherwise', () => {
    const { result, rerender } = renderHook(() => useMastery());
    expect(result.current.size).toBe(0);
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    act(() => {
      recordAttempt({ itemId: 'm-u3o1-kk04-001', kk: ['U3O1-KK04'], score: 1, timestamp: Date.now(), ms: 2000 });
    });
    expect(result.current.get('U3O1-KK04')?.value).toBe(100);
  });
});

describe('useDueSummary', () => {
  afterEach(() => {
    useSrs.getState().reset();
    useSettings.getState().reset();
  });

  it('counts due cards, new cards left today and the next due time', () => {
    const now = new Date(2026, 9, 1, 10).getTime();
    const base = { reps: 1, interval: 1, ease: 2.5, lapses: 0, last: now - 86_400_000 };
    useSrs.getState().setCard('c-u3o1-kk04-001', { ...base, due: now - 1000 });
    useSrs.getState().setCard('c-u3o1-kk04-002', { ...base, due: now + 3_600_000 });
    useSrs.getState().noteIntroduced('2026-10-01');
    useSettings.setState({ newCardLimit: 5 });
    const { result } = renderHook(() => useDueSummary(now));
    expect(result.current).toEqual({ due: 1, newRemaining: 4, nextDue: now + 3_600_000 });
  });
});
