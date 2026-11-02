/**
 * Authored lessons (docs/LEARN.md, Phase C): `content/<area>/lessons.json`, one per key knowledge
 * point. They load only when a Learn page needs them, as their own chunks, so the rest of the app
 * never downloads them. A point without a lesson keeps its assembled study notes, and so does every
 * point if the lessons can't be loaded. Bundled content is validated in CI, so the shape is trusted.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import type { KkId, Lesson } from './schema';

const lessonFiles = import.meta.glob<unknown>('../../content/u[34]o[12]/lessons.json', { import: 'default' });

export type LessonMap = ReadonlyMap<KkId, Lesson>;

const NONE: LessonMap = new Map();

/** Loads every area's lessons, keyed by key knowledge point. */
export async function loadLessons(): Promise<LessonMap> {
  const keys = Object.keys(lessonFiles).sort();
  const files = await Promise.all(keys.map((k) => lessonFiles[k]() as Promise<Lesson[]>));
  return new Map(files.flat().map((l) => [l.kk, l]));
}

export interface LessonState {
  lessons: LessonMap;
  status: 'idle' | 'loading' | 'ready' | 'error';
  load(): Promise<void>;
}

export const useLessonStore = create<LessonState>()((set, get) => ({
  lessons: NONE,
  status: 'idle',
  load: async () => {
    const { status } = get();
    if (status === 'loading' || status === 'ready') return;
    set({ status: 'loading' });
    try {
      set({ lessons: await loadLessons(), status: 'ready' });
    } catch {
      // Offline before the chunk was cached, or a stale deploy: the pages show their notes.
      set({ status: 'error' });
    }
  },
}));

/**
 * The authored lessons, starting the load on first use. `settled` is false only while they load, so
 * a page can wait rather than show its notes and then swap them out.
 */
export function useLessons(): { settled: boolean; lessons: LessonMap } {
  const status = useLessonStore((s) => s.status);
  const lessons = useLessonStore((s) => s.lessons);
  useEffect(() => {
    if (status === 'idle') void useLessonStore.getState().load();
  }, [status]);
  return { settled: status === 'ready' || status === 'error', lessons };
}
