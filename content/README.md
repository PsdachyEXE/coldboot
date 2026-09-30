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
