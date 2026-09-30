/**
 * Zod settings that must apply before any schema is built, so main.tsx imports this module first.
 *
 * Zod 4 probes for eval support with `new Function('')` when it builds its first object schema.
 * The production CSP (`script-src 'self'`) blocks that and fires a `securitypolicyviolation` event,
 * even though Zod catches the error. Jitless mode skips the probe and uses the interpreted parser,
 * which is quick enough for COLDBOOT's stores and import files.
 */
import { z } from 'zod';

z.config({ jitless: true });
