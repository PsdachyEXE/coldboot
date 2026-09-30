/**
 * Content fragments ("parts") for parallel authoring. Authors write part files outside the repo,
 * check them in isolation, and the merge step builds the canonical content files from all parts.
 *
 *   npx tsx scripts/content-parts.ts check <part.json> [...]
 *   npx tsx scripts/content-parts.ts merge <partsDir> [--out <repoRoot>]
 *
 * Part file shapes (JSON):
 *   { "kind": "items", "kks": ["U3O1-KK01", ...], "cards": [...], "mcq": [...], "short": [...] }
 *   { "kind": "terms", "glossary": [{ "term", "aliases"?, "status" }], "cards": [...] }
 *   { "kind": "psm", "psm": { stages, specifications, cards, mcq, short } }
 *   { "kind": "case-study", "caseStudy": { id, title, insert, figures, questions, totalMarks } }
 *
 * `check` runs the full content checker over the repo's content plus this part, and reports
 * errors that concern the part, and floor shortfalls for the KKs the part covers.
 * `merge` rewrites content/<area>/{cards,mcq,short}.json, terms.json, psm.json, case-studies/*.json
 * and the glossary in study-design.json from every part in the directory (items sorted by id).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { checkContent, type RawContent } from '../src/content/check';
import { AREA_IDS, type AreaId, type Card, type CaseStudy, type GlossaryEntry, type Mcq, type PsmFile, type ShortAnswer } from '../src/content/schema';
import { readContentDir } from './readContent';

type ItemsPart = { kind: 'items'; kks: string[]; cards?: Card[]; mcq?: Mcq[]; short?: ShortAnswer[] };
type TermsPart = { kind: 'terms'; glossary: GlossaryEntry[]; cards: Card[] };
type PsmPart = { kind: 'psm'; psm: PsmFile };
type CasePart = { kind: 'case-study'; caseStudy: CaseStudy };
type Part = ItemsPart | TermsPart | PsmPart | CasePart;

const repoRoot = resolve(import.meta.dirname, '..');

function readPart(path: string): Part {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Part;
  if (!raw || typeof raw !== 'object' || !['items', 'terms', 'psm', 'case-study'].includes((raw as Part).kind)) {
    throw new Error(`${path}: missing or unknown "kind" (items, terms, psm, case-study)`);
  }
  return raw;
}

function areaOfItem(item: { kk: string[] }): AreaId | null {
  const a = item.kk[0]?.slice(0, 4) as AreaId;
  return AREA_IDS.includes(a) ? a : null;
}

/** Adds a part's items to a RawContent (as if it were already merged). */
function addPart(raw: RawContent, part: Part): void {
  const push = (area: AreaId, key: 'cards' | 'mcq' | 'short', items: unknown[]) => {
    const slot = (raw.areas[area] ??= {});
    const current = Array.isArray(slot[key]) ? (slot[key] as unknown[]) : [];
    slot[key] = [...current, ...items];
  };
  if (part.kind === 'items') {
    for (const key of ['cards', 'mcq', 'short'] as const) {
      for (const item of (part[key] ?? []) as { kk: string[] }[]) {
        const area = areaOfItem(item);
        if (area) push(area, key, [item]);
        else raw.parseErrors = [...(raw.parseErrors ?? []), `item ${(item as { id?: string }).id ?? '?'} has no Unit 3/4 primary KK (TERMS and PSM items belong in terms/psm parts)`];
      }
    }
  } else if (part.kind === 'terms') {
    raw.terms = [...(Array.isArray(raw.terms) ? raw.terms : []), ...part.cards];
    const sd = raw.studyDesign as { glossary?: GlossaryEntry[] };
    raw.studyDesign = { ...sd, glossary: [...(sd.glossary ?? []), ...part.glossary] };
  } else if (part.kind === 'psm') {
    raw.psm = part.psm;
  } else {
    raw.caseStudies = [...raw.caseStudies.filter((c) => !c.file.endsWith(`/${part.caseStudy.id}.json`)), { file: `content/case-studies/${part.caseStudy.id}.json`, data: part.caseStudy }];
  }
}

function partIds(part: Part): Set<string> {
  const ids = new Set<string>();
  if (part.kind === 'items') [...(part.cards ?? []), ...(part.mcq ?? []), ...(part.short ?? [])].forEach((i) => ids.add(i.id));
  if (part.kind === 'terms') part.cards.forEach((c) => ids.add(c.id));
  if (part.kind === 'psm') [...part.psm.cards, ...part.psm.mcq, ...part.psm.short].forEach((i) => ids.add(i.id));
  if (part.kind === 'case-study') {
    ids.add(part.caseStudy.id);
    part.caseStudy.questions.forEach((q) => ids.add(q.id));
  }
  return ids;
}

function check(files: string[]): number {
  let failures = 0;
  for (const file of files) {
    let part: Part;
    try {
      part = readPart(file);
    } catch (e) {
      console.error(`error ${e instanceof Error ? e.message : String(e)}`);
      failures++;
      continue;
    }
    const raw = readContentDir(repoRoot);
    addPart(raw, part);
    const report = checkContent(raw);
    const ids = partIds(part);
    const mine = (line: string) =>
      [...ids].some((id) => line.includes(id)) ||
      (part.kind === 'terms' && line.includes('terms.json')) ||
      (part.kind === 'psm' && line.includes('psm.json')) ||
      (part.kind === 'case-study' && line.includes(part.caseStudy.id)) ||
      line.includes('item ') ||
      (part.kind === 'items' && part.kks.some((kk) => line.includes(kk)) && !line.startsWith('content/study-design'));
    const errors = report.errors.filter(mine);
    const floors =
      part.kind === 'items'
        ? report.floorErrors.filter((f) => part.kks.some((kk) => f.startsWith(`${kk}:`)))
        : part.kind === 'terms'
          ? report.floorErrors.filter((f) => f.startsWith('TERMS'))
          : part.kind === 'psm'
            ? report.floorErrors.filter((f) => f.startsWith('PSM'))
            : [];
    const warnings = report.warnings.filter(mine);
    console.info(`\n${basename(file)} (${part.kind})`);
    errors.forEach((e) => console.error(`  error ${e}`));
    floors.forEach((f) => console.error(`  floor ${f}`));
    warnings.forEach((w) => console.warn(`  warn  ${w}`));
    if (part.kind === 'items') {
      for (const kk of part.kks) {
        const c = report.counts.get(kk as never);
        console.info(`  ${kk}: ${c?.cards ?? 0} cards, ${c?.mcq ?? 0} MCQs, ${c?.short ?? 0} short answers`);
      }
    }
    if (!errors.length && !floors.length) console.info('  ok');
    else failures++;
  }
  return failures;
}

function listParts(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listParts(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out.sort();
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function merge(dir: string, outRoot: string): void {
  const parts = listParts(dir).map(readPart);
  const byArea = Object.fromEntries(AREA_IDS.map((a) => [a, { cards: [] as Card[], mcq: [] as Mcq[], short: [] as ShortAnswer[] }])) as Record<
    AreaId,
    { cards: Card[]; mcq: Mcq[]; short: ShortAnswer[] }
  >;
  const glossary: GlossaryEntry[] = [];
  const terms: Card[] = [];
  let psm: PsmFile | null = null;
  const cases: CaseStudy[] = [];
  for (const part of parts) {
    if (part.kind === 'items') {
      for (const key of ['cards', 'mcq', 'short'] as const) {
        for (const item of part[key] ?? []) {
          const area = areaOfItem(item);
          if (!area) throw new Error(`item ${item.id} has no Unit 3/4 primary KK`);
          (byArea[area][key] as unknown[]).push(item);
        }
      }
    } else if (part.kind === 'terms') {
      glossary.push(...part.glossary);
      terms.push(...part.cards);
    } else if (part.kind === 'psm') {
      psm = part.psm;
    } else cases.push(part.caseStudy);
  }
  const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const content = resolve(outRoot, 'content');
  for (const area of AREA_IDS) {
    const dirOut = resolve(content, area.toLowerCase());
    for (const key of ['cards', 'mcq', 'short'] as const) {
      const items = [...byArea[area][key]].sort(byId);
      if (items.length) writeJson(resolve(dirOut, `${key}.json`), items);
    }
  }
  if (terms.length) {
    writeJson(resolve(content, 'terms.json'), [...terms].sort(byId));
    const sdPath = resolve(content, 'study-design.json');
    const sd = JSON.parse(readFileSync(sdPath, 'utf8')) as { glossary: GlossaryEntry[] };
    sd.glossary = [...glossary].sort((a, b) => a.term.toLowerCase().localeCompare(b.term.toLowerCase()));
    writeJson(sdPath, sd);
  }
  if (psm) writeJson(resolve(content, 'psm.json'), psm);
  for (const cs of cases) writeJson(resolve(content, 'case-studies', `${cs.id}.json`), cs);
  const counts = AREA_IDS.map((a) => `${a}: ${byArea[a].cards.length}/${byArea[a].mcq.length}/${byArea[a].short.length}`).join(', ');
  console.info(`merged ${parts.length} parts. cards/mcq/short per area: ${counts}; ${terms.length} glossary cards; psm ${psm ? 'yes' : 'no'}; ${cases.length} case studies`);
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'check') {
  if (!rest.length) throw new Error('usage: content-parts.ts check <part.json> [...]');
  process.exit(check(rest) ? 1 : 0);
} else if (cmd === 'merge') {
  const dir = rest[0];
  if (!dir || !existsSync(dir)) throw new Error('usage: content-parts.ts merge <partsDir> [--out <repoRoot>]');
  const outIdx = rest.indexOf('--out');
  merge(dir, outIdx >= 0 ? resolve(rest[outIdx + 1]) : repoRoot);
} else {
  console.error('usage: content-parts.ts check <part.json> [...] | merge <partsDir> [--out <repoRoot>]');
  process.exit(1);
}
