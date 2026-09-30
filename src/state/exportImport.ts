/**
 * Progress export and import. Imported files are hostile until proven otherwise: capped at 5 MB,
 * parsed inside try/catch, validated with Zod, and rejected with a clear message when the schema
 * version is unknown. Imported strings are only ever rendered as plain text.
 */
import { z } from 'zod';
import { AttemptsDataSchema, useAttempts, type AttemptsData } from './attempts';
import { flushAllPersisted } from './persist';
import { SessionDataSchema, useSession, type SessionData } from './session';
import { SettingsDataSchema, selectSettingsData, useSettings, type SettingsData } from './settings';
import { SrsDataSchema, useSrs, type SrsData } from './srs';
import { removeAllKeys } from './storage';

export const EXPORT_SCHEMA = 1;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface ExportFile {
  app: 'coldboot';
  schema: typeof EXPORT_SCHEMA;
  exportedAt: string;
  appVersion: string;
  data: {
    settings: SettingsData;
    srs: SrsData;
    attempts: AttemptsData;
    session: SessionData;
    /** Exam simulator autosave (P1). Validated by the exam module when present. */
    exam?: Record<string, unknown>;
  };
}

export const ExportFileSchema = z
  .object({
    app: z.literal('coldboot'),
    schema: z.literal(EXPORT_SCHEMA),
    exportedAt: z.string().max(64),
    appVersion: z.string().max(32),
    data: z
      .object({
        settings: SettingsDataSchema,
        srs: SrsDataSchema,
        attempts: AttemptsDataSchema,
        session: SessionDataSchema,
        exam: z.record(z.string(), z.unknown()).optional(),
      })
      .strict(),
  })
  .strict();

export function buildExport(now = Date.now()): ExportFile {
  flushAllPersisted();
  const srs = useSrs.getState();
  const attempts = useAttempts.getState();
  const session = useSession.getState();
  return {
    app: 'coldboot',
    schema: EXPORT_SCHEMA,
    exportedAt: new Date(now).toISOString(),
    appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0',
    data: {
      settings: selectSettingsData(useSettings.getState()),
      srs: { cards: srs.cards, introduced: srs.introduced },
      attempts: { log: attempts.log, rollup: attempts.rollup },
      session: {
        terminalHistory: session.terminalHistory,
        daily: session.daily,
        activity: session.activity,
        lastBootDay: session.lastBootDay,
      },
    },
  };
}

export function exportFilename(now = Date.now()): string {
  return `coldboot-progress-${new Date(now).toISOString().slice(0, 10)}.json`;
}

export type ImportResult = { ok: true; file: ExportFile; summary: string } | { ok: false; error: string };

/** Validates import text. Never throws. */
export function parseImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'That file is larger than 5 MB, so it is not a COLDBOOT progress file. Choose the file you exported from Settings.' };
  }
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
        ? `That file came from a newer version of COLDBOOT (schema ${schema}). Reload to update the app, then import again.`
        : `That file uses an unknown schema version (${String(schema)}), so it can't be imported.`,
    };
  }
  const parsed = ExportFileSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.length ? ` at ${first.path.join('.')}` : '';
    return { ok: false, error: `That file is damaged or has been edited${where}, so nothing was imported.` };
  }
  const file = parsed.data as ExportFile;
  const reviewed = Object.keys(file.data.srs.cards).length;
  const attempts = file.data.attempts.log.length;
  return { ok: true, file, summary: `${reviewed} cards scheduled, ${attempts} attempts, exported ${file.exportedAt.slice(0, 10)}.` };
}

/** Reads a user-chosen file with the size cap applied before reading. Never throws. */
export async function readImportFile(file: Blob): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'That file is larger than 5 MB, so it is not a COLDBOOT progress file. Choose the file you exported from Settings.' };
  }
  try {
    return parseImport(await file.text());
  } catch {
    return { ok: false, error: 'That file could not be read. Try exporting again, then import the new file.' };
  }
}

/** Replaces all progress with an imported file, then writes it to storage immediately. */
export function applyImport(file: ExportFile): void {
  useSettings.getState().replace(file.data.settings);
  useSrs.getState().replace(file.data.srs);
  useAttempts.getState().replace(file.data.attempts);
  useSession.getState().replace(file.data.session);
  flushAllPersisted();
}

/** Deletes every COLDBOOT key and resets every store to first-run state. */
export function resetAllProgress(): void {
  useSettings.getState().reset();
  useSrs.getState().reset();
  useAttempts.getState().reset();
  useSession.getState().reset();
  flushAllPersisted();
  removeAllKeys();
}
