/**
 * Merges checked lesson files into content/<area>/lessons.json (docs/LEARN.md, Phase C):
 *
 *   npx tsx scripts/lesson-merge.ts <lessons.json> [...]
 *
 * A lesson replaces a merged lesson with the same id. Each area's file is written sorted by key
 * knowledge point, in the same JSON layout as the other content files. Run scripts/lesson-check.ts
 * on the same files first; this script only refuses files that fail the schema.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AREA_IDS, LessonsFileSchema, type Lesson } from '../src/content/schema';

const root = resolve(import.meta.dirname, '..');
const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: npx tsx scripts/lesson-merge.ts <lessons.json> [...]');
  process.exit(2);
}
const incoming: Lesson[] = [];
for (const f of files) {
  const parsed = LessonsFileSchema.safeParse(JSON.parse(readFileSync(resolve(f), 'utf8')));
  if (!parsed.success) {
    console.error(`${f}: not a valid lessons file; run scripts/lesson-check.ts on it`);
    process.exit(1);
  }
  incoming.push(...parsed.data);
}
for (const area of AREA_IDS) {
  const mine = incoming.filter((l) => l.kk.startsWith(area));
  if (!mine.length) continue;
  const path = resolve(root, 'content', area.toLowerCase(), 'lessons.json');
  const existing: Lesson[] = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
  const byId = new Map(existing.map((l) => [l.id, l]));
  for (const l of mine) byId.set(l.id, l);
  const merged = [...byId.values()].sort((a, b) => (a.kk < b.kk ? -1 : a.kk > b.kk ? 1 : 0));
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`);
  console.info(`${path}: ${merged.length} lessons (${mine.length} merged)`);
}
