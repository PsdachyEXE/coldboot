# COLDBOOT build prompt

> **Operator note (for Lachie, not for Claude Code).** Create an empty public GitHub repo named `coldboot` under `PsdachyEXE`, clone it, put this file in the root, and start Claude Code there. Pick Fable 5.1 with `/model`, then type:
> `ultracode ultrathink Read BUILD_PROMPT.md end to end and execute it.`
> The keywords only work when typed; leaving them inside this file does nothing. If the GitHub CLI is logged in (`gh auth status`), Claude Code can switch on Pages itself; otherwise it will print the two clicks needed. The app name and repo slug are baked into the Pages URL and the installer, so change them in Sections 1 and 11 before running if you want something else.

Everything below is addressed to Claude Code.

## 1. Mission

Build COLDBOOT, a revision app for VCE Applied Computing: Software Development, Units 3 and 4, under the VCE Applied Computing Study Design accredited from 2025. The users are Year 12 students sitting the end-of-year exam on Friday 13 November 2026, with reading time starting at 3:00 pm Melbourne time (AEDT, UTC+11). At the time of writing (late September 2026) that is under eight weeks away, so a usable core has to be live on GitHub Pages before any stretch work begins.

The app runs from GitHub Pages as an installable PWA and opens as a desktop app window through a one-line PowerShell installer. Its palette is black and blue. It is keyboard-first and built around a drop-down terminal that hosts minigames. Every item of study content is tagged to the key knowledge (KK) points of the study design, so each user can see exactly where they are weak.

- Owner: GitHub user `PsdachyEXE`
- Repo: `coldboot`. It must be public: free GitHub Pages and unauthenticated raw file access both depend on that.
- Pages URL: `https://psdachyexe.github.io/coldboot/`
- Install command for friends (Windows): `irm https://raw.githubusercontent.com/PsdachyEXE/coldboot/v1.0.0/install.ps1 | iex`

## 2. Ground rules

1. Accuracy beats volume. A wrong card teaches a stressed student a wrong answer. If an item can't be defended from the study design or mainstream textbook meaning, leave it out and log it in `docs/CONTENT_NOTES.md`.
2. The study design is the scope. Teach its key knowledge, its Terms used in this study glossary and its problem-solving methodology (PSM). Nothing else. Development models (agile, waterfall, spiral) belonged to the previous study design and still fill a lot of revision material, but the operator could not find them in the 2025 key knowledge. Confirm against the source. If they are absent, exclude them and say so in the scope note on the About screen.
3. Paraphrase. The repo is public, so never commit study design text, VCAA exam questions or examiners' report passages. Write original items in the VCAA style. KK titles, Act names and command terms are fine as labels. The About screen credits the VCAA, links the official pages, and states that the app is not affiliated with or endorsed by the VCAA.
4. Don't ask the operator questions. Decide, record the decision, the reason and the rejected alternative in `docs/DECISIONS.md`, and keep going. Stop only when blocked by missing credentials or access.
5. Commit after each self-contained unit of work and at the end of each phase, using conventional commit messages. Push at the end of each phase.
6. Australian spelling throughout (organisation, behaviour, colour, licence as a noun), with "program" for software.
7. Privacy and network: the only personal data is a display name, stored locally. No accounts, analytics, trackers or third-party CDNs. No runtime network requests beyond same-origin assets.
8. Treat imported files as hostile. Validate them before use and never render imported strings as HTML.

## 3. Source material (first task)

Download these into `reference/`. Add `reference/` to `.gitignore` and never commit it.

| Item | URL |
|---|---|
| Study design (docx) | https://www.vcaa.vic.edu.au/sites/default/files/2026-06/2025AppliedComputingStudyDesign.docx |
| SD software tools and outcome-specific requirements, 2026 (docx) | https://www.vcaa.vic.edu.au/sites/default/files/2026-06/2026AppliedComputingUnit34SDSoftwareToolsFunctionsOutcomeSpecificRequirements.docx |
| Exam specifications (docx) | https://www.vcaa.vic.edu.au/sites/default/files/2025-04/AC-software-development-specs-w.pdf_1.docx |
| Sample questions (pdf) | https://www.vcaa.vic.edu.au/sites/default/files/2025-04/AC-software-development-sampleQ-w.pdf |
| 2025 exam (pdf) | https://www.vcaa.vic.edu.au/sites/default/files/2025-12/2025-AppliedComp-SoftwareDev.pdf |
| 2025 examiners' report (docx) | https://www.vcaa.vic.edu.au/sites/default/files/2026-02/2025-AppliedComputingSoftwareDevel-report.docx |
| Planning support page | https://vcaa.vic.edu.au/curriculum/vce-curriculum/vce-study-designs/applied-computing/planning |
| Teaching and learning support page | https://www.vcaa.vic.edu.au/curriculum/vce-curriculum/vce-study-designs/applied-computing/teaching-and-learning |

If a file has moved, find the current version from the study page (https://www.vcaa.vic.edu.au/curriculum/vce-curriculum/vce-study-designs/applied-computing/applied-computing) or the exam page (https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/applied-computing-software-development). If the server rejects plain `curl`, retry with `-L` and a browser User-Agent. Extract text with whatever works locally (pandoc, python-docx in a virtual environment, pdftotext, pypdf) and save it beside the originals.

Then write `reference/SOURCE_DIGEST.md` (also gitignored) containing:
- every outcome with its full key knowledge and key skills;
- the complete Terms used in this study list;
- the PSM and the PSM specifications;
- the exam format;
- every convention visible in the 2025 exam and the sample questions: pseudocode keywords, the assignment symbol, loop forms, how array index bases are stated, test table columns, object description layout, DFD and use-case notation, command terms.

Reconcile Section 4 against the digest. The source wins every disagreement. Log each correction in `docs/DECISIONS.md`.

Finally, write `docs/EXAM_INSIGHTS.md` (committed, in your own words): short points on what the 2025 examiners' report says students did poorly on and what earned marks. These feed the `mistake` notes on content items.

## 4. Study design map

This is the operator's reconstruction from the VCAA support pages, the 2025 exam and a third-party KK index. Titles are summaries, not quotations. Anything marked "verify" was not confirmed from the study design text itself. IDs take the form `U3O1-KK01` and follow the order of the key knowledge bullets in the study design; renumber if the source order differs.

### Unit 3 Area of Study 1: Software development: programming (SAC)
The SAC is four teacher-designed modules: calculations using arithmetic, logical and conditional operators; reading and writing files; sorting and searching with functions or methods; classes and objects. At least two modules include a GUI.

- KK01 Emerging trends in programming with AI: prompting to generate code; AI-assisted debugging, testing and optimisation; responsible and ethical use.
- KK02 Interpreting solution requirements: functional and non-functional requirements, constraints, scope.
- KK03 Design tools for representing modules (verify the list; expected: data dictionaries, mock-ups, object descriptions, pseudocode, IPO charts).
- KK04 Data types (verify the list; expected: character, string, integer, floating point, Boolean). Justification patterns from support material: phone numbers as strings (leading zeros, spaces, no arithmetic); currency as floating point to two decimal places; numbers stored as text sorting as 1, 101, 15, 3, 5.
- KK05 Data structures: one-dimensional arrays (single type, integer index), two-dimensional arrays (row and column indices), records (mixed types, named fields). Verify whether associative arrays or lists are named.
- KK06 Data sources: plain text (TXT), delimited (CSV), XML. Their structure, when each suits, and why XML's self-describing tags make it extensible.
- KK07 OOP: abstraction, encapsulation, generalisation, inheritance; classes and objects; access modifiers (public, private, protected, default).
- KK08 Features of a programming language (verify): variables and constants; local and global scope; instructions and control structures (sequence, selection, and iteration as pre-test, post-test and counted loops); arithmetic, logical and conditional operators; functions, procedures, methods, classes; GUI elements; file operations.
- KK09 Naming conventions: Hungarian notation, camel casing, snake casing, applied to variables, interface controls and code structures.
- KK10 Validation: existence, type and range checks.
- KK11 Internal documentation: the purpose of a module, its key features, and the justification of processing choices.
- KK12 Sorting and searching: selection sort, quick sort, linear search, binary search; comparative complexity and efficiency; choosing a search from data order and requirements.
- KK13 Types of errors: syntax, logic, runtime (overflow, index out of range, type mismatch, divide by zero); mitigation through error handling and extra checks.
- KK14 Debugging and testing: breakpoints, debugging output statements, commenting out code, test cases, constructing test data, test tables with expected and actual output. Verify whether trace tables are named. If they are not, frame tracing work as desk-checking toward test tables.

### Unit 3 Area of Study 2: Software development: analysis and design (SAT part 1)
- KK01 Why individuals and organisations undertake software development projects.
- KK02 Features of a brief documenting a problem, need or opportunity.
- KK03 Project management with Gantt charts: tasks, durations, sequencing, dependencies, milestones, critical path (verify whether slack is named).
- KK04 Data collection techniques (verify the list; expected: interviews, surveys or questionnaires, observation) and choosing one per stakeholder group.
- KK05 Functional and non-functional requirements. Support material gives reliability, usability and portability as non-functional examples.
- KK06 Constraints (verify the list; expected to include economic, legal, social, technical and usability constraints).
- KK07 Scope.
- KK08 Analytical tools: context diagrams, data flow diagrams, use case diagrams. Entities versus actors, data flows versus interactions, includes versus extends, and spotting convention errors.
- KK09 The software requirements specification and its contents (verify).
- KK10 Key legal requirements for intellectual property, ownership and privacy of data (verify which Acts).
- KK11 File management: naming, versioning, backup, archiving, secure disposal.
- KK12 Generating design ideas with ideation techniques and tools (verify; support material names brainstorms, mind maps, mood boards and sketches).
- KK13 Efficiency and effectiveness, and criteria for evaluating design ideas and solutions.
- KK14 Design tools for detailed designs: data dictionaries, mock-ups, object descriptions, IPO charts, pseudocode.
- KK15 Characteristics of user experiences: affordance, interoperability, security, usability.
- KK16 Design principles that shape appearance and functionality (verify the list).

### Unit 4 Area of Study 1: Software development: development and evaluation (SAT part 2)
- KK01 Efficient and effective solutions; user-centred design.
- KK02 Data types, structures and sources for input, storage and output.
- KK03 Features of a programming language.
- KK04 Established and innovative approaches: code repositories, APIs and libraries (including the risk when one changes or access is revoked), AI-based assistants.
- KK05 Validation techniques.
- KK06 Debugging and alpha testing techniques.
- KK07 Beta testing: choosing the user group, test plans, scenarios, observation, documenting results.
- KK08 Features of evaluation strategies (verify; expected: which criteria, when, and who is responsible).
- KK09 Techniques for applying evaluation criteria, including collecting evaluation data.
- KK10 Factors affecting project plan effectiveness: scope creep, personnel changes, technical issues.
- KK11 Recording progress: annotations and adjustments, logs and journals, project management software.
- KK12 Assessing the effectiveness of a project plan.

### Unit 4 Area of Study 2: Cyber security: secure software development practices (SAC)
- KK01 Goals and objectives of medium and large organisations.
- KK02 Advantages and disadvantages of developing software in-house versus externally.
- KK03 Vulnerabilities and risks in insecure development environments (verify the list; the 2025 exam used a combined development, testing and production environment, and an insider misconfiguration that exposed code and data).
- KK04 Physical and software security controls protecting development practices and data: identity and access management, authentication (credentials, biometrics, MFA), version control, encryption, code reviews, patching and updates, separated environments, backups.
- KK05 Threat modelling principles (verify; the 2025 exam and the sample questions fit a five-step model: define security requirements, create an application diagram, identify threats, mitigate threats, validate that threats are mitigated).
- KK06 Criteria for evaluating the security of development practices.
- KK07 Legislation and frameworks (verify the exact set; expected: Copyright Act 1968 (Cth); Privacy Act 1988 (Cth) with the Australian Privacy Principles; Privacy and Data Protection Act 2014 (Vic), which binds the Victorian public sector and its contractors; Health Records Act 2001 (Vic); the ACSC Essential Eight; the Information Security Manual).
- KK08 Ethical issues in software development (over-reliance on AI-generated code, exposed data, failing to acknowledge reused code).
- KK09 Measures to reduce or eliminate threats and risks.
- KK10 Recommendations to improve development practices.

### Cross-cutting (both examinable)
- `TERMS`: every entry in Terms used in this study.
- `PSM`: the four stages (analysis, design, development, evaluation), their activities, and the PSM specifications. Confirm the stage and activity names from the source.

## 5. Exam model

- Timing: 15 minutes reading, 2 hours writing, 100 marks, worth 50% of the study score.
- Section A: 20 multiple-choice questions, 1 mark each, four options. At 1.2 minutes per mark, that is about 24 minutes.
- Section B: short-answer questions worth 20 marks in total (five questions in 2025).
- Section C: questions on a case study printed in a detachable insert, worth 60 marks (13 questions in 2025). Answers must apply to the case study; generic answers score poorly.
- Command terms in the 2025 paper included state, identify, describe, explain, justify, classify, complete and recommend. Marks and answer space signal the depth wanted.
- Conventions (confirm and extend from the source): pseudocode with numbered lines and uppercase keywords such as BEGIN, END, IF, THEN, ELSEIF, ELSE, ENDIF, RETURN and DISPLAY; test tables with columns for test number, inputs, expected output and actual output; object descriptions split into the object name, properties/attributes with data types, and methods; DFD flow labels in snake_case; use-case relationships shown as `<<includes>>` and `<<extends>>`.
- Teacher advice from a Victorian school's Software Development exam page, presented in the app as advice rather than as VCAA rules: name data types in full (Integer, Floating point, String, Character, Boolean); avoid abbreviations except common ones such as DFD, SRS, XML, CSV and SQL; when a question asks for one item, give exactly one.

## 6. Product

### 6.1 First run
Ask for a display name (used in the terminal prompt), confirm the exam date and time (default as above), and set the daily new-card limit (default 25). Offer "Import progress" for returning users. Store everything locally.

### 6.2 Home
One primary action, "Start today's run", chains three things: due reviews, a 10-item drill on the weakest KK, then the daily challenge. Below it sits a coverage grid of every KK (one row per area of study) shaded by mastery, with unseen KKs visibly distinct from weak ones. Clicking a cell opens a focused drill.

A persistent status bar runs along the bottom of every screen, tmux-style, as bracketed segments: `[T-52d 04h] [37 due] [streak 6] [offline ready]`.

### 6.3 Review (flashcards with spaced repetition)
Card types: basic; reverse (term and definition in both directions); cloze; compare (A versus B, for example validation versus testing). Keys: Space flips, 1 to 4 rate Again, Hard, Good and Easy, R opens the report dialog. After the flip, show the KK tags and the `mistake` note if the card has one.

Scheduler: SM-2, implemented in-house and unit-tested.
- Ratings map to quality 1, 3, 4 and 5. Quality below 3 resets repetitions, sets the interval to 1 day and re-queues the card 10 minutes later in the same session.
- Intervals run 1 day, 6 days, then the previous interval multiplied by the ease factor. Ease starts at 2.5, updates with the standard SM-2 formula and never drops below 1.3.
- Exam cap: clamp every new due date so it lands no later than two days before the exam (but never earlier than tomorrow). In the final 7 days, cap intervals at 2 days. Remove both caps once the exam has passed.
- New cards are ordered coverage-first: round-robin across KKs, lowest mastery first, so every KK gets exposure in the first days of use.
- The study day rolls over at 4:00 am local time.

### 6.4 Drill (Section A style)
Sets by KK, by area of study, by weakest KKs, or random. After each answer, show the correct option, an explanation, and a one-line reason each distractor is wrong. An optional timed mode runs at Section A pace (20 questions in 24 minutes).

### 6.5 Written (Sections B and C style)
Show the command term and the marks. The user types an answer, then reveals the model answer and marking points and ticks the points they earned. Record the score and show the `mistake` note. Suggest length from the marks, roughly one developed point per mark.

### 6.6 Exam simulator (P1)
Full paper: a 15-minute reading phase with answer inputs locked, then 2 hours of writing. Sections A, B and C, with the case study insert in a side panel that can sit beside the questions. Autosave continuously; the timer survives reloads. On submit, Section A is auto-marked and Sections B and C are self-marked against marking points. The report breaks the score down by section and by KK. A mini mode (10 MCQs, 1 short answer, 1 case study slice, 30 minutes) suits daily use.

### 6.7 Case studies
Original scenarios in the 2025 style: a medium or large Australian organisation, a project team with named roles, at least one figure (context diagram, DFD, object description, Gantt data, pseudocode or mock-up), and questions ranging across all four areas of study. Invented organisations and people only.

### 6.8 Syllabus map
Four columns (one per area of study) plus Terms and PSM groups. Each KK row shows its title summary, a mastery bar, item counts and when it was last practised. Clicking a row starts a focused drill.

### 6.9 Stats (P1)
Plain SVG charts, no chart library: accuracy by area of study over time, reviews per day, a 14-day due forecast, the 10 weakest KKs, time studied.

### 6.10 Settings and data
Name, exam date, new-card limit, sound (off by default), reduced-motion override, export progress (JSON download), import progress (validated), reset progress (requires typing RESET), app version and an update check.

### 6.11 Report a content problem
Every item has a Report action. The dialog shows the item ID, a reason picker (wrong answer, unclear, typo, outside the study design, other) and a note field. Two buttons: "Open GitHub issue" opens a prefilled `https://github.com/PsdachyEXE/coldboot/issues/new` URL with title and body; "Copy report" puts the same text on the clipboard for people without GitHub accounts.

### 6.12 Daily challenge (P0 in the terminal, P1 as a screen)
Ten items picked by a PRNG seeded with the Melbourne calendar date, so everyone gets the same set that day: 8 MCQs and 2 generated items. Only the first attempt counts. The share line copies to the clipboard:

```
COLDBOOT daily 2026-10-02  8/10
🟦🟦⬛🟦🟦🟦🟦⬛🟦🟦
```

A blue square is a correct answer; a black square is a wrong one.

### 6.13 Mastery
Every attempt records `{ itemId, kk[], score (0 to 1), timestamp, ms }`. Card ratings score Again 0, Hard 0.5, Good 0.8, Easy 1. MCQs and game items score 0 or 1. Short answers score marks earned over marks available. KK mastery is the recency-weighted mean with weight `0.5 ^ (ageDays / 7)`, shown from 0 to 100. A KK with no attempts is "unseen", not zero.

## 7. Terminal and minigames

### 7.1 Terminal
Build a DOM terminal rather than using xterm.js or a PTY, so output lines can hold rich blocks: tables, SVG figures, highlighted pseudocode, links into app routes. Two presentations share one session. The first is a console that drops from the top of any screen when the backtick key is pressed (with a button for touch devices). The second is a full-screen Terminal route.

- Prompt: `<name>@coldboot:~$`
- Command history on Up and Down, with the last 100 commands persisted.
- Tab completion for commands, game names and KK IDs.
- Ctrl+C aborts the current game; Ctrl+L clears the screen.
- Unknown commands suggest the nearest match (edit distance 2 or less).
- On mobile, a real input element brings up the on-screen keyboard, and tappable chips offer common answers.

Commands: `help`, `ls`, `man <game>`, `play <game> [--easy|--hard]`, `daily`, `due`, `review`, `drill [kk|area]`, `exam [--mini]`, `map`, `stats`, `countdown`, `whoami`, `history`, `clear`, `about`, `exit`. `sudo <anything>` prints "Permission denied. This terminal runs with least privilege."

### 7.2 Game engine

```ts
interface Game {
  id: string;
  title: string;
  kk: KkId[];
  man: string; // shown by `man <game>`
  start(ctx: GameContext, opts: { difficulty: 'easy' | 'normal' | 'hard'; seed: number }): GameSession;
}

interface GameSession {
  prompt(): TerminalBlock[];
  answer(input: string): AnswerResult; // { correct, expected, reason, kk }
  readonly done: boolean;
  summary(): GameSummary; // score, time, per-KK results
}
```

Every generator takes a seeded PRNG (mulberry32 or equivalent). A round is 10 items by default. Parse answers leniently: ignore case and extra whitespace, and accept commas or spaces between array values. A wrong answer shows the expected answer and a one-line reason. Results feed KK mastery. Most games are question, answer and feedback loops, so build one shared quiz-loop engine and make each game a generator plus a renderer.

### 7.3 Games

P0:
- `deskcheck`: generated pseudocode in the exam's style. Ask for the output or return value, or a variable's value after a given line or iteration. Templates cover counters and accumulators; IF/ELSEIF chains probed at their boundaries (where `<` and `<=` differ); counted, pre-test and post-test loops over one-dimensional arrays; two-dimensional array access by row and column; string concatenation and length; functions with parameters and return values. Hard mode adds nested loops and off-by-one traps. Every question states the array index base. A second round type gives pseudocode plus its requirements and asks for a test table: inputs that exercise each branch and boundary, with expected outputs.
- `sort`: selection sort and quick sort. Selection rounds ask for the array after pass k. Quick sort rounds state the partition scheme in the question (for example, last element as pivot with Lomuto partitioning) and ask for the array after the first partition and the resulting sub-lists. Conceptual rounds compare efficiency and complexity and ask when each algorithm is reasonable.
- `search`: linear and binary search. Ask for the sequence of indices inspected (stating how the midpoint rounds), the number of comparisons, and which search suits a scenario (sorted or unsorted data, size, how often the search runs).
- `triage`: classify an error from a snippet or a symptom as syntax, logic or runtime, then name the runtime subtype (overflow, index out of range, type mismatch, divide by zero). Follow-up: the most useful debugging technique for this case (breakpoint, debugging output statement, commenting out code).
- `validate`: given a field specification and a batch of inputs, name the check that rejects each bad input (existence, type, range) and choose boundary test values.
- `blitz`: 60 seconds of paraphrased definitions; type the term. Accept an edit distance of 2 or less, or up to 20% of the term's length for long terms. The score is the number correct.
- `daily`: the daily challenge, terminal edition.

P1:
- `dfd`: a rendered context diagram or DFD containing one convention error. The user picks the faulty element and the rule it breaks: a flow between two external entities, a data store wired straight to an entity, a process with no inputs or no outputs, an unlabelled flow, a process named with a noun, a flow between two data stores. A second round type shows a context diagram and asks the user to label the missing processes and stores in a Level 1 DFD from a word bank.
- `usecase`: identify actors, choose includes or extends for each relationship, spot errors.
- `reqs`: classify statements as functional requirement, non-functional requirement, constraint or scope, then name the non-functional type.
- `gantt`: a generated table of 5 to 9 tasks with durations and dependencies. Ask for the critical path, the total duration, the slack on a task, a sensible milestone, and the effect of delaying a task by n days (critical versus non-critical). Draw an ASCII Gantt chart after each answer.
- `threat`: match a development-environment vulnerability to the best control; pick Essential Eight strategies out of a list; put the threat modelling steps in order (once confirmed from the source).
- `law`: a scenario, then which Act applies and why (jurisdiction, who it binds, the kind of data involved).
- `naming`: name the convention an identifier uses, or rewrite an identifier into a requested convention, including Hungarian prefixes for variables and interface controls.
- `types`: choose a data type, a data structure and a data source for a scenario, each with the one-line justification the exam expects.
- `oop`: name the OOP principle in a scenario, complete an object description, choose an access modifier.
- `psm`: sort activities into the PSM stages.

P2:
- `boss`: three lives and an escalating mix drawn from every game, ending in a self-marked three-question case study slice.
- `ux`: SVG mock-ups; identify which UX characteristic or design principle is weakest and why.

All security content is defensive and recognition-level: identify the weakness, choose the control. No working exploit code, and no payloads beyond the short textbook illustrations the course itself uses.

## 8. Content

### 8.1 Files and schema

```
content/
  study-design.json        KK list: id, area, title, summary, examples
  terms.json               glossary cards
  psm.json
  u3o1/  cards.json  mcq.json  short.json
  u3o2/  (same)
  u4o1/  (same)
  u4o2/  (same)
  case-studies/  cs-01.json ...
```

Zod schemas live in `src/content/schema.ts` and are enforced by `npm run content:check` and by the test suite.

```ts
type KkId = `U${3 | 4}O${1 | 2}-KK${string}` | 'TERMS' | 'PSM';
type Source = 'study-design' | 'exam-convention' | 'textbook';

interface Card {
  id: string;
  kk: KkId[];
  type: 'basic' | 'reverse' | 'cloze' | 'compare';
  front: string;
  back: string;
  mistake?: string;
  difficulty: 1 | 2 | 3;
  source: Source;
}

interface Mcq {
  id: string;
  kk: KkId[];
  stem: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: string;
  whyWrong: [string, string, string, string]; // the entry at `answer` is ''
  difficulty: 1 | 2 | 3;
  source: Source;
}

interface ShortAnswer {
  id: string;
  kk: KkId[];
  commandTerm: string;
  marks: number;
  prompt: string;
  points: { text: string; marks: number }[];
  model: string;
  mistake?: string;
  source: Source;
}

interface CaseStudy {
  id: string;
  title: string;
  insert: string;
  figures: Figure[];
  questions: Array<(Mcq | ShortAnswer) & { figureRefs?: string[] }>;
  totalMarks: number;
}
```

Text fields use a small Markdown subset: bold, italics, inline code, lists, tables, and fenced `pseudo` blocks for pseudocode. No raw HTML.

### 8.2 Floors (enforced by a test)
- Every KK: at least 6 cards, 3 MCQs and 1 short answer.
- `TERMS`: one card per glossary entry.
- `PSM`: at least 12 cards and 6 MCQs.
- Case studies: 1 for P0, 2 for P1, 4 for P2. Each runs to about 60 marks over 10 to 13 questions and touches all four areas of study.

Generated items don't count toward the floors.

### 8.3 Quality rules
- Every item carries KK IDs and a `source`. Items that depend on a "verify" entry in Section 4 ship only after the source confirms it.
- Write in the exam's register.
- MCQs have one clearly best answer and plausible distractors of similar length. Never "all of the above" or "none of the above".
- Marking points are discrete and checkable. When there is a scenario, the model answer applies to it.
- Case studies use invented Australian organisations and people, with realistic project teams.
- Two passes. After authoring, a separate review pass (a different sub-agent where possible) checks every item against `reference/SOURCE_DIGEST.md` and `docs/EXAM_INSIGHTS.md`, then fixes or drops anything doubtful. Log every drop in `docs/CONTENT_NOTES.md`.

### 8.4 Figures
Render figures from structured data with dedicated SVG components: context diagram, DFD, use-case diagram, Gantt chart, object description table, and (P2) mock-up wireframes. Take the DFD and use-case notation from the 2025 exam and the sample questions, and use it consistently. Layout comes from explicit coordinates in the data. Don't add an auto-layout library.

## 9. Design system

The brief fixes the palette at black and blues. The audience is students cramming for one exam, and the subject is software, so the terminal is the product's natural voice.

| Token | Hex | Use |
|---|---|---|
| `--void` | `#000000` | background (true black, as briefed) |
| `--trench` | `#06122B` | raised surfaces: drawer, panels, inputs |
| `--steel` | `#6B80A8` | muted text, hairline rules, inactive states |
| `--cobalt` | `#2450E8` | primary buttons (with `--ice` text), focus ring, selection |
| `--phosphor` | `#7FC7FF` | terminal text, links, highlights |
| `--ice` | `#DCEAFF` | primary text |

Correct answers use `--flare: #22D3FF` with a ✓ glyph and the word "Correct". Incorrect answers use `--steel` on `--trench` with a ✗ glyph, the word "Incorrect" and a 120 ms horizontal nudge. No green or red anywhere, and colour never carries meaning on its own. Every text and background pair in use must meet WCAG AA, checked by a script in CI.

Type:
- Martian Mono (variable) for the terminal, code and pseudocode, the status bar and the wordmark.
- Atkinson Hyperlegible Next for reading content and interface text. It was designed for legibility, which matters over long study sessions.
- Self-host both through Fontsource packages. Confirm the package names; if they don't exist, download the OFL font files into `public/fonts`.
- Scale: 14, 16, 20, 25 and 31 px. Body line-height 1.5, headings 1.3. Reading columns cap at 72 characters and are left-aligned.

Layout:

```
+-----------------------------------------------------------+
|  drop-down terminal (backtick) slides over everything      |
+----------+------------------------------------------------+
| Home     |                                                |
| Review   |  main column, left-aligned, 72ch cap for text  |
| Drill    |                                                |
| Written  |                                                |
| Exam     |                                                |
| Map      |                                                |
| Stats    |                                                |
| Terminal |                                                |
+----------+------------------------------------------------+
| [T-52d 04h] [37 due] [streak 6] [offline ready]            |
+-----------------------------------------------------------+
```

Below 720 px, the rail becomes a bottom tab bar and the status bar shrinks to the countdown and the due count.

Principles:
- The terminal is the one bold element. Everything else stays quiet: flat surfaces, hairline `--steel` rules only where structure needs them, no shadows, no gradient washes, no grids of identical rounded cards. Controls get a 2 px radius; panels get none.
- There is one orchestrated motion moment: a cold-boot sequence at launch, printed as POST-style lines built from real data (KKs loaded per area, reviews due, time to the exam). The full version (about 1.2 seconds) plays once per day and a 300 ms condensed version otherwise; it is instant under reduced motion and skippable with any key. Everywhere else, motion only answers user actions: card flip 150 ms, drawer 180 ms.
- No all-caps labels, no eyebrow labels above headings, no arrows appended to button text, no middle-dot metadata strings. The COLDBOOT wordmark is the only all-caps text in the product.
- Copy uses sentence case and plain, active verbs. A button's name matches its result ("Start review" leads to "Review complete"). Empty states say what to do next. Errors say what happened and how to fix it.
- Before building screens, write the design plan (tokens, type, layout, principles) into `docs/DESIGN.md`, review it against this section, and note what you changed and why. If your environment can take screenshots, critique the main screens against this section before closing Phase 1.
- Quality floor: responsive down to 360 px wide, visible focus on everything, full keyboard operation, reduced motion honoured, an ARIA live region announcing answer feedback, labelled terminal controls.

## 10. Architecture

- Vite, React and TypeScript in strict mode, on current stable versions. Use npm and commit the lockfile.
- Hash routing (`createHashRouter`). GitHub Pages has no SPA fallback, so path-based routes 404 on refresh.
- State lives in Zustand stores (settings, srs, attempts, session) behind a small persistence layer over localStorage. Prefix every key with `coldboot:v1:`, because every Pages site under `psdachyexe.github.io` shares one origin and one storage quota. Version the schema and migrate on load. Debounce writes. Wrap every storage call in try/catch; on failure, keep running in memory and show a persistent warning that progress won't be saved.
- Keep attempt logs compact (tuples, not objects). Beyond roughly 20,000 attempts, roll the oldest into per-KK aggregates.
- Content JSON loads per outcome through dynamic imports. The games, exam and stats routes are lazy-loaded.
- Markdown renders through markdown-it with HTML disabled, plus a custom fence renderer that highlights keywords in `pseudo` blocks.
- Styling uses CSS custom properties and CSS modules. No UI kit and no Tailwind.
- PWA via vite-plugin-pwa (Workbox). Precache the shell, fonts and content. Use prompt-style registration: when a new build is waiting, show "Update ready. Reload now?" Manifest: name and short name COLDBOOT, theme and background colour `#000000`, display standalone, 192 px and 512 px icons plus a maskable icon, and scope and start URL matching the base path.
- Base path: set Vite's `base` from `GITHUB_REPOSITORY` in CI (`/<repo>/`) and use `/` locally.
- Content Security Policy in a meta tag: `default-src 'self'; script-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'`. Confirm the production build runs under it. Relax `style-src` only if that proves necessary, and record why in `docs/DECISIONS.md`.
- Imports: cap files at 5 MB, parse inside try/catch, validate with Zod, and reject unknown schema versions with a clear message.
- Icons: author one SVG mark, generate the PNG sizes and a multi-size `.ico` with a script, and commit the generated files so CI doesn't depend on the tooling.

Suggested layout:

```
src/
  app/        routes, layout, status bar, boot sequence
  terminal/   console, drawer, parser, completion, blocks
  games/      engine, prng, one folder per game (generator, game, tests)
  srs/        sm2, queue, mastery
  content/    schema, loader, markdown
  figures/    context diagram, DFD, use case, Gantt, object description
  exam/       simulator, timer state machine, marking
  state/      stores, persistence, migrations
  ui/         primitives
content/      study content (JSON)
scripts/      content-check, contrast-check, installer-lint, icons
install.ps1   repo root (the raw install URL depends on this path)
uninstall.ps1 repo root
docs/         DECISIONS.md  DESIGN.md  CONTENT_NOTES.md  EXAM_INSIGHTS.md
reference/    gitignored source material
```

## 11. Distribution

### 11.1 GitHub Pages
`.github/workflows/deploy.yml` runs on pushes to `main` and on manual dispatch: `npm ci`, typecheck, lint, tests, content check, contrast check, installer lint, build, then `actions/upload-pages-artifact` and `actions/deploy-pages` (permissions `pages: write` and `id-token: write`, concurrency group `pages`). Deploy only when every step is green.

Enable Pages with GitHub Actions as the source: try `gh api -X POST repos/PsdachyEXE/coldboot/pages -f build_type=workflow`, or the PUT form if a site already exists. Check that the repo is public with `gh repo view --json visibility`; if it is private, warn loudly, because both Pages and the install command need it public. If `gh` isn't authenticated, print the manual steps (Settings, then Pages, then Source: GitHub Actions) and carry on. Deploy a placeholder early in Phase 0 to prove the URL works.

### 11.2 Windows installer: `install.ps1`
Friends run: `irm https://raw.githubusercontent.com/PsdachyEXE/coldboot/v1.0.0/install.ps1 | iex`

Hard requirements:
- ASCII only. Windows PowerShell 5.1 can mangle non-ASCII text fetched through `irm`.
- Runs on Windows PowerShell 5.1 and PowerShell 7+, without admin rights.
- No `exit` anywhere: under `iex` it closes the user's shell. Wrap the whole body in `& { ... }` and use `return`.
- Set `$ErrorActionPreference = 'Stop'` and `$ProgressPreference = 'SilentlyContinue'` (the 5.1 progress bar slows downloads badly). Add TLS 1.2 to `[Net.ServicePointManager]::SecurityProtocol` inside try/catch.
- Pass `-UseBasicParsing` to every `Invoke-WebRequest`.
- Constants at the top: app name, Pages URL, icon URL (`https://psdachyexe.github.io/coldboot/icons/coldboot.ico`), install folder `$env:LOCALAPPDATA\COLDBOOT`.

Steps:
1. Print a short banner in cyan.
2. Check that the Pages URL responds. If it doesn't, say the site couldn't be reached, suggest checking the connection, and return.
3. Download the icon into the install folder.
4. Find a Chromium browser: Edge from its App Paths registry key (HKCU, then HKLM), then its standard install paths; failing that, Chrome the same way.
5. With a browser found, create two shortcuts through `WScript.Shell`: one on the Desktop (`[Environment]::GetFolderPath('Desktop')`, which follows OneDrive redirection) and one in the Start menu (`[Environment]::GetFolderPath('Programs')`). Target the browser executable with the arguments `--app=<Pages URL> --profile-directory=Default` (pinning the profile keeps progress in one place), and set the icon and a description. Then launch the same command so the app opens straight away, unless the environment variable `COLDBOOT_NO_LAUNCH` equals `1`.
6. With no Chromium browser, create `.url` internet shortcuts instead, open the Pages URL in the default browser, and print how to install it as an app from that browser.
7. Print where the shortcuts are and the uninstall command.

Re-running the installer repairs or updates the shortcuts. `uninstall.ps1` removes the shortcuts and the install folder, then reminds the user that study progress lives in the browser, where Settings can export or reset it. It follows the same ASCII and no-`exit` rules. Uninstall command: `irm https://raw.githubusercontent.com/PsdachyEXE/coldboot/v1.0.0/uninstall.ps1 | iex`

Installer checks in CI:
- `scripts/installer-lint` fails the build if either script contains a non-ASCII byte or an `exit` statement.
- A `windows-latest` job, run after deploy, runs PSScriptAnalyzer on both scripts (installing it from the PowerShell Gallery if missing), then runs `install.ps1` with `COLDBOOT_NO_LAUNCH=1` against the live Pages URL and asserts that both shortcut files exist and point at `msedge.exe` with the right arguments.

### 11.3 Other platforms (README)
macOS, Linux and ChromeOS: open the Pages URL, then install it as an app from the address bar or menu in Chrome or Edge. In Safari on macOS Sonoma or later, use File, then Add to Dock. Phones: Add to Home Screen.

### 11.4 Release
Once P0 is complete and deployed green, tag `v1.0.0` and push the tag. The install and uninstall commands only work after the tag exists. The installer rarely needs to change, and the app still updates on every push because the shortcuts point at Pages. If the installer does change, cut a new tag and update the README.

The README covers: what the app is, the Pages URL, the Windows install and uninstall commands, steps for other platforms, how progress is stored and backed up, how to report a content problem, the scope and not-affiliated notes, and local development commands.

## 12. Testing

- SM-2 transitions, the exam cap and the final-week cap; coverage-first queue ordering; mastery decay.
- PRNG determinism, including identical daily challenge sets for the same Melbourne date.
- Every generator checked against a reference implementation over at least 500 seeds: selection sort passes, quick sort partitions, binary search index sequences, critical path and slack.
- `deskcheck` answers come from a small interpreter for exactly the pseudocode subset the generator emits. Assert that the expected answer equals the interpreter's output for every generated question. Never hand-compute answers inside templates.
- Answer parsers: lenient where the spec says so, strict where the exam is strict.
- Import validation: malformed JSON, oversized files, wrong versions, hostile strings.
- Content: every file passes Zod; floors are met; IDs are unique; every KK reference exists; MCQ answer indices are valid and `whyWrong` is complete; no duplicate stems after normalising.
- A contrast script over every token pair in use.
- Component tests: card flip, terminal parsing and completion, and the exam timer state machine (reading, writing, submitted, surviving a reload).
- P1: a Playwright run that completes first run, flips a card, runs `help`, plays one round of `sort` and exports progress.

## 13. Build plan

Phase 0 runs in sequence. The Phase 1 tracks run in parallel once the contracts exist.

Phase 0, foundation:
1. Sources: download, extract, digest, reconcile Section 4, write `EXAM_INSIGHTS.md`. Commit the docs, never `reference/`.
2. Scaffold the app, CI, the Pages workflow and installer stubs. Deploy a placeholder and confirm the URL.
3. Lock the contracts: content schemas, `content/study-design.json`, `Game` and `GameSession`, `TerminalBlock`, store shapes, the route map. Commit. From this point, any contract change updates every consumer in the same commit.

Phase 1, parallel tracks toward P0:
- A. Shell, design system, boot sequence, home, status bar, settings, persistence, PWA.
- B. Terminal (drawer and route), parser, completion, game engine, P0 games.
- C. Content for Unit 3 (both areas), Terms and PSM.
- D. Content for Unit 4 (both areas), the first case study, the figure components.
- E. SRS, review, drill, written mode, mastery, syllabus map.
- F. Installer, uninstaller, installer CI, README.

Close Phase 1 with the content review pass, the design critique, a green deploy and the `v1.0.0` tag.

Phase 2, P1: exam simulator, P1 games, the second case study, stats, the daily challenge screen and share line, Playwright.

Phase 3, P2: `boss`, `ux`, the remaining case studies, content growth above the floors guided by `EXAM_INSIGHTS.md`, and exam-day states for the countdown (underway, finished).

## 14. Definition of done for v1.0.0

- [ ] The Pages URL serves the app, reloads offline after the first visit, and shows the update prompt after a new deploy.
- [ ] Chrome DevTools reports the app as installable (valid manifest and service worker).
- [ ] First run, home, review with SM-2, drill, written mode, syllabus map, and settings with export, import and reset all work.
- [ ] The terminal drawer (backtick) and route work, with every P0 command and game, and tests for each game.
- [ ] Content floors are met for every KK, Terms and PSM; the review pass is done; `CONTENT_NOTES.md` lists every exclusion and its reason.
- [ ] The countdown targets the absolute instant `2026-11-13T15:00:00+11:00` and displays correctly in any timezone.
- [ ] Both installer scripts pass the installer lint and the `windows-latest` job.
- [ ] Lighthouse accessibility scores 95 or higher and desktop performance 90 or higher.
- [ ] The README, `DECISIONS.md`, `DESIGN.md` and `EXAM_INSIGHTS.md` are committed; `v1.0.0` is tagged and pushed.

When finished, print a report for the operator: the Pages URL; the pinned install and uninstall commands; content counts per KK; which games shipped at each priority; every Section 4 entry you corrected against the source; open issues and recommended next steps.
