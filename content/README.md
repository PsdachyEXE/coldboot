# Content authoring guide

COLDBOOT's study content: flashcards, Section A multiple-choice questions, Section B short answers, the glossary, the problem-solving methodology (PSM) and Section C case studies. Each item is tagged to key knowledge (KK) points in `study-design.json`. The schemas are in `src/content/schema.ts`. `npm run content:check` enforces every rule it can.

## The standard

Every item goes to a stressed Year 12 student a few weeks before the exam, so a wrong card teaches a wrong answer. If an item can't be defended from the study design or the mainstream textbook meaning of a term the study design names, leave it out and log the exclusion in `docs/CONTENT_NOTES.md`.

- **Scope is the study design.** Teach its key knowledge, its glossary and the PSM, and nothing else. Development models (agile, waterfall, spiral) are out.
- **Paraphrase everything.** The repository is public. Never copy study design text, VCAA exam questions or examiners' report passages. Write original items in the VCAA style. KK titles, Act names and command terms are fine as labels.
- **Sources.** Set `source` to `textbook` for the mainstream meaning of a term the study design names (most items), to `exam-convention` for exam conventions (pseudocode style, test table columns, DFD notation, command terms), and to `study-design` only when the item states what the study design itself lists. While the study design can't be checked (DECISIONS D-001), avoid items whose answer depends on the exact wording or completeness of a list the study design gives ("Which of these is *not* one of the study design's ..."). An item about what a technique *is*, or when it suits, doesn't depend on that.
- **Australian spelling** (organisation, behaviour, colour, licence as a noun, analyse, prioritise) and "program" for software.
- **Invented organisations and people only.** Use realistic Australian settings (a Geelong freight company, a Bendigo health clinic) and never a real business or person.

## Item types

**Cards** (`cards.json`): `basic` (question and answer), `reverse` (term and definition; also asked definition to term), `cloze` (`front` holds a sentence with `{{gaps}}`; `back` adds a short explanation), and `compare` (`front` says "A versus B"; `back` gives the contrast, often as a small table). Keep backs short: one idea, and at most about 60 words. Add `mistake` when students commonly get this wrong, written as the misconception and its correction ("Validation doesn't check that data is *correct*, only that it is *reasonable*").

**MCQs** (`mcq.json`), Section A style:
- One clearly best answer and four options of similar length and grammar.
- Plausible distractors that are real terms from the course, applied wrongly.
- Never "all of the above" or "none of the above".
- `explanation` says why the answer is right; each `whyWrong` entry says in one line why that option is wrong (`""` at the answer index).
- Vary the answer position across a KK's set.

**Short answers** (`short.json`), Section B style:
- `commandTerm` is lowercase: state, identify, describe, explain, justify, classify, complete, recommend, outline, compare, and others listed in `src/content/commandTerms.ts`.
- `marks` is 1 to 6 (occasionally more).
- `points` are discrete, checkable marking points, each worth whole marks. Together they must reach `marks`, and may exceed it when alternatives are accepted.
- `model` is a full-mark answer that applies to the scenario when there is one.
- Scenarios make short answers exam-like: "Kiri is building a booking program for a Ballarat physio clinic..."

**Figures.** MCQs and short answers may include up to two `figures` (context diagram, DFD, use case diagram, Gantt chart, object description, pseudocode, table, mock-up), laid out with explicit coordinates. Figures are checked for dangling ids and dependency cycles.

## Markdown subset

Text fields accept **bold**, *italics*, `inline code`, lists, tables (alignment via `:--`), and fenced pseudocode:

````
```pseudo
BEGIN
    total ← 0
    FOR i ← 0 TO 4
        total ← total + scores[i]
    ENDFOR
    DISPLAY total
END
```
````

Pseudocode follows `docs/PSEUDOCODE.md`. Always state the array index base. No raw HTML: it is escaped, and the checker rejects it. Use-case labels such as `<<includes>>` are fine.

## Ids and files

| Kind | File | Id pattern |
|---|---|---|
| Card | `content/<area>/cards.json` | `c-u3o1-kk04-001` |
| MCQ | `content/<area>/mcq.json` | `m-u3o1-kk04-001` |
| Short answer | `content/<area>/short.json` | `s-u3o1-kk04-001` |
| Glossary card | `content/terms.json` | `t-<term-slug>` |
| PSM items | `content/psm.json` | `psm-c-001`, `psm-m-001`, `psm-s-001` |
| Case study | `content/case-studies/cs-01.json` | questions `cs-01-q01` |

The KK part of an id is the item's primary KK (`kk[0]`), and the item lives in that KK's area folder. Ids are permanent once shipped: a dropped id is never reused.

## Floors

Every KK needs at least 6 cards, 3 MCQs and 1 short answer. `TERMS` needs one card per glossary entry. `PSM` needs at least 12 cards and 6 MCQs. Each case study runs to about 60 marks over 10 to 13 questions and touches all four areas of study. Generated game items don't count toward floors.

## Figure coordinates

Figures have no auto-layout. Coordinates are in SVG user units on a canvas of `width` by `height` (about 640 by 400 suits most; keep 24 units of margin). Every `x, y` is the **centre** of its element. When `w`, `h`, `r`, `rx` or `ry` are omitted, the renderer uses these defaults:

| Element | Shape | Default size |
|---|---|---|
| Context diagram system | circle, the system's name inside | `r` 64 |
| External entity (context diagram and DFD) | rectangle, name inside | `w` 128, `h` 48 |
| DFD process | circle, its name inside and nothing else | `r` 48 (from `w`/2 when given) |
| DFD data store | two horizontal parallel lines, open at both ends, the name between them | `w` 160 (the length of the lines), `h` 36 (the gap between them) |
| Use case | ellipse | `rx` 84, `ry` 28 |
| Actor | stick figure about 64 tall, label below | fixed |
| Use case system boundary | rectangle, name at top-left | `w`, `h` required |

Flows are straight one-way arrows, each with a single arrowhead, from the edge of one element to the edge of the other. `via` points add bends, and `labelAt` pins the label (by default it sits at the midpoint). Leave at least 40 units between elements so labels fit, and keep labels short: DFD and context diagram flow labels are snake_case (`booking_details`). Gantt figures need no coordinates: give tasks, durations and dependencies, and the renderer computes start times and the critical path.

Renderer behaviour worth knowing when you lay out a figure:

- DFD nodes carry no `number`. As in VCAA's diagrams, processes and data stores are known by name alone: the renderer never draws a process number or a store id (D1, D2), and the text description never mentions one. The schema has no `number` field and rejects one, and questions refer to processes and stores by name ("the process *Take payment*", "the *Bookings* data store"), never "process 2" or "D1".
- A data store's name sits on one line between its two lines, which run the full `w`. Widen `w` for a long name rather than letting it wrap. Flows meet the store at the edge of its `w` by `h` box, so a flow from the side would point into an open end. Place a store above or below the processes it connects to, so its flows meet one of its lines as they do in VCAA's diagrams (`dfdFixture` in `src/figures/fixtures.ts` shows the layout).
- A two-way exchange is two flows, never one double-headed arrow. Two straight flows between the same pair of elements (a request and its reply) are spread apart automatically, with their labels on the outer sides. You don't need `via` points for them.
- An external entity is drawn once. The renderer has no duplicated-entity mark (the diagonal across a top-left corner), so lay a figure out with each entity in one place.
- A label on a line too short to hold it moves beside the line, and every label is kept on the canvas. `labelAt` always wins.
- Gantt task ids appear in the chart and in its "Depends on" column, so use short ids (`A`, `B`, `C`). A milestone is a point in time, not a task with a duration: write it as a task with duration 0, or set `milestone: true` on a task to put a milestone diamond at its finish. Plans longer than about 30 days read better in weeks.
- Mock-up `list` items are separated by newlines in `text`.
- Questions can mark elements on a figure (the renderer's `highlight`): use context diagram entity ids or `system`, DFD node ids, flow ids on either (a flow's `id`, or `from->to` when it has none), use case actor and use case ids, and Gantt task ids.
