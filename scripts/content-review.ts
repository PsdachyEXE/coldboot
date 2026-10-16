/**
 * Applies reviewed content fixes by id, checks the result with the full content checker, and
 * optionally writes it back. Built for the source reconciliation (DECISIONS D-198 onwards), and
 * reusable for any review that replaces or drops existing items.
 *
 *   npx tsx scripts/content-review.ts apply <review.json> [...]           dry run: report errors only
 *   npx tsx scripts/content-review.ts apply <review.json> [...] --write   write content/ if clean
 *
 * Review file shape (JSON):
 *   {
 *     "fixes":     [{ "id": "m-u3o1-kk04-002", "replacement": { ...the whole item, same id... } }],
 *     "drops":     [{ "id": "c-u3o2-kk16-004" }],
 *     "caseFixes": [{ "id": "cs-03", "patch": { "insert"?: string, "figures"?: [...], "title"?: string } }]
 *   }
 *
 * Fixes and drops find their item anywhere: an outcome file, terms.json, psm.json or a case study.
 * A replacement keeps the item's id; moving an item to another KK keeps it in its current file
 * (ids are permanent; content/README.md). The dry run lists every checker error, and marks the
 * ones that name an item this review touched.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkContent, type RawContent } from '../src/content/check';
import { AREA_IDS } from '../src/content/schema';
import { readContentDir } from './readContent';

interface Review {
  fixes?: { id: string; replacement: { id: string } & Record<string, unknown> }[];
  drops?: { id: string }[];
  caseFixes?: { id: string; patch: Record<string, unknown> }[];
}

type Item = { id: string } & Record<string, unknown>;

const root = resolve(import.meta.dirname, '..');

function lists(raw: RawContent): { where: string; list: Item[] }[] {
  const out: { where: string; list: Item[] }[] = [];
  for (const area of AREA_IDS) {
    const files = raw.areas[area];
    for (const key of ['cards', 'mcq', 'short'] as const) {
      if (Array.isArray(files?.[key])) out.push({ where: `content/${area.toLowerCase()}/${key}.json`, list: files[key] as Item[] });
    }
  }
  if (Array.isArray(raw.terms)) out.push({ where: 'content/terms.json', list: raw.terms as Item[] });
  const psm = raw.psm as Record<string, unknown> | undefined;
  for (const key of ['cards', 'mcq', 'short'] as const) {
    if (psm && Array.isArray(psm[key])) out.push({ where: `content/psm.json (${key})`, list: psm[key] as Item[] });
  }
  for (const cs of raw.caseStudies) {
    const data = cs.data as { id?: string; questions?: Item[] } | undefined;
    if (data && Array.isArray(data.questions)) out.push({ where: `content/case-studies/${data.id}.json`, list: data.questions });
  }
  return out;
}

function apply(raw: RawContent, review: Review, source: string, problems: string[], touched: Set<string>): void {
  const all = lists(raw);
  const find = (id: string) => {
    for (const l of all) {
      const i = l.list.findIndex((it) => it.id === id);
      if (i >= 0) return { ...l, index: i };
    }
    return null;
  };
  for (const f of review.fixes ?? []) {
    if (!f || typeof f.id !== 'string' || !f.replacement || typeof f.replacement !== 'object') {
      problems.push(`${source}: a fix is missing its id or replacement`);
      continue;
    }
    if (f.replacement.id !== f.id) {
      problems.push(`${source}: fix ${f.id} has a replacement with id ${String(f.replacement.id)}; ids are permanent`);
      continue;
    }
    const at = find(f.id);
    if (!at) {
      problems.push(`${source}: fix ${f.id}: no such item`);
      continue;
    }
    at.list[at.index] = f.replacement;
    touched.add(f.id);
  }
  for (const d of review.drops ?? []) {
    const at = find(d.id);
    if (!at) {
      problems.push(`${source}: drop ${d.id}: no such item`);
      continue;
    }
    at.list.splice(at.index, 1);
    touched.add(d.id);
  }
  for (const c of review.caseFixes ?? []) {
    const cs = raw.caseStudies.find((x) => (x.data as { id?: string } | undefined)?.id === c.id);
    if (!cs) {
      problems.push(`${source}: case fix ${c.id}: no such case study`);
      continue;
    }
    for (const key of Object.keys(c.patch)) {
      if (!['insert', 'figures', 'title'].includes(key)) problems.push(`${source}: case fix ${c.id}: field ${key} can't be patched here`);
    }
    Object.assign(cs.data as object, Object.fromEntries(Object.entries(c.patch).filter(([k]) => ['insert', 'figures', 'title'].includes(k))));
    touched.add(c.id);
  }
}

function write(raw: RawContent): void {
  const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;
  for (const area of AREA_IDS) {
    const files = raw.areas[area];
    for (const key of ['cards', 'mcq', 'short'] as const) {
      if (Array.isArray(files?.[key])) writeFileSync(resolve(root, 'content', area.toLowerCase(), `${key}.json`), json(files[key]));
    }
  }
  if (raw.terms !== undefined) writeFileSync(resolve(root, 'content/terms.json'), json(raw.terms));
  if (raw.psm !== undefined) writeFileSync(resolve(root, 'content/psm.json'), json(raw.psm));
  for (const cs of raw.caseStudies) {
    const id = (cs.data as { id?: string } | undefined)?.id;
    if (id) writeFileSync(resolve(root, 'content/case-studies', `${id}.json`), json(cs.data));
  }
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  const files = rest.filter((a) => !a.startsWith('--'));
  if (command !== 'apply' || files.length === 0) {
    console.error('usage: npx tsx scripts/content-review.ts apply <review.json> [...] [--write]');
    process.exit(2);
  }
  const raw = readContentDir();
  const problems: string[] = [];
  const touched = new Set<string>();
  for (const f of files) {
    let review: Review;
    try {
      review = JSON.parse(readFileSync(f, 'utf8')) as Review;
    } catch (e) {
      problems.push(`${f}: invalid JSON (${e instanceof Error ? e.message : String(e)})`);
      continue;
    }
    apply(raw, review, f, problems, touched);
  }
  const report = checkContent(raw);
  const mentions = (e: string) => [...touched].some((id) => e.includes(id));
  for (const p of problems) console.error(`error ${p}`);
  for (const e of report.errors) console.error(`${mentions(e) ? 'error*' : 'error '} ${e}`);
  for (const f of report.floorErrors) console.error(`error  floor: ${f}`);
  const t = report.totals;
  console.info(`after review: ${t.cards} cards (${t.terms} glossary), ${t.mcq} MCQs, ${t.short} short answers; ${touched.size} items touched`);
  // Floors count, as in the strict content:check the deploy runs (D-093).
  const failed = problems.length > 0 || report.errors.length > 0 || report.floorErrors.length > 0;
  if (process.argv.includes('--write')) {
    if (failed) {
      console.error('content-review: not written (fix the errors above first)');
      process.exit(1);
    }
    write(raw);
    console.info('content-review: written');
  } else if (failed) {
    process.exit(1);
  } else {
    console.info('content-review: clean (dry run; add --write to save)');
  }
}

main();
