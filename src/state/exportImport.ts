/**
 * Progress export and import. Imported files are hostile until proven otherwise: capped at 5 MB,
 * parsed inside try/catch, validated with Zod, and rejected with a clear message when a version is
 * unknown. Imported strings are only ever rendered as plain text.
 *
 * Each persisted store is exported as its own `{ v, data }` envelope, so a backup made today still
 * imports after a store's shape changes (its data runs through that store's migration first).
 */
import { z } from '../lib/zodConfig';
import { localDate } from '../lib/time';
// The exam autosave is optional in a progress file, but it registers here so export, import and
// reset cover it even when the exam route has never been opened.
import '../exam/store';
import './attempts';
import './session';
import './settings';
import './srs';
import { clearTabState, flushAllPersisted, persistedStores } from './persist';
import { removeAllKeys } from './storage';

export const EXPORT_SCHEMA = 1;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
/** Stores every progress file must contain. Others (e.g. the exam autosave) are optional. */
export const REQUIRED_STORES = ['settings', 'srs', 'attempts', 'session'] as const;

export interface ExportFile {
  app: 'coldboot';
  schema: typeof EXPORT_SCHEMA;
  exportedAt: string;
  appVersion: string;
  stores: Record<string, { v: number; data: unknown }>;
}

export const ExportEnvelopeSchema = z
  .object({
    app: z.literal('coldboot'),
    schema: z.literal(EXPORT_SCHEMA),
    exportedAt: z.string().max(64),
    appVersion: z.string().max(64),
    stores: z
      .record(z.string().regex(/^[a-z][a-z0-9-]{0,31}$/), z.object({ v: z.number().int().min(1), data: z.unknown() }).strict())
      .refine((s) => Object.keys(s).length <= 16, 'Too many stores'),
  })
  .strict();

export function buildExport(now = Date.now()): ExportFile {
  flushAllPersisted();
  const stores: ExportFile['stores'] = {};
  for (const reg of persistedStores.values()) stores[reg.name] = { v: reg.version, data: reg.exportData() };
  return {
    app: 'coldboot',
    schema: EXPORT_SCHEMA,
    exportedAt: new Date(now).toISOString(),
    appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0',
    stores,
  };
}

/** Named by the device's local calendar date, so an export at 8 am in Melbourne isn't dated yesterday. */
export function exportFilename(now = Date.now()): string {
  return `coldboot-progress-${localDate(now)}.json`;
}

export interface ValidatedImport {
  exportedAt: string;
  /** Validated (and migrated) data per known store. */
  data: Record<string, unknown>;
}

export type ImportResult = { ok: true; file: ValidatedImport; summary: string } | { ok: false; error: string };

const TOO_BIG = 'That file is larger than 5 MB, so it is not a COLDBOOT progress file. Choose the file you exported from Settings.';

/** Validates import text. Never throws. */
export function parseImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: TOO_BIG };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON. Choose the .json file you exported from Settings.' };
  }
  if (typeof raw !== 'object' || raw === null || (raw as { app?: unknown }).app !== 'coldboot') {
    return { ok: false, error: 'That file is not a COLDBOOT progress export. Choose the file you exported from Settings.' };
  }
  const schema = (raw as { schema?: unknown }).schema;
  if (schema !== EXPORT_SCHEMA) {
    const newer = typeof schema === 'number' && schema > EXPORT_SCHEMA;
    return {
      ok: false,
      error: newer
        ? `That file came from a newer version of COLDBOOT (format ${schema}). Reload to update the app, then import again.`
        : `That file uses an unknown format version (${String(schema).slice(0, 20)}), so it can't be imported.`,
    };
  }
  const envelope = ExportEnvelopeSchema.safeParse(raw);
  if (!envelope.success) return { ok: false, error: 'That file is damaged or has been edited, so nothing was imported.' };

  const data: Record<string, unknown> = {};
  for (const name of REQUIRED_STORES) {
    if (!envelope.data.stores[name]) return { ok: false, error: `That file has no ${name} data, so nothing was imported.` };
  }
  for (const [name, { v, data: storeData }] of Object.entries(envelope.data.stores)) {
    const reg = persistedStores.get(name);
    if (!reg) continue; // a store this build doesn't know: ignore it
    if (v > reg.version) {
      return { ok: false, error: `That file came from a newer version of COLDBOOT (${name} v${v}). Reload to update the app, then import again.` };
    }
    const result = reg.validateImport(v, storeData);
    if (!result.ok || result.dropped > 0) {
      return { ok: false, error: `That file's ${name} data is damaged or has been edited, so nothing was imported.` };
    }
    data[name] = result.data;
  }
  const srs = data.srs as { cards: Record<string, unknown> };
  const attempts = data.attempts as { log: unknown[] };
  const exportedAt = envelope.data.exportedAt;
  return {
    ok: true,
    file: { exportedAt, data },
    summary: `${Object.keys(srs.cards).length} cards scheduled and ${attempts.log.length} attempts, exported ${exportedAt.slice(0, 10)}.`,
  };
}

/** Reads a user-chosen file with the size cap applied before reading. Never throws. */
export async function readImportFile(file: Blob): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, error: TOO_BIG };
  try {
    return parseImport(await file.text());
  } catch {
    return { ok: false, error: 'That file could not be read. Try exporting again, then import the new file.' };
  }
}

/**
 * Replaces all progress with a validated import and writes it to storage immediately. This tab's
 * drafts and terminal belonged to the progress being replaced, so they are cleared too.
 */
export function applyImport(file: ValidatedImport): void {
  for (const [name, data] of Object.entries(file.data)) persistedStores.get(name)?.apply(data);
  flushAllPersisted();
  clearTabState();
}

/**
 * Deletes every COLDBOOT key and resets every persisted store to first-run state, along with this
 * tab's written drafts and terminal session (scrollback, running game, last share line).
 */
export function resetAllProgress(): void {
  for (const reg of persistedStores.values()) reg.resetSilently();
  removeAllKeys();
  clearTabState();
}
