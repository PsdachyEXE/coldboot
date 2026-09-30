import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useRef } from 'react';
import { useStickyTop } from './useStickyTop';

// Vitest doesn't process CSS, so read the stylesheet from disk.
const globalCss = readFileSync(resolve(import.meta.dirname, 'global.css'), 'utf8');

function Bar({ height }: { height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useStickyTop(ref);
  return (
    <div
      ref={(el) => {
        ref.current = el;
        if (el) el.getBoundingClientRect = () => ({ height, width: 0, top: 0, left: 0, right: 0, bottom: height, x: 0, y: 0, toJSON: () => ({}) });
      }}
    >
      Time left 23:59
    </div>
  );
}

describe('useStickyTop', () => {
  it("sets the sticky bar's height on the page while it is mounted, so focus scrolls clear of it", () => {
    const root = document.documentElement;
    const { unmount } = render(<Bar height={61.4} />);
    expect(root.style.getPropertyValue('--sticky-top')).toBe('62px');
    unmount();
    expect(root.style.getPropertyValue('--sticky-top')).toBe('');
  });

  it('follows the bar when it changes height', () => {
    let resize: () => void = () => {};
    const observe = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          resize = cb;
        }
        observe = observe;
        disconnect() {}
      },
    );
    let height = 50;
    function Growing() {
      const ref = useRef<HTMLDivElement>(null);
      useStickyTop(ref);
      return (
        <div
          ref={(el) => {
            ref.current = el;
            if (el) el.getBoundingClientRect = () => ({ height, width: 0, top: 0, left: 0, right: 0, bottom: height, x: 0, y: 0, toJSON: () => ({}) });
          }}
        />
      );
    }
    const { unmount } = render(<Growing />);
    expect(document.documentElement.style.getPropertyValue('--sticky-top')).toBe('50px');
    height = 96;
    act(() => resize());
    expect(document.documentElement.style.getPropertyValue('--sticky-top')).toBe('96px');
    unmount();
    vi.unstubAllGlobals();
  });

  it('is added to the page scroll padding in the global styles', () => {
    expect(globalCss).toMatch(/scroll-padding-top:\s*calc\(var\(--sticky-top, 0px\) \+ var\(--space-4\)\)/);
  });
});
