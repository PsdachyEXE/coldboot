/**
 * Guarded localStorage. Every Pages site under psdachyexe.github.io shares one origin and one
 * storage quota, so every key carries the `coldboot:v1:` prefix. Every call is wrapped: when
 * storage throws (private mode, quota, disabled), the app keeps running in memory and the shell
 * shows a persistent warning that progress won't be saved.
 */
import { create } from 'zustand';

export const STORAGE_PREFIX = 'coldboot:v1:';

export function storageKey(name: string): string {
  return STORAGE_PREFIX + name;
}

export interface StorageHealth {
  ok: boolean;
  /** Human-readable reason for the last failure, shown in the warning banner. */
  reason: string | null;
}

export const useStorageHealth = create<StorageHealth>(() => ({ ok: true, reason: null }));

function fail(error: unknown, action: string): void {
  const detail = error instanceof Error ? error.name : 'unknown error';
  const reason =
    detail === 'QuotaExceededError'
      ? 'Browser storage is full, so progress is not being saved. Export your progress from Settings, then free some space.'
      : `Browser storage is unavailable (${action} failed), so progress will not be saved after you close this tab.`;
  useStorageHealth.setState({ ok: false, reason });
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch (error) {
    fail(error, 'access');
    return null;
  }
}

/** Reads and parses a key. Returns undefined when absent, unreadable or not valid JSON. */
export function readJson(name: string): unknown {
  const s = storage();
  if (!s) return undefined;
  let raw: string | null;
  try {
    raw = s.getItem(storageKey(name));
  } catch (error) {
    fail(error, 'read');
    return undefined;
  }
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/** Serialises and writes a key. Returns false (and flags the warning) on failure. */
export function writeJson(name: string, value: unknown): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(storageKey(name), JSON.stringify(value));
    return true;
  } catch (error) {
    fail(error, 'write');
    return false;
  }
}

export function removeKey(name: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(storageKey(name));
  } catch (error) {
    fail(error, 'remove');
  }
}

/** Removes every COLDBOOT key (used by "Reset progress"). Leaves other sites' keys alone. */
export function removeAllKeys(): void {
  const s = storage();
  if (!s) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => s.removeItem(k));
  } catch (error) {
    fail(error, 'reset');
  }
}
