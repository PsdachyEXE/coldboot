/**
 * Zod, configured. Every module that builds or runs a schema imports `z` from here, never from
 * 'zod' directly (ESLint enforces it), so the settings below apply before any schema exists,
 * whichever chunk the bundler puts a module in.
 *
 * Zod 4 probes for eval support with `new Function('')` when it builds its first object schema.
 * The production CSP (`script-src 'self'`) blocks that and fires a `securitypolicyviolation` event,
 * even though Zod catches the error. Jitless mode skips the probe and uses the interpreted parser,
 * which is quick enough for COLDBOOT's stores and import files. Importing this module first in
 * main.tsx alone isn't enough: code splitting can evaluate a chunk of schema modules before
 * main.tsx's own body runs.
 */
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- the one place that imports Zod itself
import { z } from 'zod';

z.config({ jitless: true });

export { z };
