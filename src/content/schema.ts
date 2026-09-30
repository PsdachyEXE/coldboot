/**
 * Content contract. Every JSON file under content/ must parse against these schemas;
 * `npm run content:check` and src/content/content.test.ts enforce it.
 *
 * Text fields use a small Markdown subset: **bold**, *italics*, `inline code`, lists, tables
 * and fenced ```pseudo blocks for pseudocode. Raw HTML is never allowed.
 */
import { z } from '../lib/zodConfig';

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

export const AREA_IDS = ['U3O1', 'U3O2', 'U4O1', 'U4O2'] as const;
export const AreaIdSchema = z.enum(AREA_IDS);
export type AreaId = z.infer<typeof AreaIdSchema>;

export const GROUP_IDS = ['TERMS', 'PSM'] as const;
export type GroupId = (typeof GROUP_IDS)[number];

/** A key knowledge point (`U3O1-KK04`) or one of the cross-cutting groups. */
export type KkId = `U${3 | 4}O${1 | 2}-KK${string}` | GroupId;

export const KK_PATTERN = /^U[34]O[12]-KK\d{2}$/;

export function isKkId(value: unknown): value is KkId {
  return typeof value === 'string' && (KK_PATTERN.test(value) || value === 'TERMS' || value === 'PSM');
}

export const KkIdSchema = z.custom<KkId>(isKkId, { message: 'Expected a KK id such as U3O1-KK04, or TERMS or PSM' });

/** The area a KK belongs to, or the group id itself for TERMS and PSM. */
export function areaOf(kk: KkId): AreaId | GroupId {
  return kk === 'TERMS' || kk === 'PSM' ? kk : (kk.slice(0, 4) as AreaId);
}

/** Item ids: lowercase letters, digits and hyphens, e.g. `c-u3o1-kk04-003`. */
export const ItemIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{1,79}$/, 'Item ids use lowercase letters, digits and hyphens (2 to 80 chars)');

/**
 * Where an item's claim can be defended from.
 * - study-design: the key knowledge or glossary of the 2025 study design
 * - exam-convention: a convention visible in VCAA exams or sample questions
 * - textbook: mainstream textbook meaning of a term the study design names
 */
export const SourceSchema = z.enum(['study-design', 'exam-convention', 'textbook']);
export type Source = z.infer<typeof SourceSchema>;

export const DifficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type ItemDifficulty = z.infer<typeof DifficultySchema>;

const Text = z.string().trim().min(1);

// ---------------------------------------------------------------------------
// Figures (rendered by src/figures from explicit coordinates; no auto-layout)
// ---------------------------------------------------------------------------

const Coord = z.number().finite();
const PointSchema = z.object({ x: Coord, y: Coord }).strict();
export type Point = z.infer<typeof PointSchema>;

function uniqueIds(ids: readonly string[], ctx: z.RefinementCtx, path: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) ctx.addIssue({ code: 'custom', message: `Duplicate id ${id}`, path: [path] });
    seen.add(id);
  }
}

function flowEndpoints(flows: readonly { from: string; to: string }[], known: ReadonlySet<string>, ctx: z.RefinementCtx): void {
  flows.forEach((f, i) => {
    if (!known.has(f.from) || !known.has(f.to)) {
      ctx.addIssue({ code: 'custom', message: `Flow ${f.from} to ${f.to} names an unknown node`, path: ['flows', i] });
    }
  });
}

/** True when dependsOn links contain a cycle (Kahn's algorithm). Unknown ids are ignored. */
export function hasCycle(tasks: readonly { id: string; dependsOn: readonly string[] }[]): boolean {
  const ids = new Set(tasks.map((t) => t.id));
  const indegree = new Map(tasks.map((t) => [t.id, t.dependsOn.filter((d) => ids.has(d)).length]));
  const queue = tasks.filter((t) => indegree.get(t.id) === 0).map((t) => t.id);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift()!;
    visited++;
    for (const t of tasks) {
      if (t.dependsOn.includes(id)) {
        const n = indegree.get(t.id)! - 1;
        indegree.set(t.id, n);
        if (n === 0) queue.push(t.id);
      }
    }
  }
  return visited !== tasks.length;
}

const FigureBase = {
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: Text.optional(),
  caption: Text.optional(),
};

const Canvas = {
  width: z.number().positive().max(2000),
  height: z.number().positive().max(2000),
};

/** A labelled arrow between two node ids. `via` bends the line; `labelAt` pins the label. */
export const FlowSchema = z
  .object({
    id: z.string().optional(),
    from: z.string(),
    to: z.string(),
    /** Flow labels use snake_case in VCAA DFDs. May be empty only in figures that teach the error. */
    label: z.string(),
    via: z.array(PointSchema).optional(),
    labelAt: PointSchema.optional(),
  })
  .strict();
export type Flow = z.infer<typeof FlowSchema>;

const BoxNode = z
  .object({ id: z.string(), label: Text, x: Coord, y: Coord, w: z.number().positive().optional(), h: z.number().positive().optional() })
  .strict();

export const ContextDiagramSchema = z
  .object({
    ...FigureBase,
    kind: z.literal('context'),
    ...Canvas,
    /** The system is a single process. Flows refer to it by the id "system". */
    system: z.object({ label: Text, x: Coord, y: Coord, r: z.number().positive().optional() }).strict(),
    entities: z.array(BoxNode).min(1),
    flows: z.array(FlowSchema).min(1),
  })
  .strict()
  .superRefine((fig, ctx) => {
    const ids = fig.entities.map((e) => e.id);
    uniqueIds(ids, ctx, 'entities');
    if (ids.includes('system')) ctx.addIssue({ code: 'custom', message: 'The id "system" is reserved for the system process', path: ['entities'] });
    flowEndpoints(fig.flows, new Set([...ids, 'system']), ctx);
  });

export const DfdNodeSchema = z
  .object({
    id: z.string(),
    type: z.enum(['entity', 'process', 'store']),
    label: Text,
    /** Process number (e.g. "1", "2.1") or data store id (e.g. "D1"). */
    number: z.string().optional(),
    x: Coord,
    y: Coord,
    w: z.number().positive().optional(),
    h: z.number().positive().optional(),
  })
  .strict();
export type DfdNode = z.infer<typeof DfdNodeSchema>;

export const DfdSchema = z
  .object({
    ...FigureBase,
    kind: z.literal('dfd'),
    ...Canvas,
    level: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    nodes: z.array(DfdNodeSchema).min(1),
    flows: z.array(FlowSchema),
  })
  .strict()
  .superRefine((fig, ctx) => {
    const ids = fig.nodes.map((n) => n.id);
    uniqueIds(ids, ctx, 'nodes');
    flowEndpoints(fig.flows, new Set(ids), ctx);
  });

export const UseCaseDiagramSchema = z
  .object({
    ...FigureBase,
    kind: z.literal('usecase'),
    ...Canvas,
    system: z.object({ label: Text, x: Coord, y: Coord, w: z.number().positive(), h: z.number().positive() }).strict(),
    actors: z.array(z.object({ id: z.string(), label: Text, x: Coord, y: Coord }).strict()).min(1),
    useCases: z
      .array(z.object({ id: z.string(), label: Text, x: Coord, y: Coord, rx: z.number().positive().optional(), ry: z.number().positive().optional() }).strict())
      .min(1),
    /**
     * association: actor to use case. includes/extends: use case to use case, drawn dashed with
     * <<includes>> or <<extends>>. An association between two actors is a convention error; it
     * validates only so a figure can teach that error (the usecase game), as unlabelled DFD flows do.
     */
    links: z
      .array(
        z
          .object({
            from: z.string(),
            to: z.string(),
            type: z.enum(['association', 'includes', 'extends']),
            via: z.array(PointSchema).optional(),
            labelAt: PointSchema.optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((fig, ctx) => {
    const actors = new Set(fig.actors.map((a) => a.id));
    const cases = new Set(fig.useCases.map((u) => u.id));
    uniqueIds([...fig.actors.map((a) => a.id), ...fig.useCases.map((u) => u.id)], ctx, 'useCases');
    fig.links.forEach((l, i) => {
      const known = (id: string) => actors.has(id) || cases.has(id);
      if (!known(l.from) || !known(l.to)) {
        ctx.addIssue({ code: 'custom', message: `Link ${l.from} to ${l.to} names an unknown actor or use case`, path: ['links', i] });
        return;
      }
      if (l.type === 'association' && !actors.has(l.from) && !actors.has(l.to)) {
        ctx.addIssue({ code: 'custom', message: 'An association joins an actor to a use case', path: ['links', i] });
      }
      if (l.type !== 'association' && !(cases.has(l.from) && cases.has(l.to))) {
        ctx.addIssue({ code: 'custom', message: `<<${l.type}>> joins two use cases`, path: ['links', i] });
      }
    });
  });

export const GanttTaskSchema = z
  .object({
    id: z.string(),
    name: Text,
    duration: z.number().int().min(0).max(365),
    dependsOn: z.array(z.string()),
    /** Earliest start in units from project start. Computed from dependencies when absent. */
    start: z.number().int().min(0).optional(),
    milestone: z.boolean().optional(),
  })
  .strict();
export type GanttTask = z.infer<typeof GanttTaskSchema>;

export const GanttSchema = z
  .object({
    ...FigureBase,
    kind: z.literal('gantt'),
    unit: z.enum(['day', 'week']),
    tasks: z.array(GanttTaskSchema).min(1),
    showCriticalPath: z.boolean().optional(),
  })
  .strict()
  .superRefine((fig, ctx) => {
    const ids = fig.tasks.map((t) => t.id);
    uniqueIds(ids, ctx, 'tasks');
    const known = new Set(ids);
    fig.tasks.forEach((t, i) => {
      for (const dep of t.dependsOn) {
        if (!known.has(dep) || dep === t.id) ctx.addIssue({ code: 'custom', message: `Task ${t.id} depends on unknown or self task ${dep}`, path: ['tasks', i, 'dependsOn'] });
      }
    });
    if (hasCycle(fig.tasks)) ctx.addIssue({ code: 'custom', message: 'Task dependencies form a cycle', path: ['tasks'] });
  });

export const ObjectDescriptionSchema = z
  .object({
    ...FigureBase,
    kind: z.literal('object'),
    name: Text,
    properties: z.array(z.object({ name: Text, type: Text, description: Text.optional() }).strict()),
    methods: z.array(z.object({ name: Text, description: Text.optional() }).strict()),
  })
  .strict();

export const PseudocodeFigureSchema = z
  .object({
    ...FigureBase,
    kind: z.literal('pseudocode'),
    code: Text,
    /** Stated whenever the code indexes an array. */
    indexBase: z.union([z.literal(0), z.literal(1)]).optional(),
  })
  .strict();

export const TableFigureSchema = z
  .object({
    ...FigureBase,
    kind: z.literal('table'),
    columns: z.array(Text).min(1),
    rows: z.array(z.array(z.string())),
  })
  .strict()
  .superRefine((t, ctx) => {
    t.rows.forEach((row, i) => {
      if (row.length !== t.columns.length) {
        ctx.addIssue({ code: 'custom', message: `Row ${i} has ${row.length} cells, expected ${t.columns.length}`, path: ['rows', i] });
      }
    });
  });

export const MOCKUP_ELEMENTS = ['window', 'heading', 'label', 'textbox', 'button', 'checkbox', 'radio', 'dropdown', 'list', 'image', 'divider'] as const;

export const MockupSchema = z
  .object({
    ...FigureBase,
    kind: z.literal('mockup'),
    ...Canvas,
    elements: z
      .array(
        z
          .object({
            type: z.enum(MOCKUP_ELEMENTS),
            x: Coord,
            y: Coord,
            w: z.number().positive(),
            h: z.number().positive(),
            text: z.string().optional(),
            /** An annotation callout shown beside the element. */
            note: z.string().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const FigureSchema = z.discriminatedUnion('kind', [
  ContextDiagramSchema,
  DfdSchema,
  UseCaseDiagramSchema,
  GanttSchema,
  ObjectDescriptionSchema,
  PseudocodeFigureSchema,
  TableFigureSchema,
  MockupSchema,
]);
export type Figure = z.infer<typeof FigureSchema>;
export type FigureKind = Figure['kind'];
export type ContextDiagram = z.infer<typeof ContextDiagramSchema>;
export type Dfd = z.infer<typeof DfdSchema>;
export type UseCaseDiagram = z.infer<typeof UseCaseDiagramSchema>;
export type Gantt = z.infer<typeof GanttSchema>;
export type ObjectDescription = z.infer<typeof ObjectDescriptionSchema>;
export type PseudocodeFigure = z.infer<typeof PseudocodeFigureSchema>;
export type TableFigure = z.infer<typeof TableFigureSchema>;
export type Mockup = z.infer<typeof MockupSchema>;

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export const CARD_TYPES = ['basic', 'reverse', 'cloze', 'compare'] as const;

/** Cloze gaps are written `{{hidden text}}` inside `front`. */
export const CLOZE_GAP = /\{\{([^{}]+)\}\}/g;

export const CardSchema = z
  .object({
    id: ItemIdSchema,
    kk: z.array(KkIdSchema).min(1),
    type: z.enum(CARD_TYPES),
    /** basic: question; reverse: the term; cloze: sentence with {{gaps}}; compare: "A versus B" prompt. */
    front: Text,
    /** basic: answer; reverse: the definition; cloze: explanation shown after the reveal; compare: the contrast. */
    back: Text,
    /** The misconception students commonly hold, shown after the flip. */
    mistake: Text.optional(),
    difficulty: DifficultySchema,
    source: SourceSchema,
    /** Accepted alternative spellings of `front` for reverse (glossary) cards; used by `blitz`. */
    aliases: z.array(Text).optional(),
  })
  .strict()
  .superRefine((card, ctx) => {
    if (card.type === 'cloze' && !card.front.match(CLOZE_GAP)) {
      ctx.addIssue({ code: 'custom', message: 'Cloze cards need at least one {{gap}} in front', path: ['front'] });
    }
    if (card.type !== 'cloze' && card.front.match(CLOZE_GAP)) {
      ctx.addIssue({ code: 'custom', message: 'Only cloze cards may contain {{gaps}}', path: ['front'] });
    }
    if (card.aliases && card.type !== 'reverse') {
      ctx.addIssue({ code: 'custom', message: 'aliases only apply to reverse cards', path: ['aliases'] });
    }
  });
export type Card = z.infer<typeof CardSchema>;

const BANNED_OPTIONS = /\b(all|none|both|neither) of the (above|options|answers)\b/i;

export const McqSchema = z
  .object({
    id: ItemIdSchema,
    kk: z.array(KkIdSchema).min(1),
    stem: Text,
    options: z.tuple([Text, Text, Text, Text]),
    answer: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    explanation: Text,
    /** One line per option on why it is wrong; the entry at `answer` is ''. */
    whyWrong: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    difficulty: DifficultySchema,
    source: SourceSchema,
    /** Figures shown above the stem (e.g. a DFD with one convention error, a Gantt chart). */
    figures: z.array(FigureSchema).min(1).max(2).optional(),
  })
  .strict()
  .superRefine((mcq, ctx) => {
    mcq.whyWrong.forEach((why, i) => {
      if (i === mcq.answer && why !== '') {
        ctx.addIssue({ code: 'custom', message: 'whyWrong at the answer index must be empty', path: ['whyWrong', i] });
      }
      if (i !== mcq.answer && why.trim() === '') {
        ctx.addIssue({ code: 'custom', message: 'Every distractor needs a whyWrong line', path: ['whyWrong', i] });
      }
    });
    const normalised = mcq.options.map((o) => o.trim().toLowerCase());
    if (new Set(normalised).size !== 4) {
      ctx.addIssue({ code: 'custom', message: 'Options must be distinct', path: ['options'] });
    }
    mcq.options.forEach((o, i) => {
      if (BANNED_OPTIONS.test(o)) {
        ctx.addIssue({ code: 'custom', message: 'No "all/none of the above" options', path: ['options', i] });
      }
    });
  });
export type Mcq = z.infer<typeof McqSchema>;

export const MarkingPointSchema = z
  .object({
    text: Text,
    marks: z.number().int().min(1).max(6),
  })
  .strict();
export type MarkingPoint = z.infer<typeof MarkingPointSchema>;

export const ShortAnswerSchema = z
  .object({
    id: ItemIdSchema,
    kk: z.array(KkIdSchema).min(1),
    /** Lowercase VCAA command term, e.g. "describe". See src/content/commandTerms.ts. */
    commandTerm: z.string().regex(/^[a-z]+( [a-z]+)?$/),
    marks: z.number().int().min(1).max(12),
    prompt: Text,
    /** Discrete, checkable marking points. Their marks may exceed `marks` when alternatives are accepted. */
    points: z.array(MarkingPointSchema).min(1),
    model: Text,
    mistake: Text.optional(),
    source: SourceSchema,
    /** Figures shown above the prompt. */
    figures: z.array(FigureSchema).min(1).max(2).optional(),
  })
  .strict()
  .superRefine((sa, ctx) => {
    const available = sa.points.reduce((sum, p) => sum + p.marks, 0);
    if (available < sa.marks) {
      ctx.addIssue({ code: 'custom', message: `Marking points total ${available}, below the ${sa.marks} marks available`, path: ['points'] });
    }
  });
export type ShortAnswer = z.infer<typeof ShortAnswerSchema>;

export type ContentItem = Card | Mcq | ShortAnswer;
export type ItemKind = 'card' | 'mcq' | 'short';

export function isMcq(item: Mcq | ShortAnswer | Card): item is Mcq {
  return 'options' in item;
}
export function isShortAnswer(item: Mcq | ShortAnswer | Card): item is ShortAnswer {
  return 'points' in item;
}
export function isCard(item: Mcq | ShortAnswer | Card): item is Card {
  return 'front' in item;
}

// ---------------------------------------------------------------------------
// Case studies
// ---------------------------------------------------------------------------

const FigureRefs = { figureRefs: z.array(z.string()).optional() };

export const CaseMcqSchema = McqSchema.safeExtend(FigureRefs);
export const CaseShortSchema = ShortAnswerSchema.safeExtend(FigureRefs);
export type CaseMcq = z.infer<typeof CaseMcqSchema>;
export type CaseShort = z.infer<typeof CaseShortSchema>;
export type CaseQuestion = CaseMcq | CaseShort;

export const CaseStudySchema = z
  .object({
    id: z.string().regex(/^cs-\d{2}$/),
    title: Text,
    /** The detachable insert: organisation, team, current situation, project. Markdown. */
    insert: Text,
    figures: z.array(FigureSchema).min(1),
    questions: z.array(z.union([CaseMcqSchema, CaseShortSchema])).min(1),
    totalMarks: z.number().int().positive(),
  })
  .strict()
  .superRefine((cs, ctx) => {
    const marks = cs.questions.reduce((sum, q) => sum + ('options' in q ? 1 : q.marks), 0);
    if (marks !== cs.totalMarks) {
      ctx.addIssue({ code: 'custom', message: `Questions total ${marks} marks but totalMarks is ${cs.totalMarks}`, path: ['totalMarks'] });
    }
    uniqueIds(cs.figures.map((f) => f.id), ctx, 'figures');
    const figureIds = new Set(cs.figures.map((f) => f.id));
    cs.questions.forEach((q, i) => {
      for (const ref of q.figureRefs ?? []) {
        if (!figureIds.has(ref)) {
          ctx.addIssue({ code: 'custom', message: `Unknown figure ${ref}`, path: ['questions', i, 'figureRefs'] });
        }
      }
    });
  });
export type CaseStudy = z.infer<typeof CaseStudySchema>;

// ---------------------------------------------------------------------------
// Study design map, glossary and PSM
// ---------------------------------------------------------------------------

export const KkEntrySchema = z
  .object({
    id: z.string().regex(KK_PATTERN),
    area: AreaIdSchema,
    /** Short title in our own words (a label, not a quotation). */
    title: Text,
    /** One or two sentences, paraphrased. */
    summary: Text,
    examples: z.array(Text),
    /** confirmed: checked against the study design text. provisional: from the build brief's reconstruction. */
    status: z.enum(['confirmed', 'provisional']),
    /** What still needs confirming, for provisional entries that the brief marked "verify". */
    verify: Text.optional(),
    /**
     * Set when items for this KK are held back until the source confirms it. Floor shortfalls then
     * become warnings, and docs/CONTENT_NOTES.md must say why.
     */
    held: Text.optional(),
  })
  .strict();
export type KkEntry = z.infer<typeof KkEntrySchema>;

export const GlossaryEntrySchema = z
  .object({
    term: Text,
    /** Other accepted spellings or forms. */
    aliases: z.array(Text).optional(),
    status: z.enum(['confirmed', 'provisional']),
  })
  .strict();
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;

export const AreaEntrySchema = z
  .object({
    id: AreaIdSchema,
    unit: z.union([z.literal(3), z.literal(4)]),
    outcome: z.union([z.literal(1), z.literal(2)]),
    title: Text,
    assessment: Text,
    summary: Text,
  })
  .strict();
export type AreaEntry = z.infer<typeof AreaEntrySchema>;

export const KkRenameSchema = z.object({ from: z.string().regex(KK_PATTERN), to: z.string().regex(KK_PATTERN), since: z.number().int().min(2) }).strict();
export type KkRename = z.infer<typeof KkRenameSchema>;

/**
 * Maps a KK id recorded under map version `from` to map version `to`. Each version's renames apply
 * at once, as one map, so a shift (KK03 to KK04 and KK04 to KK05) or a swap works whatever order it
 * is listed in; versions apply in ascending order.
 */
export function kkRenamer(renames: readonly KkRename[], from: number, to: number): <T extends string>(kk: T) => T {
  const byVersion = new Map<number, Map<string, string>>();
  for (const r of renames) {
    if (r.since <= from || r.since > to) continue;
    const map = byVersion.get(r.since) ?? new Map<string, string>();
    if (!map.has(r.from)) map.set(r.from, r.to);
    byVersion.set(r.since, map);
  }
  const maps = [...byVersion].sort(([a], [b]) => a - b).map(([, map]) => map);
  return <T extends string>(kk: T): T => maps.reduce<string>((id, map) => map.get(id) ?? id, kk) as T;
}

export const StudyDesignSchema = z
  .object({
    title: Text,
    accredited: Text,
    areas: z.array(AreaEntrySchema).length(4),
    groups: z.array(z.object({ id: z.enum(GROUP_IDS), title: Text, summary: Text }).strict()).length(2),
    kks: z.array(KkEntrySchema).min(1),
    /**
     * Bumped whenever KK ids are renumbered; stored attempts and exam history migrate through
     * `renames`. A bump also bumps the attempts and exam store versions (docs/CONTRACTS.md).
     */
    kkMapVersion: z.number().int().min(1),
    /**
     * KK id changes. `since` is the map version that made the change; all the renames of one
     * version apply at once (see kkRenamer), and versions apply in order.
     */
    renames: z.array(KkRenameSchema),
    /** The glossary ("Terms used in this study"): one TERMS card per entry. Terms are labels, not quotations. */
    glossary: z.array(GlossaryEntrySchema),
  })
  .strict()
  .superRefine((sd, ctx) => {
    const ids = new Set<string>();
    sd.kks.forEach((kk, i) => {
      if (ids.has(kk.id)) ctx.addIssue({ code: 'custom', message: `Duplicate KK ${kk.id}`, path: ['kks', i] });
      ids.add(kk.id);
      if (!kk.id.startsWith(kk.area)) ctx.addIssue({ code: 'custom', message: `${kk.id} is not in area ${kk.area}`, path: ['kks', i] });
    });
    const renamed = new Map<number, Set<string>>();
    sd.renames.forEach((r, i) => {
      if (r.since > sd.kkMapVersion) {
        ctx.addIssue({ code: 'custom', message: `Rename ${r.from} to ${r.to} is for version ${r.since}, after kkMapVersion ${sd.kkMapVersion}`, path: ['renames', i] });
      }
      const froms = renamed.get(r.since) ?? new Set<string>();
      if (froms.has(r.from)) ctx.addIssue({ code: 'custom', message: `${r.from} is renamed twice in version ${r.since}`, path: ['renames', i] });
      froms.add(r.from);
      renamed.set(r.since, froms);
    });
    // Every id a rename starts from must end up, through any later versions, on the current map.
    sd.renames.forEach((r, i) => {
      if (r.since > sd.kkMapVersion) return;
      const end = kkRenamer(sd.renames, r.since - 1, sd.kkMapVersion)(r.from);
      if (!ids.has(end)) ctx.addIssue({ code: 'custom', message: `${r.from} (map ${r.since - 1}) becomes ${end}, which is not in the KK map`, path: ['renames', i] });
    });
  });
export type StudyDesign = z.infer<typeof StudyDesignSchema>;

/** terms.json: one reverse card per glossary entry (front = term, back = paraphrased definition). */
export const TermsFileSchema = z.array(CardSchema).superRefine((cards, ctx) => {
  cards.forEach((c, i) => {
    if (!c.kk.includes('TERMS')) ctx.addIssue({ code: 'custom', message: 'Glossary cards must carry TERMS', path: [i, 'kk'] });
  });
});

export const PSM_STAGE_IDS = ['analysis', 'design', 'development', 'evaluation'] as const;

export const PsmFileSchema = z
  .object({
    stages: z
      .array(
        z
          .object({
            id: z.enum(PSM_STAGE_IDS),
            name: Text,
            summary: Text,
            activities: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), name: Text, summary: Text }).strict()).min(1),
          })
          .strict(),
      )
      .length(4),
    /** Paraphrased notes on the PSM specifications (what each stage's documentation must show). */
    specifications: z.array(Text),
    cards: z.array(CardSchema),
    mcq: z.array(McqSchema),
    short: z.array(ShortAnswerSchema),
  })
  .strict();
export type PsmFile = z.infer<typeof PsmFileSchema>;
export type PsmStageId = (typeof PSM_STAGE_IDS)[number];

/** Per-outcome files: content/<area>/cards.json, mcq.json, short.json (plain arrays). */
export const CardsFileSchema = z.array(CardSchema);
export const McqFileSchema = z.array(McqSchema);
export const ShortFileSchema = z.array(ShortAnswerSchema);

// ---------------------------------------------------------------------------
// Floors (Section 8.2). Generated items never count.
// ---------------------------------------------------------------------------

export const FLOORS = {
  perKk: { cards: 6, mcq: 3, short: 1 },
  psm: { cards: 12, mcq: 6 },
  caseStudies: { P0: 1, P1: 2, P2: 4 },
} as const;
