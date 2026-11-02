# Learn mode: plan

A place in COLDBOOT that teaches a key knowledge point before the app tests it. Written 1 November 2026, twelve days before the exam, after the 1.1.0 deploy, as the plan to build it, with its phases, estimates and cut lines; the status below records what was built.

## Status

All three phases have shipped. Phases A and B came in 1.2.0 (D-215 to D-217). Phase C came in 1.3.0 (D-220): every one of the 52 key knowledge points has an authored lesson, written from the sources and checked against them. The Terms and PSM pages stay assembled from their checked content. What was built differs from the plan below in these places:

- A notes page has no single "The ideas" section. Its flashcards read as three sections, Definitions, Comparisons and Key points. On a lesson page "The ideas" is the lesson itself, and the flashcards and their common mistakes fold into a disclosure under it, because the mistakes repeated the examiners' traps.
- The examiners' traps are headed "What the examiners saw". Notes pages keep the cards' "Common mistakes".
- The worked example shows the model answer before the marking points ("How it is marked").
- All four areas' lessons load together, as their own chunks, the first time a Learn page needs them, rather than one area at a time. The page waits for them rather than showing the notes and swapping.
- The index marks a point with a lesson by a "Lesson" tag once the lessons have loaded; the build's content summary doesn't record them.
- Lessons carry no figures yet. Writers used tables and pseudocode instead, and the schema allows up to two figures a section for later.
- The Terms page groups each term under the area of the first key knowledge point it is tagged with. Terms tagged with no point go last, under "Not tied to one key knowledge point".
- The index shows mastery and read state as text, not a meter, and its areas don't fold on phones.
- A multiple-choice answer's feedback doesn't link to Learn, because the Drill screen doesn't keep its place. The drill's results table links each point with a wrong answer instead (D-217).
- In the run, "Skip to the drill" sits above the page and "Start the drill" at its end. Skipping doesn't record a read.
- The read store keeps one time per topic, at most 54 entries, so it is never pruned. Importing a file without it clears it.
- The copied-text scan runs in `scripts/lesson-check.ts`, not in `content:check`, because it needs the gitignored sources.

## What the app has today

Every surface tests first and explains afterwards. Review asks for the answer and shows the back of the card; Drill asks a question and then shows why each option is right or wrong; Written and Exam ask for an answer and show the marking points; the terminal games ask and then explain. The syllabus map shows each key knowledge point's title and a one-paragraph summary, and `man <game>` explains how a game works and the convention it drills. That is the whole of the teaching, and none of it comes before the question.

Three pieces of teaching material already exist and reach no student. The study design map (`content/study-design.json`) holds 140 examples, two or three per key knowledge point, written in our words and checked against the study design in October; no screen renders them. The 42 official Terms carry source-checked definitions, but a student only meets them one at a time, as flashcards or in `blitz`. And `docs/EXAM_INSIGHTS.md`, 1,800 words on where marks were won and lost in 2025, lives in the repository and nowhere in the app; its substance reaches students only as the 495 `mistake` notes scattered across items.

So the answer to "is there a place to teach" is no. There is a lot of checked teaching material and no door to it.

## What Learn is

Learn is a reading screen, one page per key knowledge point, plus one for the Terms and one for the problem-solving methodology. A page says what the study design asks, explains each idea the key knowledge lists with a concrete example, names the official terms that apply, lists the traps the 2025 examiners saw, and ends with the ways to practise it. Reading is never scored and never counts towards mastery, because reading is not evidence of knowing. The page records that it was read, so the map and Today's run can tell a point that has been studied from one that has only been tested.

Learn stays inside the study design's scope, as everything else does. It teaches the key knowledge, the Terms and the PSM and nothing else, and every sentence in an authored lesson is checked against the sources the same way items are. Where no authored lesson exists yet, the page assembles study notes from material that has already been checked, and says so.

## The page

The route is `/learn`, with `/learn?kk=U3O1-KK04` for a lesson and `/learn?kk=TERMS` or `/learn?kk=PSM` for the two groups. `/learn` on its own is an index: the four areas, each key knowledge point with its title, whether it has a full lesson or notes, its mastery meter and when it was last read. Below 720 px the areas fold behind disclosure buttons the way the map does.

A lesson page reads top to bottom:

1. The heading: the key knowledge id as a tag, the title, the area. Under it, "In the study design", the one-paragraph summary from the map, and a line of state: mastery (or unseen) and when the page was last read.
2. "The ideas". In an authored lesson, three to six short sections, each a heading and a few paragraphs, with up to two figures (a DFD, a use case diagram, a pseudocode listing, an object description, a Gantt chart) drawn by the existing figure renderers. In notes mode, the study design's examples for the point, then the point's flashcards rendered as text to read, definitions first, then comparisons, then the rest. Multiple-choice explanations and short-answer models are never shown here, because they would spoil the questions they belong to.
3. "Terms used in this study": the official terms whose cards are tagged with this key knowledge point, each with its definition. These are examinable in their own right and the exam uses their wording.
4. "Exam traps": in an authored lesson, one to four paraphrased points from the 2025 report; in notes mode, the `mistake` notes from the point's cards, de-duplicated. Short-answer mistake notes are left out of notes mode because some refer to their scenario.
5. A worked example, authored lessons only: a short question in the exam's style with its model answer and marking points shown open, written for the lesson and never served as a test item.
6. "Practise": Drill this point, Review its cards, Written questions on it, and the terminal games tagged with it (the registry lists each game's key knowledge). One primary button; the rest secondary. Reaching this footer, or pressing any button in it, records the page as read.
7. Previous and next key knowledge links.

The Terms page renders the glossary as a readable list grouped by the area its terms support, the Data Analytics terms last under their own heading. The PSM page renders `psm.json` as prose: each stage's summary, its activities, and the specification notes as a list under the stage. Both are assembled, not authored; the content for them already exists and is checked.

The page is an `article` with the title as its `h1` and each section an `h2`. Figures carry their existing text descriptions. The reading column is 72 characters, like every other study column. There is no reading-progress widget and no quiz inside the page.

## Where it is reached from

Learn becomes the ninth destination. On the desktop rail it sits between Home and Review, because a student who has not started a topic should find the door before the drill. On phones it goes behind More, first in the menu; the four tabs stay the daily destinations. Seven items in More is 44 px each plus padding, which fits a 640 px viewport without scrolling.

Other doors, in the order a student meets them:

- The syllabus map's rows gain a "Learn" link beside the title; a row for an unseen point reads "Start here".
- Home's Coverage section names how many points are unseen and links to the first of them in Learn.
- After a wrong answer in Drill, Review or Written, the key knowledge tags under the feedback link to that point's lesson.
- The exam report's per-key-knowledge table links each weak row to its lesson.
- The terminal gains `learn [kk|term]`. With no argument it lists the areas and their points with a read marker. With a key knowledge id it prints the summary, the examples and the traps as blocks, with a link block to the full page. With a term it prints the definition. `man` is unchanged.

## Learn before the test

Today's run gains a conditional step between the review and the drill. When the drill's weakest-point selection lands on a key knowledge point with no mastery record and no read record, the run shows that point's lesson first, headed "Read first", with "Start the drill" as the primary action and "Skip to the drill" as a quiet one. A point that has been read, or tested at all, never triggers the step, so the run only slows down for a topic the student has never met. `StepId` gains `learn`, `outcomes.learn` is optional, and the saved-run schema keeps its version, because adding an enum member and an optional field parses every saved run from 1.1.0.

## Two layers of content

Notes mode needs no new content. A pure function `assembleNotes(kk, content)` builds the page from the content index: the map entry, the point's cards, the terms tagged with it, the card mistake notes and the games. It ships first and is what every point shows until its lesson is authored. The page labels it: "Study notes, assembled from this topic's cards and the study design map".

Authored lessons are a new content kind, `content/<area>/lessons.json`, one lesson per key knowledge point, loaded only when the Learn route needs its area. Where a lesson exists the page shows it in place of the notes' "ideas" section; the terms, the assembled traps (merged with the authored ones) and the practise footer stay the same for both.

| Field | Type | Rule |
|---|---|---|
| `id` | `l-u3o1-kk04` | One per key knowledge point, named for it. |
| `kk` | KK id | Must exist in the map; the file sits in that area's folder. |
| `intro` | Markdown | Two or three sentences: what the point covers and why the exam cares. |
| `sections[]` | `{ heading, body, figures? }` | Three to six. Body is the Markdown subset; figures use the existing figure schemas, at most two a section. |
| `worked?` | `{ prompt, commandTerm, marks, points[], model }` | A short-answer style worked example. Never enters the test pool. |
| `traps?` | Markdown[] | One to four, paraphrased from the 2025 report. |
| `source` | `study-design`, `textbook`, `exam-convention` | As for items. |

The checker gains rules for lessons: id and folder match the point; one lesson per point; figure ids and dependencies valid; body around 700 words at most for the whole lesson; no cloze gaps; pseudocode in the house style. Lessons have no floor. `scripts/content-parts.ts` gains a `lessons` part kind, and `scripts/content-review.ts` finds lessons by id, so the same review-and-apply pipeline serves them. The build's content summary records which points have an authored lesson, so the index can label rows before content loads.

Reading records live in a new persisted store, `coldboot:v1:learn`, holding the last-read time per key knowledge id. It joins the export file as a store, so importing progress carries reading state too, and an older export without it imports unchanged. Nothing in it feeds mastery or attempts.

## Rules the content keeps

The repository is public, so a lesson never copies a sentence from the study design, the outcome-specific requirements, the exam or the report. List items, Act names, official term names and command terms are labels and may be used exactly. The verification pass runs an overlap check against the source digests, as the glossary rebuild did, and rejects any run of eight or more shared words that is not a label.

Accuracy beats volume, as the brief says. An authored lesson is written only against the source digests, never from memory of the subject. Until the digests are back in the container (they were in the gitignored `reference/` folder, which did not survive the container reset), only notes mode ships.

A lesson never shows a bank item's model answer or multiple-choice explanation. Its worked example is its own. The flashcards it shows as text are the ones Review will ask; that is what flashcards are for.

## Phases

| Phase | What ships | Needs the sources | Estimate | Version |
|---|---|---|---|---|
| A | Learn route with notes mode for every point, the Terms and PSM pages, the index, the rail and More entries, map and Home links, the read store and export, the terminal `learn` command, tests, docs | No | About one day of session work | 1.2.0 |
| B | The run's "Read first" step and the lesson links in Drill, Review, Written and the exam report | No | Half a day | with A, or 1.2.1 |
| C | Authored lessons for the 52 key knowledge points, verified against the sources, merged through the parts pipeline | Yes | Half a day to fetch and digest the sources again, one and a half to two days of authoring and verification, half a day to merge, check and deploy | 1.3.0 |

Phase C is agent-heavy, the only phase that is: 26 pairs of key knowledge points, each with an author and an adversarial checker, the same shape as the reconciliation's content passes. Under the session limits seen in October it runs over two to three days of wall time, not two to three hours. It can be run as two workflows rather than four, or point by point by hand if the limits bite again.

The order inside Phase C follows the 2025 report. The ten topics where the most students scored zero come first: threat modelling principles (U4O2-KK05), the Level 1 DFD rules (U3O2-KK08), data types (U3O1-KK04), beta testing strategy (U4O1-KK07), user-centred design and efficiency against effectiveness (U4O1-KK01), UX characteristics (U3O2-KK15), XML as a data source (U3O1-KK06), strategies against controls (U4O2-KK10), the object description's sections (U3O2-KK14 and U3O1-KK03) and inheritance (U3O1-KK07). The remaining points follow in study design order.

The cut line is 9 November. A point whose lesson is not verified by then keeps its notes, and the page says so. Students lose nothing they have today, and a lesson that was not checked never ships.

## Checks and tests

Unit tests: `assembleNotes` for a point with cards, terms and games, for a point with none, and for the two groups; the read store's set, prune and export round trip; the run's conditional step for an unseen, a read and a tested point; the terminal `learn` command's three forms. Component tests: the Learn index at desktop and phone widths; a lesson page in notes mode and with an authored lesson; the practise footer recording a read; the map row's new link. End-to-end: open Learn from the map, read to the footer, start the drill, and see the map row say when it was read; a fresh profile's first run shows "Read first" before the drill and skipping it reaches the drill. The existing checks (typecheck, lint, content, contrast, installer) run unchanged, and the content checker's new lesson rules run inside `content:check`.

## Documents to update when it ships

`docs/DECISIONS.md` gains an entry for Learn mode (the ninth destination, notes before lessons, reading never scored) and one for the run's step. `docs/DESIGN.md` records the ninth destination against Section 9 and adds the Learn page to the layout notes and the read-state line to the map row. `content/README.md` describes the `lessons` kind and its rules. `docs/CONTENT_NOTES.md` lists which points have an authored lesson and which are still notes. `docs/CONTRACTS.md` adds the lesson schema and the `learn` store. The README's "What's in it" gains Learn in one sentence.

## Risks and open decisions

Reading can displace practice, and twelve days out practice is what moves marks. Learn therefore never replaces a run step: the drill still happens, and "Read first" only appears for a point the student has never met. The recommendation is to ship Phases A and B now, because they cost no content and give unseen points a door, and to treat Phase C as worth doing only if it is verified by the cut line.

The ninth destination changes a layout the brief fixed at eight. The alternative, reaching Learn only from the map and Home, keeps the rail as briefed but hides the one screen a lost student is looking for. The recommendation is the rail item.

Notes mode shows flashcard backs as reading. A student who reads them all will meet the same cards in Review having seen the answers, which is how flashcards are meant to work, and the SRS schedule is unaffected because reading records no attempt. No change needed.

Phase C depends on the sources being fetched again from the operator's Drive folder "coldboot", which still holds the eight files. The extraction tools (python-docx, pdfplumber) reinstall in minutes; rebuilding the digests of the study design, the outcome-specific requirements and the Terms takes the half day in the estimate. The exam report's digest is not needed again: `docs/EXAM_INSIGHTS.md` already holds its substance in our words, and the traps are paraphrased from that.

The exam report maps marks to questions, and questions to key knowledge, by COLDBOOT's own tagging. The top-ten order above rests on that tagging; a different reading of two or three questions would reorder the tail of the list, not its head.

## What the operator decides

Whether to build Phases A and B now (recommended), and whether Phase C goes ahead given the session limits and the 9 November cut line. Nothing else needs a decision before work starts; the open choices above each carry a recommendation, and `docs/DECISIONS.md` records whichever way they go.
