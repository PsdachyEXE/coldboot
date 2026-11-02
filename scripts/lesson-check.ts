/**
 * Checks lesson files before they are merged (docs/LEARN.md, Phase C):
 *
 *   npx tsx scripts/lesson-check.ts <lessons.json> [...]
 *
 * Each file is an array of lessons. They are checked with every content rule (as if merged into
 * their areas' lessons.json, replacing any lesson for the same point), then scanned for copied
 * text: any run of OVERLAP_WORDS words shared with a VCAA source in reference/text/ is an error.
 * The sources are gitignored, so the overlap scan is skipped (with a warning) where they're absent.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkContent } from '../src/content/check';
import { LessonsFileSchema, type AreaId, type Lesson } from '../src/content/schema';
import { readContentDir } from './readContent';

export const OVERLAP_WORDS = 8;
const root = resolve(import.meta.dirname, '..');

/** Lowercase word tokens, punctuation dropped, so line breaks and quotes don't hide a copy. */
export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[‘’]/g, "'")
    .split(/[^a-z0-9']+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
}

function shingles(tokens: string[], n: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) out.add(tokens.slice(i, i + n).join(' '));
  return out;
}

/** Every run of `n` words in `text` that also appears in a source, merged into maximal phrases. */
export function overlaps(text: string, sources: Set<string>, n = OVERLAP_WORDS): string[] {
  const t = words(text);
  const hits: string[] = [];
  let i = 0;
  while (i + n <= t.length) {
    if (sources.has(t.slice(i, i + n).join(' '))) {
      let j = i + n;
      while (j < t.length && sources.has(t.slice(j - n + 1, j + 1).join(' '))) j++;
      hits.push(t.slice(i, j).join(' '));
      i = j;
    } else i++;
  }
  return hits;
}

function lessonFields(l: Lesson): [string, string][] {
  const out: [string, string][] = [['intro', l.intro]];
  l.sections.forEach((s, i) => out.push([`sections[${i}].heading`, s.heading], [`sections[${i}].body`, s.body]));
  (l.traps ?? []).forEach((t, i) => out.push([`traps[${i}]`, t]));
  if (l.worked) {
    out.push(['worked.prompt', l.worked.prompt], ['worked.model', l.worked.model]);
    l.worked.points.forEach((p, i) => out.push([`worked.points[${i}]`, p.text]));
  }
  return out;
}

function main(files: string[]): number {
  if (!files.length) {
    console.error('usage: npx tsx scripts/lesson-check.ts <lessons.json> [...]');
    return 2;
  }
  const raw = readContentDir(root);
  const incoming: Lesson[] = [];
  let failed = false;
  for (const f of files) {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(resolve(f), 'utf8'));
    } catch (e) {
      console.error(`error ${f}: invalid JSON (${e instanceof Error ? e.message : String(e)})`);
      failed = true;
      continue;
    }
    const parsed = LessonsFileSchema.safeParse(data);
    if (!parsed.success) {
      for (const i of parsed.error.issues.slice(0, 30)) console.error(`error ${f}: ${i.path.join('.') || '(root)'}: ${i.message}`);
      failed = true;
      continue;
    }
    incoming.push(...parsed.data);
  }

  // Merge into the areas, replacing a merged lesson for the same point.
  const ids = new Set(incoming.map((l) => l.id));
  for (const area of Object.keys(raw.areas) as AreaId[]) {
    const existing = Array.isArray(raw.areas[area].lessons) ? (raw.areas[area].lessons as Lesson[]).filter((l) => !ids.has(l.id)) : [];
    const mine = incoming.filter((l) => typeof l.kk === 'string' && l.kk.startsWith(area));
    raw.areas[area].lessons = existing.length || mine.length ? [...existing, ...mine] : raw.areas[area].lessons;
  }
  // A lesson for a point outside the four areas has nowhere to go; the schema already rejects most.
  for (const l of incoming) {
    if (/^U[34]O[12]-KK\d{2}$/.test(l.kk)) continue;
    console.error(`error ${l.id}: kk ${l.kk} is not one of the 52 key knowledge points`);
    failed = true;
  }

  const report = checkContent(raw);
  const mine = (e: string) => [...ids].some((id) => e.includes(id)) || e.includes('lessons.json: (root)') || /lessons\.json: \d+\./.test(e);
  for (const e of report.errors.filter(mine)) {
    console.error(`error ${e}`);
    failed = true;
  }

  // Overlap with the VCAA sources.
  const dir = resolve(root, 'reference/text');
  if (!existsSync(dir)) {
    console.warn('warn  reference/text/ is missing, so the copied-text scan was skipped');
  } else {
    const sources = new Set<string>();
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.txt'))) {
      for (const s of shingles(words(readFileSync(resolve(dir, f), 'utf8')), OVERLAP_WORDS)) sources.add(s);
    }
    for (const l of incoming) {
      for (const [field, text] of lessonFields(l)) {
        for (const hit of overlaps(text, sources)) {
          console.error(`error ${l.id} ${field}: ${hit.split(' ').length} words match a VCAA source; reword: "${hit}"`);
          failed = true;
        }
      }
    }
  }

  const words_ = (l: Lesson) => [l.intro, ...l.sections.map((s) => s.body)].join(' ');
  for (const l of incoming)
    console.info(`${l.id}: ${l.sections.length} sections, ~${words(words_(l)).length} words${l.worked ? ', worked example' : ''}${l.traps ? `, ${l.traps.length} traps` : ''}`);
  console.info(failed ? `lesson-check: failed (${incoming.length} lessons read)` : `lesson-check: ok (${incoming.length} lessons)`);
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) process.exit(main(process.argv.slice(2)));
