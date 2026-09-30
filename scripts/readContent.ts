/** Reads content/ from disk into the shape src/content/check.ts expects. Node only. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { AREA_IDS, type AreaId } from '../src/content/schema';
import type { RawContent } from '../src/content/check';

const KNOWN_AREA_FILES = new Set(['cards.json', 'mcq.json', 'short.json']);

export function readContentDir(root = resolve(import.meta.dirname, '..')): RawContent {
  const content = resolve(root, 'content');
  const parseErrors: string[] = [];
  const unknownFiles: string[] = [];
  const rel = (path: string) => relative(root, path).split(sep).join('/');
  const readIf = (path: string): unknown => {
    if (!existsSync(path)) return undefined;
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
      parseErrors.push(`${rel(path)}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
      return undefined;
    }
  };
  const areas = {} as RawContent['areas'];
  for (const area of AREA_IDS) {
    const dir = resolve(content, area.toLowerCase());
    areas[area as AreaId] = {
      cards: readIf(resolve(dir, 'cards.json')),
      mcq: readIf(resolve(dir, 'mcq.json')),
      short: readIf(resolve(dir, 'short.json')),
    };
    if (existsSync(dir)) {
      for (const f of readdirSync(dir)) if (!KNOWN_AREA_FILES.has(f) && f !== '.gitkeep') unknownFiles.push(rel(resolve(dir, f)));
    }
  }
  const csDir = resolve(content, 'case-studies');
  const caseStudies: RawContent['caseStudies'] = [];
  if (existsSync(csDir)) {
    for (const f of readdirSync(csDir).sort()) {
      if (f === '.gitkeep') continue;
      if (!/^cs-\d{2}\.json$/.test(f)) {
        unknownFiles.push(rel(resolve(csDir, f)));
        continue;
      }
      const data = readIf(resolve(csDir, f));
      if (data !== undefined) caseStudies.push({ file: `content/case-studies/${f}`, data });
    }
  }
  const topLevel = new Set(['study-design.json', 'terms.json', 'psm.json', 'README.md', 'case-studies', 'u3o1', 'u3o2', 'u4o1', 'u4o2']);
  if (existsSync(content)) {
    for (const f of readdirSync(content)) if (!topLevel.has(f)) unknownFiles.push(rel(resolve(content, f)));
  }
  return {
    studyDesign: readIf(resolve(content, 'study-design.json')),
    areas,
    terms: readIf(resolve(content, 'terms.json')),
    psm: readIf(resolve(content, 'psm.json')),
    caseStudies,
    parseErrors,
    unknownFiles,
  };
}
