/** Hooks and helpers shared by the paper and marking views. */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { plural } from '../app/study/format';
import { examActions } from './actions';
import type { SectionTab } from './ExamParts';
import { SECTION_KIND } from './links';
import { marksAvailable, type PaperItem, type ResolvedPaper } from './marking';
import { SECTION_IDS, paperTiming, type ExamPaper, type SectionId } from './store';
import { timerState, type TimerState } from './timer';
import { useStickyTop } from '../ui/useStickyTop';

/** The timer state, re-read at each phase boundary. `refresh` re-reads it now. */
export function usePaperTimer(paper: ExamPaper): [TimerState, () => void] {
  const [now, setNow] = useState(() => Date.now());
  const state = timerState(paper, paperTiming(paper), now);
  const boundary = state.phase === 'reading' ? state.readingEndsAt : state.phase === 'writing' ? state.writingEndsAt : null;
  useEffect(() => {
    if (boundary === null) return;
    const t = setTimeout(() => setNow(Date.now()), Math.max(0, boundary - Date.now()) + 50);
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [boundary]);
  const refresh = useCallback(() => setNow(Date.now()), []);
  return [state, refresh];
}

/**
 * Keeps the case study insert's sticky panel, and anything focus or a scroll brings into view,
 * below the page's sticky bar, whatever its height. The page's scroll padding (`useStickyTop`)
 * covers focus and headings; the insert's `top` is set here.
 */
export function useStickyOffset(root: RefObject<HTMLElement | null>, bar: RefObject<HTMLElement | null>): void {
  useStickyTop(bar);
  useEffect(() => {
    const r = root.current;
    const b = bar.current;
    if (!r || !b) return;
    const apply = () => {
      r.style.setProperty('--case-insert-top', `${Math.ceil(b.getBoundingClientRect().height) + 12}px`);
    };
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(apply);
    observer.observe(b);
    return () => observer.disconnect();
  }, [root, bar]);
}

/** The sections the paper has, with the current position clamped to them. */
export function usePosition(paper: ExamPaper, resolved: ResolvedPaper) {
  const sections = SECTION_IDS.filter((s) => resolved.sections[s].length > 0);
  const section: SectionId = sections.includes(paper.at.section) ? paper.at.section : (sections[0] ?? 'a');
  const items = resolved.sections[section];
  const index = Math.max(0, Math.min(paper.at.index, items.length - 1));
  return { sections, section, items, index, item: items[index] as PaperItem | undefined };
}

export function sectionMarks(items: readonly PaperItem[]): number {
  return items.reduce((n, it) => n + marksAvailable(it), 0);
}

export function sectionTabs(sections: readonly SectionId[], resolved: ResolvedPaper): SectionTab[] {
  return sections.map((s) => ({ id: s, detail: `${SECTION_KIND[s]}, ${plural(sectionMarks(resolved.sections[s]), 'mark')}` }));
}

/**
 * Moves between questions. `go` (the question list, previous and next) puts focus on the question's
 * heading and scrolls it to just below the sticky bar when the bar hides it or it starts low on the
 * screen; `select` (a section tab) leaves focus on the tab.
 */
export function useQuestionNav(key: string, heading: RefObject<HTMLElement | null>) {
  const focusNext = useRef(false);
  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    const el = heading.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const top = el.getBoundingClientRect().top;
    // Where scrollIntoView would put it: below the page's scroll padding (which includes the
    // sticky bar) and the heading's own scroll margin.
    const offset = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
    if (top < offset || top > window.innerHeight - 160) el.scrollIntoView?.({ block: 'start' });
  }, [key, heading]);
  const go = useCallback((section: SectionId, index: number) => {
    focusNext.current = true;
    examActions.goTo(section, index);
  }, []);
  const select = useCallback((section: SectionId) => examActions.goTo(section, 0), []);
  return { go, select };
}

export const EXAM_PANEL_ID = 'exam-section-panel';

export function tabId(section: SectionId): string {
  return `exam-tab-${section}`;
}

export interface Step {
  section: SectionId;
  index: number;
  /** "Next question", or "Go to Section B" at the end of a section. */
  label: string;
}

/** The questions before and after the current one, crossing into the next or previous section. */
export function neighbours(sections: readonly SectionId[], resolved: ResolvedPaper, section: SectionId, index: number): { prev: Step | null; next: Step | null } {
  const count = resolved.sections[section].length;
  const at = sections.indexOf(section);
  const after = sections[at + 1];
  const before = sections[at - 1];
  const next: Step | null =
    index < count - 1
      ? { section, index: index + 1, label: 'Next question' }
      : after
        ? { section: after, index: 0, label: `Go to Section ${after.toUpperCase()}` }
        : null;
  const prev: Step | null =
    index > 0
      ? { section, index: index - 1, label: 'Previous question' }
      : before
        ? { section: before, index: resolved.sections[before].length - 1, label: 'Previous question' }
        : null;
  return { prev, next };
}
