/**
 * Content checker shared by `npm run content:check` and the test suite. Pure: callers read the
 * files and pass their parsed JSON (or undefined when a file is missing).
 */
import type { z } from 'zod';
import { isCommandTerm } from './commandTerms';
import {
  AREA_IDS,
  CardsFileSchema,
  CaseStudySchema,
  FLOORS,
  McqFileSchema,
  PsmFileSchema,
  ShortFileSchema,
  StudyDesignSchema,
  TermsFileSchema,
  areaOf,
  isMcq,
  type AreaId,
  type Card,
  type CaseStudy,
  type KkId,
  type Mcq,
  type PsmFile,
  type ShortAnswer,
  type StudyDesign,
} from './schema';

export interface RawContent {
  studyDesign: unknown;
  areas: Record<AreaId, { cards?: unknown; mcq?: unknown; short?: unknown }>;
  terms?: unknown;
  psm?: unknown;
  caseStudies: { file: string; data: unknown }[];
  /** JSON syntax errors, reported as-is rather than as misleading schema errors. */
  parseErrors?: string[];
  /** Files under content/ that nothing loads (e.g. a misnamed `mcqs.json`). */
  unknownFiles?: string[];
}

export interface CheckReport {
  errors: string[];
  floorErrors: string[];
  warnings: string[];
  counts: Map<KkId, { cards: number; mcq: number; short: number }>;
  totals: { cards: number; mcq: number; short: number; caseStudies: number; terms: number };
}

function describeIssues(file: string, error: z.ZodError): string[] {
  return error.issues.slice(0, 20).map((i) => `${file}: ${i.path.join('.') || '(root)'}: ${i.message}`);
}

/** Strips code spans, fenced blocks and <<stereotype>> labels, then looks for HTML tags. */
export function containsRawHtml(text: string): boolean {
  const stripped = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/<<[a-z]+>>/gi, '');
  return /<\/?[a-zA-Z][^>]*>/.test(stripped) || /<!--/.test(stripped);
}

/** `u3o1-kk04`: the KK part of a card, MCQ or short-answer id. */
const KK_ID_SEGMENT = /^u[34]o[12]-kk\d{2}$/;

export function normaliseStem(stem: string): string {
  return stem.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function textFields(item: Card | Mcq | ShortAnswer): string[] {
  if ('front' in item) return [item.front, item.back, item.mistake ?? ''];
  if ('options' in item) return [item.stem, ...item.options, item.explanation, ...item.whyWrong];
  return [item.prompt, item.model, item.mistake ?? '', ...item.points.map((p) => p.text)];
}

export function checkContent(raw: RawContent): CheckReport {
  const errors: string[] = [];
  const floorErrors: string[] = [];
  const warnings: string[] = [];

  for (const e of raw.parseErrors ?? []) errors.push(e);
  for (const f of raw.unknownFiles ?? []) errors.push(`${f}: not a recognised content file (nothing loads it). Expected cards.json, mcq.json, short.json, terms.json, psm.json or case-studies/cs-NN.json`);

  const sdParsed = StudyDesignSchema.safeParse(raw.studyDesign);
  if (!sdParsed.success) {
    errors.push(...describeIssues('content/study-design.json', sdParsed.error));
  }
  const sd: StudyDesign | null = sdParsed.success ? sdParsed.data : null;
  const knownKks = new Set<string>(['TERMS', 'PSM', ...(sd?.kks.map((k) => k.id) ?? [])]);

  const cards: { file: string; item: Card }[] = [];
  const mcqs: { file: string; item: Mcq }[] = [];
  const shorts: { file: string; item: ShortAnswer }[] = [];

  const parse = <T>(file: string, schema: z.ZodType<T>, data: unknown, required: boolean): T | null => {
    if (data === undefined) {
      if (required) errors.push(`${file}: missing`);
      return null;
    }
    const r = schema.safeParse(data);
    if (!r.success) {
      errors.push(...describeIssues(file, r.error));
      return null;
    }
    return r.data;
  };

  for (const area of AREA_IDS) {
    const dir = `content/${area.toLowerCase()}`;
    const a = raw.areas[area] ?? {};
    parse(`${dir}/cards.json`, CardsFileSchema, a.cards, false)?.forEach((item) => cards.push({ file: `${dir}/cards.json`, item }));
    parse(`${dir}/mcq.json`, McqFileSchema, a.mcq, false)?.forEach((item) => mcqs.push({ file: `${dir}/mcq.json`, item }));
    parse(`${dir}/short.json`, ShortFileSchema, a.short, false)?.forEach((item) => shorts.push({ file: `${dir}/short.json`, item }));
  }
  const terms = parse('content/terms.json', TermsFileSchema, raw.terms, false) ?? [];
  terms.forEach((item) => cards.push({ file: 'content/terms.json', item }));
  const psm: PsmFile | null = parse('content/psm.json', PsmFileSchema, raw.psm, false);
  psm?.cards.forEach((item) => cards.push({ file: 'content/psm.json', item }));
  psm?.mcq.forEach((item) => mcqs.push({ file: 'content/psm.json', item }));
  psm?.short.forEach((item) => shorts.push({ file: 'content/psm.json', item }));

  const caseStudies: CaseStudy[] = [];
  for (const { file, data } of raw.caseStudies) {
    const cs = parse(file, CaseStudySchema, data, true);
    if (!cs) continue;
    if (!file.endsWith(`/${cs.id}.json`)) errors.push(`${file}: file name must match the id (${cs.id}.json)`);
    caseStudies.push(cs);
  }

  // Unique ids across everything, including case study questions and figures within a case study.
  const seen = new Map<string, string>();
  const claim = (id: string, file: string) => {
    const prev = seen.get(id);
    if (prev) errors.push(`${file}: duplicate id ${id} (also in ${prev})`);
    else seen.set(id, file);
  };
  cards.forEach(({ file, item }) => claim(item.id, file));
  mcqs.forEach(({ file, item }) => claim(item.id, file));
  shorts.forEach(({ file, item }) => claim(item.id, file));
  caseStudies.forEach((cs) => cs.questions.forEach((q) => claim(q.id, `content/case-studies/${cs.id}.json`)));

  // Id conventions: the prefix names the kind, and the KK segment names the item's primary KK.
  const expectId = (id: string, kind: 'card' | 'mcq' | 'short', primary: string, file: string) => {
    const letter = { card: 'c', mcq: 'm', short: 's' }[kind];
    const kkSeg = primary.toLowerCase();
    const ok =
      (file === 'content/terms.json' && kind === 'card' && /^t-[a-z0-9-]+$/.test(id)) ||
      (file === 'content/psm.json' && new RegExp(`^psm-${letter}-\\d{3}$`).test(id)) ||
      (KK_ID_SEGMENT.test(kkSeg) && id.startsWith(`${letter}-${kkSeg}-`) && /-\d{3}$/.test(id));
    if (!ok) errors.push(`${file}: id ${id} should look like ${file === 'content/terms.json' ? 't-<term-slug>' : file === 'content/psm.json' ? `psm-${letter}-001` : `${letter}-${kkSeg || 'u3o1-kk01'}-001`} (see docs/CONTRACTS.md)`);
  };
  cards.forEach(({ file, item }) => expectId(item.id, 'card', item.kk[0], file));
  mcqs.forEach(({ file, item }) => expectId(item.id, 'mcq', item.kk[0], file));
  shorts.forEach(({ file, item }) => expectId(item.id, 'short', item.kk[0], file));
  for (const cs of caseStudies) {
    cs.questions.forEach((q) => {
      if (!new RegExp(`^${cs.id}-q\\d{2}$`).test(q.id)) errors.push(`content/case-studies/${cs.id}.json: question id ${q.id} should look like ${cs.id}-q01`);
    });
  }
  // Items must sit in their primary KK's area file.
  for (const { file, item } of [...cards, ...mcqs, ...shorts]) {
    const m = /^content\/(u[34]o[12])\//.exec(file);
    if (m && item.kk[0].slice(0, 4).toLowerCase() !== m[1]) errors.push(`${file}: ${item.id} has primary KK ${item.kk[0]}, so it belongs in content/${item.kk[0].slice(0, 4).toLowerCase()}/`);
  }

  // KK references, raw HTML, command terms.
  const all: { file: string; item: Card | Mcq | ShortAnswer }[] = [...cards, ...mcqs, ...shorts];
  for (const cs of caseStudies) {
    for (const q of cs.questions) all.push({ file: `content/case-studies/${cs.id}.json`, item: q });
    if (containsRawHtml(cs.insert)) errors.push(`content/case-studies/${cs.id}.json: raw HTML in insert`);
  }
  for (const { file, item } of all) {
    for (const kk of item.kk) if (!knownKks.has(kk)) errors.push(`${file}: ${item.id} references unknown KK ${kk}`);
    if (new Set(item.kk).size !== item.kk.length) errors.push(`${file}: ${item.id} repeats a KK`);
    if (textFields(item).some(containsRawHtml)) errors.push(`${file}: ${item.id} contains raw HTML`);
    if ('commandTerm' in item && !isCommandTerm(item.commandTerm)) {
      errors.push(`${file}: ${item.id} uses unknown command term "${item.commandTerm}" (add it to src/content/commandTerms.ts if the source uses it)`);
    }
  }

  // Duplicate MCQ stems after normalising (standalone and case study questions).
  const stems = new Map<string, string>();
  const allMcqs: { file: string; item: Mcq }[] = [...mcqs];
  for (const cs of caseStudies) for (const q of cs.questions) if (isMcq(q)) allMcqs.push({ file: `content/case-studies/${cs.id}.json`, item: q });
  for (const { file, item } of allMcqs) {
    const key = normaliseStem(item.stem);
    const prev = stems.get(key);
    if (prev) errors.push(`${file}: ${item.id} duplicates the stem of ${prev}`);
    else stems.set(key, item.id);
  }

  // Glossary: exactly one TERMS card per glossary entry in study-design.json, and no extras.
  const norm = (t: string) => t.trim().toLowerCase();
  const fronts = new Map<string, string>();
  for (const t of terms) {
    const key = norm(t.front);
    if (fronts.has(key)) errors.push(`content/terms.json: ${t.id} repeats the term "${t.front}" (also ${fronts.get(key)})`);
    fronts.set(key, t.id);
    if (t.type !== 'reverse') errors.push(`content/terms.json: ${t.id} must be a reverse card`);
  }
  const glossary = sd?.glossary ?? [];
  const glossaryKeys = new Set<string>();
  for (const entry of glossary) {
    const keys = [entry.term, ...(entry.aliases ?? [])].map(norm);
    keys.forEach((k) => glossaryKeys.add(k));
    const matches = terms.filter((t) => keys.includes(norm(t.front)));
    if (matches.length === 0) floorErrors.push(`TERMS: no card for glossary entry "${entry.term}"`);
    if (matches.length > 1) errors.push(`content/terms.json: ${matches.length} cards for glossary entry "${entry.term}"`);
  }
  for (const t of terms) {
    if (glossary.length && !glossaryKeys.has(norm(t.front))) errors.push(`content/terms.json: ${t.id} ("${t.front}") is not in the glossary list in study-design.json`);
  }

  // Counts per KK (standalone items only; generated items never count).
  const counts = new Map<KkId, { cards: number; mcq: number; short: number }>();
  for (const id of knownKks) counts.set(id as KkId, { cards: 0, mcq: 0, short: 0 });
  cards.forEach(({ item }) => item.kk.forEach((kk) => counts.get(kk) && counts.get(kk)!.cards++));
  mcqs.forEach(({ item }) => item.kk.forEach((kk) => counts.get(kk) && counts.get(kk)!.mcq++));
  shorts.forEach(({ item }) => item.kk.forEach((kk) => counts.get(kk) && counts.get(kk)!.short++));

  // Floors (Section 8.2). A KK marked `held` (items held back pending the source) only warns.
  for (const kk of sd?.kks ?? []) {
    const c = counts.get(kk.id as KkId)!;
    const { cards: fc, mcq: fm, short: fs } = FLOORS.perKk;
    if (c.cards < fc || c.mcq < fm || c.short < fs) {
      const line = `${kk.id}: ${c.cards}/${fc} cards, ${c.mcq}/${fm} MCQs, ${c.short}/${fs} short answers`;
      if (kk.held) warnings.push(`floor (held: ${kk.held}): ${line}`);
      else floorErrors.push(line);
    }
  }
  const psmCount = counts.get('PSM')!;
  if (psmCount.cards < FLOORS.psm.cards || psmCount.mcq < FLOORS.psm.mcq) {
    floorErrors.push(`PSM: ${psmCount.cards}/${FLOORS.psm.cards} cards, ${psmCount.mcq}/${FLOORS.psm.mcq} MCQs`);
  }
  if (glossary.length === 0) floorErrors.push('TERMS: the glossary list in study-design.json is empty');
  if (caseStudies.length < FLOORS.caseStudies.P0) {
    floorErrors.push(`Case studies: ${caseStudies.length}/${FLOORS.caseStudies.P0}`);
  }

  // Case study shape: about 60 marks, 10 to 13 questions, all four areas of study.
  for (const cs of caseStudies) {
    const file = `content/case-studies/${cs.id}.json`;
    if (cs.questions.length < 10 || cs.questions.length > 13) warnings.push(`${file}: ${cs.questions.length} questions (expected 10 to 13)`);
    if (cs.totalMarks < 50 || cs.totalMarks > 70) warnings.push(`${file}: ${cs.totalMarks} marks (expected about 60)`);
    const areas = new Set(cs.questions.flatMap((q) => q.kk.map(areaOf)));
    for (const area of AREA_IDS) if (!areas.has(area)) errors.push(`${file}: no question touches ${area}`);
  }

  return {
    errors,
    floorErrors,
    warnings,
    counts,
    totals: { cards: cards.length, mcq: mcqs.length, short: shorts.length, caseStudies: caseStudies.length, terms: terms.length },
  };
}
