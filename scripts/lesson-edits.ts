/**
 * Applies exact text edits to lesson part files (docs/LEARN.md, Phase C review):
 *
 *   npx tsx scripts/lesson-edits.ts <edits.json> <parts.json> [...]
 *
 * edits.json is an array of { lesson, field, old, new } where field is a path such as "intro",
 * "sections[2].body", "traps[0]", "worked.model" or "worked.points[1].text". Each `old` must occur
 * exactly once in that field; an edit that doesn't is reported and skipped, never guessed at.
 * The part files are rewritten in place with the same layout lesson-merge writes.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Edit {
  lesson: string;
  field: string;
  old: string;
  new: string;
}

type Json = Record<string, unknown>;

function locate(root: Json, path: string): { parent: Json | unknown[]; key: string | number } | null {
  const parts = path.match(/[^.[\]]+/g) ?? [];
  let node: unknown = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    node = Array.isArray(node) ? node[Number(p)] : (node as Json | undefined)?.[p];
    if (node === undefined || node === null) return null;
  }
  const last = parts[parts.length - 1];
  return { parent: node as Json | unknown[], key: Array.isArray(node) ? Number(last) : last };
}

const [editsPath, ...partPaths] = process.argv.slice(2);
if (!editsPath || !partPaths.length) {
  console.error('usage: npx tsx scripts/lesson-edits.ts <edits.json> <parts.json> [...]');
  process.exit(2);
}
const edits = JSON.parse(readFileSync(resolve(editsPath), 'utf8')) as Edit[];
const files = partPaths.map((p) => ({ path: resolve(p), lessons: JSON.parse(readFileSync(resolve(p), 'utf8')) as Json[], dirty: false }));
let applied = 0;
let skipped = 0;
for (const e of edits) {
  const file = files.find((f) => f.lessons.some((l) => l.id === e.lesson));
  const lesson = file?.lessons.find((l) => l.id === e.lesson);
  const at = lesson ? locate(lesson, e.field) : null;
  const value = at ? (at.parent as Record<string | number, unknown>)[at.key] : undefined;
  if (!file || typeof value !== 'string') {
    console.error(`skip  ${e.lesson} ${e.field}: no such lesson or text field`);
    skipped++;
    continue;
  }
  const count = value.split(e.old).length - 1;
  if (count !== 1) {
    console.error(`skip  ${e.lesson} ${e.field}: the old text occurs ${count} times`);
    skipped++;
    continue;
  }
  (at!.parent as Record<string | number, unknown>)[at!.key] = value.replace(e.old, () => e.new);
  file.dirty = true;
  applied++;
}
for (const f of files) if (f.dirty) writeFileSync(f.path, `${JSON.stringify(f.lessons, null, 2)}\n`);
console.info(`lesson-edits: ${applied} applied, ${skipped} skipped`);
process.exit(skipped ? 1 : 0);
