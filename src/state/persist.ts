/**
 * A small persistence layer for Zustand stores.
 *
 * Each store saves a versioned envelope `{ v, data }` under `coldboot:v1:<name>`, hydrates
 * synchronously when created, migrates older versions, and debounces writes (flushed when the page
 * is hidden). It is built to never lose progress quietly:
 *
 * - Damaged data is salvaged record by record. Whatever can't be read is copied to
 *   `coldboot:v1:<name>:quarantine` and the shell shows a warning.
 * - Data saved by a newer build is never loaded or overwritten; the store stops saving and the
 *   shell asks the user to reload.
 * - Two windows on one browser profile (the installed app window and a normal tab) stay in step:
 *   a `storage` event from the other window is merged into this one before anything is written.
 *
 * Every persisted store registers itself so export, import and reset cover all of them.
 */
import type { StoreApi } from 'zustand';
import type { z } from 'zod';
import { peekVersion, readJson, storageKey, warnStorage, writeJson } from './storage';

export interface PersistOptions<S, D> {
  /** Key suffix: stored as `coldboot:v1:<name>`. */
  name: string;
  /** Current data version. Bump it and extend `migrate` when the persisted shape changes. */
  version: number;
  /** Strict schema for the current data shape. */
  schema: z.ZodType<D>;
  /** Picks the persisted data out of the state (actions and transient fields stay out). */
  select: (state: S) => D;
  /** Turns data into a state patch. */
  hydrate: (data: D) => Partial<S>;
  defaults: () => D;
  /** Upgrades data saved by an older version to the current shape (validated afterwards). */
  migrate?: (data: unknown, fromVersion: number) => unknown;
  /**
   * Keeps whatever records are valid from data that failed the schema. Returns the cleaned data and
   * how many records were dropped, or undefined when nothing is recoverable.
   */
  salvage?: (data: unknown) => { data: D; dropped: number } | undefined;
  /** Combines this window's unsaved data with data another window just saved. Default: theirs. */
  merge?: (local: D, incoming: D) => D;
  debounceMs?: number;
}

interface Envelope {
  v: number;
  data: unknown;
}

export function isEnvelope(value: unknown): value is Envelope {
  return typeof value === 'object' && value !== null && typeof (value as Envelope).v === 'number' && 'data' in value;
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

export type ValidateResult<D> = { ok: true; data: D; dropped: number } | { ok: false; error: string };

/** A persisted store as seen by export, import and reset. */
export interface RegisteredStore {
  name: string;
  version: number;
  /** Current data, as saved. */
  exportData(): unknown;
  /** Migrates (when older) and validates data from an export. Never throws. */
  validateImport(v: number, data: unknown): ValidateResult<unknown>;
  /** Replaces the store's data and writes it now. */
  apply(data: unknown): void;
  /** Resets to defaults in memory without writing (the caller removes the keys). */
  resetSilently(): void;
  flush(): void;
  /** True while this tab must not write (a newer build owns the data). */
  isBlocked(): boolean;
}

export const persistedStores = new Map<string, RegisteredStore>();

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

/** Flushes every pending debounced write now (export, import, tests, before reload). */
export function flushAllPersisted(): void {
  flushers.forEach((f) => f());
}

const NEWER_BUILD =
  'A newer version of COLDBOOT saved your progress in another window. Reload this window to update; changes made here are not being saved.';

function quarantine(name: string, raw: unknown): void {
  writeJson(`${name}:quarantine`, raw);
}

/**
 * Hydrates `store` from storage, subscribes it for debounced writes, listens for writes from other
 * windows, and registers it for export, import and reset.
 */
export function persistStore<S, D>(store: StoreApi<S>, opts: PersistOptions<S, D>): RegisteredStore {
  const debounceMs = opts.debounceMs ?? 300;
  let blocked = false;
  let applyingRemote = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSaved: D | undefined;

  const block = () => {
    blocked = true;
    warnStorage(NEWER_BUILD);
  };

  /** Migrates and validates, salvaging when needed. */
  const validate = (v: number, data: unknown): ValidateResult<D> => {
    if (v > opts.version) return { ok: false, error: `saved by a newer version (${opts.name} v${v})` };
    let current: unknown = data;
    if (v < opts.version) {
      if (!opts.migrate) return { ok: false, error: `no migration from ${opts.name} v${v}` };
      try {
        current = opts.migrate(data, v);
      } catch {
        return { ok: false, error: `could not migrate ${opts.name} v${v}` };
      }
    }
    const parsed = opts.schema.safeParse(current);
    if (parsed.success) return { ok: true, data: parsed.data, dropped: 0 };
    const salvaged = opts.salvage?.(current);
    if (salvaged) return { ok: true, data: salvaged.data, dropped: Math.max(1, salvaged.dropped) };
    return { ok: false, error: `${opts.name} data is damaged` };
  };

  const setSilently = (data: D) => {
    applyingRemote = true;
    try {
      store.setState(opts.hydrate(data));
    } finally {
      applyingRemote = false;
    }
  };

  // Initial hydration.
  const raw = readJson(opts.name);
  if (raw !== undefined) {
    if (!isEnvelope(raw)) {
      quarantine(opts.name, raw);
      warnStorage('Some saved progress could not be read and has been set aside. Export your progress from Settings and report the problem.');
    } else if (raw.v > opts.version) {
      block();
    } else {
      const result = validate(raw.v, raw.data);
      if (result.ok) {
        setSilently(result.data);
        lastSaved = raw.v === opts.version && result.dropped === 0 ? result.data : undefined;
        if (result.dropped > 0) {
          quarantine(opts.name, raw);
          warnStorage(`${result.dropped} damaged record(s) in saved progress were set aside; everything else loaded.`);
        }
      } else {
        quarantine(opts.name, raw);
        warnStorage('Some saved progress could not be read and has been set aside. Export your progress from Settings and report the problem.');
      }
    }
  }

  const write = () => {
    timer = null;
    if (blocked) return;
    const stored = peekVersion(opts.name);
    if (stored !== null && stored > opts.version) {
      block();
      return;
    }
    const data = opts.select(store.getState());
    if (lastSaved !== undefined && shallowEqual(data, lastSaved)) return;
    if (writeJson(opts.name, { v: opts.version, data } satisfies Envelope)) lastSaved = data;
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(write, debounceMs);
  };

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      write();
    }
  };

  store.subscribe((state, prev) => {
    if (applyingRemote) return;
    if (shallowEqual(opts.select(state), opts.select(prev))) return;
    schedule();
  });

  // Another window wrote this key: merge its data in before this window writes anything.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage) return;
      if (e.key !== null && e.key !== storageKey(opts.name)) return;
      if (e.key === null || e.newValue === null) {
        // Progress was reset in another window.
        if (timer) clearTimeout(timer);
        timer = null;
        lastSaved = undefined;
        setSilently(opts.defaults());
        return;
      }
      let incoming: unknown;
      try {
        incoming = JSON.parse(e.newValue);
      } catch {
        return;
      }
      if (!isEnvelope(incoming)) return;
      if (incoming.v > opts.version) {
        block();
        return;
      }
      const result = validate(incoming.v, incoming.data);
      if (!result.ok) return;
      const pendingLocal = timer !== null;
      const merged = pendingLocal && opts.merge ? opts.merge(opts.select(store.getState()), result.data) : result.data;
      setSilently(merged);
      lastSaved = result.data;
      if (pendingLocal && opts.merge) schedule();
      else if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    });
  }

  flushers.add(flush);
  listenForHide();

  const registered: RegisteredStore = {
    name: opts.name,
    version: opts.version,
    exportData: () => opts.select(store.getState()),
    validateImport: (v, data) => validate(v, data),
    apply: (data) => {
      store.setState(opts.hydrate(data as D));
      flush();
      if (!timer) write();
    },
    resetSilently: () => {
      if (timer) clearTimeout(timer);
      timer = null;
      lastSaved = undefined;
      setSilently(opts.defaults());
    },
    flush,
    isBlocked: () => blocked,
  };
  persistedStores.set(opts.name, registered);
  return registered;
}
