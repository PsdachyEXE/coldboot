/**
 * A small persistence layer for Zustand stores. Each store saves a versioned envelope
 * `{ v, data }` under `coldboot:v1:<name>`, hydrates synchronously on creation, migrates older
 * versions on load, and debounces writes. Pending writes flush when the page is hidden.
 */
import type { StoreApi } from 'zustand';
import { readJson, writeJson } from './storage';

export interface PersistOptions<S, D> {
  /** Key suffix: stored as `coldboot:v1:<name>`. */
  name: string;
  /** Current data version. Bump it and extend `migrate` when the persisted shape changes. */
  version: number;
  /** Picks the persisted data out of the state (actions and transient fields stay out). */
  select: (state: S) => D;
  /** Merges loaded data into the state. Must tolerate partial data. */
  hydrate: (data: D) => Partial<S>;
  /**
   * Upgrades data saved by an older version. Return undefined to discard it.
   * Data from a newer version is never loaded or overwritten.
   */
  migrate?: (data: unknown, fromVersion: number) => D | undefined;
  /** Validates loaded data before hydration. Return false to discard it. */
  validate?: (data: unknown) => data is D;
  debounceMs?: number;
}

interface Envelope {
  v: number;
  data: unknown;
}

/** Shallow equality over own keys, so `select` may build a fresh object on every call. */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

function isEnvelope(value: unknown): value is Envelope {
  return typeof value === 'object' && value !== null && typeof (value as Envelope).v === 'number' && 'data' in value;
}

const flushers = new Set<() => void>();
let listening = false;

function listenForHide(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  const flushAll = () => flushers.forEach((f) => f());
  window.addEventListener('pagehide', flushAll);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll();
  });
}

/** Flushes every pending debounced write now (tests, export, and before reload). */
export function flushAllPersisted(): void {
  flushers.forEach((f) => f());
}

/**
 * Hydrates `store` from storage and subscribes it for debounced writes.
 * Returns a handle to flush or stop persistence (used by reset and tests).
 */
export function persistStore<S, D>(store: StoreApi<S>, opts: PersistOptions<S, D>): { flush: () => void; stop: () => void; blocked: boolean } {
  const debounceMs = opts.debounceMs ?? 300;
  let blocked = false;

  const raw = readJson(opts.name);
  if (isEnvelope(raw)) {
    let data: D | undefined;
    if (raw.v === opts.version) data = raw.data as D;
    else if (raw.v < opts.version && opts.migrate) data = opts.migrate(raw.data, raw.v);
    else if (raw.v > opts.version) blocked = true; // saved by a newer app build: don't clobber it
    if (data !== undefined && (!opts.validate || opts.validate(data))) {
      store.setState(opts.hydrate(data));
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSaved: D | undefined;

  const write = () => {
    timer = null;
    if (blocked) return;
    const data = opts.select(store.getState());
    if (lastSaved !== undefined && shallowEqual(data, lastSaved)) return;
    lastSaved = data;
    writeJson(opts.name, { v: opts.version, data } satisfies Envelope);
  };

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      write();
    }
  };

  const unsubscribe = store.subscribe((state, prev) => {
    if (shallowEqual(opts.select(state), opts.select(prev))) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(write, debounceMs);
  });

  flushers.add(flush);
  listenForHide();

  return {
    flush,
    stop: () => {
      unsubscribe();
      flushers.delete(flush);
      if (timer) clearTimeout(timer);
    },
    blocked,
  };
}
