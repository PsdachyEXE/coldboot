# Content notes

Every item left out, dropped in review, or held back, with the reason. Ids listed as dropped are never reused.

## Scope

- The VCAA source documents were unavailable while this content was written (`DECISIONS.md` D-001). Every item is grounded in the mainstream textbook meaning of what its KK names. Items whose correctness would depend on the exact contents of a list the study design gives (the Section 4 "verify" entries) were held back, and each is listed below.
- Development models (agile, waterfall, spiral) are excluded: the build brief could not find them in the 2025 key knowledge.
- The glossary in `content/study-design.json` is provisional, built from the terms the key knowledge names. It must be reconciled with the study design's "Terms used in this study" list when the source is available.
- Authoring: 13 units, each written by one agent and then reviewed by a different agent against the rules in `content/README.md`. The reviewers recomputed every trace, sort, search, calculation and critical path. In total 851 items were reviewed, 171 fixed in place, 9 dropped and 3 replaced.

## U3O1 KK01 to KK05 (part u3o1-a)

Review pass: no items dropped. Every item was fixed in place or kept.

- Which design tools the study design lists (U3O1-KK03): held back. The list is marked verify, so no item asks which tools are listed or which one is *not* a design tool; items test only what each expected tool shows and when it suits.
- Flowcharts, structure charts, Nassi-Shneiderman diagrams, storyboards and site maps (U3O1-KK03): held back. Whether any of them is on the unconfirmed list of design tools can't be checked.
- The complete set of data types, and "which is not a data type" items (U3O1-KK04): held back. The list of data types is marked verify; items name only Integer, Floating point, String, Character and Boolean, in full.
- Date/time, decimal, fixed-point and currency types, long and short integers, and storage sizes in bytes (U3O1-KK04): held back. They depend on the unconfirmed list or on the language; currency follows the brief's Floating point to two decimal places convention.
- Padding numeric Strings with leading zeros as a sorting fix (U3O1-KK04): held back. Padding changes what is displayed (001, 002, 010), so it doesn't produce the 1, 2, 10, 25, 100 order that s-u3o1-kk04-002 asks for; that marking point was removed.
- Associative arrays, dictionaries, lists, stacks and queues (U3O1-KK05): held back. Whether associative arrays or lists are named is marked verify, and no item claims arrays and records are the only structures.
- Arrays as fixed-size structures (U3O1-KK05): held back. Whether an array's size is fixed depends on the language.
- Pseudocode notation for record fields (U3O1-KK05): held back. docs/PSEUDOCODE.md doesn't define field access, so no trace uses record fields; the Record card shows dot notation only as an example.
- Sorting a constraint into a type (economic, legal, social, technical, usability) (U3O1-KK02, U3O2-KK06): held back. The list of constraint types is marked verify; constraint items use only budget, deadline and legal compliance as generic examples.
- Portability versus technical constraint side by side (U3O1-KK02, U3O2-KK05): held back. A statement that the program must run on particular existing hardware can be read either way, so the portability example in m-u3o1-kk02-003 is written as working across devices whatever their operating system.
- Contents of a software requirements specification (U3O1-KK02, U3O2-KK09): held back. The SRS contents are marked verify.
- Classifying a call to a non-existent library function as a syntax, runtime or compile-time error (U3O1-KK01, U3O1-KK13): held back. The classification depends on the language, so m-u3o1-kk01-002 asks only for the most appropriate response.
- Real AI products, school or VCAA policy on AI use, and copyright ownership of AI-generated code (U3O1-KK01): held back. Policies can't be checked, the law is unsettled, and the U4O2-KK07 Acts are marked verify.
- Naming the working for pseudocode items a trace table (U3O1-KK05, U3O1-KK14): held back. Whether trace tables are named is marked verify; the items ask only for an algorithm's output.
- Development models (U3O1-KK01 to KK05): held back. They are outside the 2025 key knowledge as mapped.

## U3O1 KK06 to KK10 (part u3o1-b)

Review pass: every item was checked and every trace recomputed; no items were dropped.

- Which language features the study design lists (U3O1-KK08): held back. The KK carries a verify note on its list of features, so no item asks which features are listed or which one is *not*; items test only what a feature is and when it suits.
- Definition of "conditional operator" (U3O1-KK08): held back. The term can mean a comparison operator or the ternary `?:` operator and the study design's usage can't be checked, so items say "comparison operator" instead.
- Named GUI elements (U3O1-KK08): held back. Which GUI elements count as language features depends on the unconfirmed list.
- Polymorphism, constructors and interfaces (U3O1-KK07): held back. The KK names abstraction, encapsulation, generalisation, inheritance, classes, objects and access modifiers only.
- Pascal case as a tested convention (U3O1-KK09): held back. The KK names Hungarian notation, camel case and snake case; Pascal case appears only in one `mistake` note that corrects `NumberOfSeats`.
- A fixed list of Hungarian prefixes presented as a standard (U3O1-KK09): held back. Prefix sets vary between teams, so items say "common" prefixes and never mark one set as the only correct one.
- XML schemas and DTDs, JSON, and attributes versus elements (U3O1-KK06): held back. They go beyond the KK's plain text, CSV and XML structure.
- Format, length and lookup checks, and verification such as double entry (U3O1-KK10): held back. The KK names existence, type and range checks only.

## U3O1 KK11 to KK14 (part u3o1-c)

Review pass: no items dropped. Fixes were made in place; the topics below are held back.

- Trace tables (U3O1-KK14): held back. The KK's verify note asks whether trace tables are named, so no item names, defines or asks students to complete one; tracing items ask directly for the values compared, the array contents or the outcome, and test tables use the house columns (test number, input(s), expected output, actual output).
- Definition of "boundary" test data (U3O1-KK14): held back. Textbooks differ on whether boundary data means only the limits or also the values just beyond them, so no item depends on the definition; the boundary MCQ's answer (7, 8, 16, 17) is best under either reading.
- Extreme and exceptional test-data categories (U3O1-KK14): held back. The category names and their meanings vary between textbooks and aren't in the KK summary.
- Quick sort partition traces (U3O1-KK12): held back. The order after a partition depends on the partition scheme and pivot rule, which vary between textbooks and languages; quick sort items cover only the pivot-and-partition idea, average-case speed and the poor-pivot worst case.
- Big O notation (U3O1-KK12): held back. Efficiency is given as comparison counts (n(n − 1)/2 for selection sort; at most floor(log2 n) + 1 for binary search, e.g. 10 for 1 000 items, 16 for 40 000 and 20 for 1 000 000).
- Bubble sort and insertion sort by name (U3O1-KK12): held back. They are outside the KK's named algorithms; one selection sort distractor comes from swapping neighbouring pairs, but the item doesn't name that algorithm.
- Compile-time type mismatch (U3O1-KK13): held back. Whether a type mismatch is caught at compile time depends on the language, so type mismatch is taught only as the runtime case of converting user input.
- Floating point division by zero (U3O1-KK13): held back. Many languages return infinity or NaN rather than stopping, so no item claims that it crashes; the one MCQ that turns on a divide-by-zero error states in its stem that the language raises a runtime error.
- Overflow behaviour (U3O1-KK13): held back. Whether overflow stops the program or wraps the value depends on the language, so the overflow card names both outcomes and commits to neither.
- try/catch pseudocode (U3O1-KK13): held back. The house pseudocode style has no construct for it, so error handling is described in words only.
- Fixed header-comment fields (U3O1-KK11): held back. Conventions for author, date and version fields vary between teams, so no fixed list is taught as a standard.
- "Justification comment" as a named term (U3O1-KK11): held back. It isn't a standard textbook term, so c-u3o1-kk11-004 now asks what it means for a comment to justify a processing choice.
- User documentation (U3O1-KK11): held back. It appears only as the contrast in one compare card and as MCQ distractors, not as a topic in its own right.

## U3O2 KK01 to KK06 (part u3o2-a)

### Drops

No item was dropped in review. Items that had a defensible core were fixed in place; the fixes are listed in the reviewer's report.

### Held back

- Slack or float (U3O2-KK03): held back. The KK map asks to confirm whether slack is named, so no item names, defines or calculates slack; items on non-critical tasks ask only whether a stated delay moves the finish date, which follows from the critical path itself.
- Which data collection techniques the study design lists (U3O2-KK04): held back. The list is unverified, so items use only interviews, surveys or questionnaires, and observation, and none asks which technique is or isn't listed; focus groups, document analysis and other techniques are left out.
- Social and usability constraints, and the type of a deadline (U3O2-KK06): held back. The list of constraint types is unverified, so classification items use only economic, technical and legal constraints (the KK map's examples); a deadline appears only as "a constraint" with no type, and no item asks which type is *not* listed.
- Named Acts in legal constraints (U3O2-KK06, U3O2-KK10): held back. Which Acts are named is unverified, so legal-constraint items say "privacy law" and name no Act; the privacy MCQ uses a dental clinic, a health service provider, because small organisations may fall under the small business exemption from federal privacy law.
- The full contents of an SRS (U3O2-KK02, U3O2-KK09): held back. The SRS contents list is unverified, so brief-versus-SRS items describe the SRS only as the detailed statement of requirements, constraints and scope.
- Robustness, maintainability and security as non-functional requirements (U3O2-KK05): held back. Items use only reliability, usability and portability (the KK map's examples) plus response time as a performance target, and no item states which qualities the study design lists.
- Whether a requirement with a response-time target is "only non-functional" or "functional and non-functional combined" (U3O2-KK05): held back. Textbooks differ: many treat a statement such as "display the total within one second" as a performance (non-functional) requirement, while others split it into a functional part and a non-functional part. m-u3o2-kk05-004 was rewritten so that its answer (the time limit is a non-functional target) holds under both readings.
- Portability versus a technical constraint for a statement naming the platforms a solution runs on (U3O2-KK05, U3O2-KK06): held back. "Must run on the existing tablets" can be read either way, so no MCQ offers both readings as options; the classification MCQ offers only constraint types and "functional requirement".
- Connectivity limits as a reliability requirement versus a technical constraint (U3O2-KK05, U3O2-KK06): held back. "Must keep working when the Wi-Fi drops out" can be read as either, so no MCQ uses it as a distractor. The option in m-u3o2-kk06-004 that did was replaced with an unambiguous usability requirement.
- Real laws and regulators in need scenarios (U3O2-KK01): held back. Need scenarios use an invented government reporting rule and an insurer's condition, written so that the current process works well and only the "need" reading fits.

## U3O2 KK07 to KK11 (part u3o2-b)

Review pass: no items dropped. Twelve items were fixed in place (see the review report); the lines below record every topic held back.

- Formal change control process or change control board (U3O2-KK07): held back. The KK names only scope, so scope-change items say only that a request is recorded, assessed for time and cost, and agreed before work starts.
- Project scope versus product scope (U3O2-KK07): held back. This is a project-management distinction the KK summary doesn't name.
- DFD symbol shapes as a rule (U3O2-KK08): held back. The house notation (circle process, open-ended data store) hasn't been checked against a VCAA paper, so the reviewer also removed "drawn as a circle" from m-u3o2-kk08-001; only c-u3o2-kk08-006 mentions shapes, to tell a rectangle entity from a stick-figure actor.
- DFD levels, decomposition, balancing and process numbering rules (U3O2-KK08): held back. The KK summary doesn't name them.
- Arrowheads on use case associations (U3O2-KK08): held back. Conventions vary, so items say only that associations carry no data labels.
- Required sections of an SRS, "what is missing from this SRS" and "which is not part of an SRS" items (U3O2-KK09): held back. The listed contents of an SRS carry a verify note; c-u3o2-kk09-008 relies only on non-functional requirements and constraints belonging in an SRS, which holds under the mainstream meaning whatever the study design lists.
- Context diagrams, DFDs and use case diagrams as SRS components (U3O2-KK09): held back. Whether they belong in the SRS depends on the unverified list.
- Claims that mock-ups or data dictionaries never appear in an SRS (U3O2-KK09): held back. SRS templates differ, so the what-versus-how items use pseudocode, algorithm choice, function names and button placement as the design-side examples.
- Naming constraint categories such as "economic" in KK09 items (U3O2-KK09): held back. U3O2-KK06's list of constraint types carries a verify note, so the reviewer reworded the m-u3o2-kk09-004 whyWrong line to call a budget simply a constraint.
- Which Act applies to a given organisation or scenario (U3O2-KK10): held back. Which Acts the study design names carries a verify note; only c-u3o2-kk10-008 names Acts (Copyright Act 1968 and Privacy Act 1988, both Cth), stating only what each covers.
- Privacy and Data Protection Act 2014 (Vic) and Health Records Act 2001 (Vic) (U3O2-KK10): held back. Which Acts are named carries a verify note, and U4O2-KK07 covers them; scenarios avoid health information.
- Privacy Act small business exemption and turnover threshold (U3O2-KK10): held back. It is subject to law reform, so privacy items are framed as good practice reflected in the Australian Privacy Principles, not as a claim that a small organisation is bound by the Act.
- APP numbers, the notifiable data breaches scheme, copyright duration, fair dealing, patents and trade marks (U3O2-KK10): held back. They go beyond the key legal requirements the KK summary names.
- Ownership of AI-generated code (U3O2-KK10): held back. The law is unsettled.
- Implied licences for commissioned code (U3O2-KK10): held back. Ownership items rest only on the default rules (author owns unless an employee writes it as part of the job, or copyright is assigned in writing).
- Differential backups and the named "3-2-1" rule (U3O2-KK11): held back. Backup types are limited to full and incremental, the mainstream core of "backup".
- One wiping method being enough for every drive type (U3O2-KK11): held back. Overwriting is less reliable on solid-state drives, so secure disposal items always offer "overwrite or physically destroy" together.

## U3O2 KK12 to KK16 (part u3o2-c)

### Dropped

No items were dropped in review. All 70 items (40 cards, 20 MCQs, 10 short answers) were checked; 16 were fixed in place (listed under Review fixes).

### Held back

- Which ideation techniques and tools the study design names (U3O2-KK12): held back. The list is a verify entry; items use only brainstorming, mind maps, mood boards and sketches, test what each is and when it suits, and never ask which techniques are (or are not) named.
- SCAMPER, storyboards, word association and role play (U3O2-KK12): held back. Not in the KK map's examples, and whether the study design names them can't be checked.
- A fixed order for using ideation techniques (U3O2-KK12): held back. Textbooks don't agree on one, and it would depend on the unconfirmed list.
- Classifying usability, timeliness or functionality as efficiency or effectiveness in an MCQ (U3O2-KK13): held back. Textbooks place these differently; cards follow the KK map (usability under effectiveness) and no MCQ turns on the classification.
- One identical set of criteria for judging design ideas and the finished solution (U3O2-KK13): held back. Items say only that both sets of criteria are drawn from the requirements.
- Tracing evaluation criteria to named SRS sections (U3O2-KK13): held back. U3O2-KK09 is a verify entry, so criteria are traced to "the requirements" only.
- Naming the PSM stage or activity in which design ideas are generated or evaluated (U3O2-KK13): held back. The PSM activity names are unconfirmed.
- A required set of data dictionary columns, including validation or format columns (U3O2-KK14): held back. Textbooks vary; items use name, data type, size and description, marked "typically".
- The unit of Size for numeric data types in a data dictionary (U3O2-KK14): held back. Textbooks give digits or bytes; c-u3o2-kk14-004 now describes Size for Strings only.
- Choosing a design tool for a need, and property-versus-method errors in object descriptions (U3O2-KK14): held back. Part u3o1-a covers these under U3O1-KK03.
- Specific security controls such as MFA types and encryption methods (U3O2-KK15): held back. They belong to U4O2-KK04; KK15 treats security as user trust and the balance with usability.
- Perceived versus actual affordance (U3O2-KK15): held back. Not needed at this level, and textbook usage varies.
- Which design principles the study design lists (U3O2-KK16): held back. The list is a verify entry; items use only alignment, contrast and consistency, and never ask which principles are listed.
- Balance, proximity, repetition, white space and hierarchy (U3O2-KK16): held back. Not in the KK map's examples; not taught or used as distractors.
- Sorting design principles into appearance and functionality groups (U3O2-KK16): held back. The split depends on the study design's wording.
- Whether affordance or interoperability count as design principles (U3O2-KK16): held back. They appear only as distractors whose whyWrong lines explain what they are, never as claims about which list they belong to.

### Review fixes

- `c-u3o2-kk12-005` (U3O2-KK12): the mock-up row now says "typical use"; design ideas can also be shown as rough mock-ups.
- `m-u3o2-kk12-001`, `m-u3o2-kk12-002` (U3O2-KK12): whyWrong lines no longer claim a mock-up belongs only to the detailed design.
- `c-u3o2-kk13-006` (U3O2-KK13): criteria check how well the requirements are met, rather than each criterion mapping to exactly one requirement.
- `c-u3o2-kk13-008` (U3O2-KK13): the back now says "both sets of criteria are drawn from the requirements", so it doesn't imply one identical set.
- `c-u3o2-kk14-004` (U3O2-KK14): the Size card describes Strings only and drops the numeric claim; the weak mistake note is removed.
- `c-u3o2-kk14-006`, `c-u3o2-kk14-007` (U3O2-KK14): corrected "details the drawing can't show" (a drawing can show colours); data dictionary columns are marked "typically".
- `m-u3o2-kk14-001` (U3O2-KK14): the key's wording now matches the distractors, so it no longer stands out.
- `s-u3o2-kk14-002` (U3O2-KK14): "Complete" had nothing to complete; added a blank object description template and matched the model to it.
- `c-u3o2-kk15-001` (U3O2-KK15): clearer mistake note on affordance versus usability.
- `m-u3o2-kk15-002` (U3O2-KK15): renamed "Paddlewheel Bakehouse" to "Quandong Lane Bakehouse", because a real Paddlewheel Motel trades in Echuca.
- `m-u3o2-kk15-004` (U3O2-KK15): stem grammar.
- `m-u3o2-kk16-001` (U3O2-KK16): a grey button that volunteers "miss" also pointed to contrast; it is now orange, and the complaint is about hunting for the button on each screen.
- `m-u3o2-kk16-002` (U3O2-KK16): the whyWrong line for the heading-font option no longer calls it consistency.
- `s-u3o2-kk16-002` (U3O2-KK16): each button now lines up with its own screen's content, so alignment isn't a rival answer; the prompt says the annotations give the colours.

### Checks

- `m-u3o2-kk14-003`: traced with node. The running totals are 40, 65, 95, 120 and 160; 160 > 150, so line 14 subtracts 10 and 150 is displayed. The distractors check out: 160 skips the discount, 120 is an off-by-one loop (and then no discount applies), and 170 charges the senior the adult fare and skips the discount.
- `s-u3o2-kk14-001`: fee = min(hours × 4.50, 22.00). Checked for 1, 4, 5 and 8 hours.
- Mock-up coordinates (`m-u3o2-kk14-002`, `m-u3o2-kk16-003`, `s-u3o2-kk16-002`) are all inside the 24-unit margin. The chess club form's four label and text box pairs start at four different x positions, as the item intends.
- A web search found no real organisations matching the other invented names used.

## U4O1 KK01 to KK06 (part u4o1-a)

- None of these KKs carries a `verify` note, but several overlap U3O1 entries that do. No item asks which data types, data structures, language features or GUI elements the study design lists, or which one is *not* listed. Data types are limited to Integer, Floating point, String, Character and Boolean; data structures to one-dimensional arrays, two-dimensional arrays, records and arrays of records. Associative arrays, lists, dates and JSON are left out (U3O1-KK04 and U3O1-KK05 verify notes).
- Scope split with U3O1. Part u3o1-a/b/c already defines the data types, data structures, file types, language features, validation checks, error types and debugging techniques. These items take the development-stage angle instead: converting fields read from a file, holding a file in an array of records, persistence, choosing an output format, modules with parameters, choosing GUI controls, placing and testing validation, alpha testing and the test-fix-retest cycle. Examples already used in U3O1 (phone numbers as Strings, "twelve" in a quantity box, write versus append) are not reused.
- U4O1-KK01. Efficiency is taught through time, cost and effort; effectiveness through accuracy and completeness, following part u3o2-c. No MCQ turns on classifying usability or timeliness. User-centred design is taught as involving real users throughout development and revising the design from their feedback. Personas, accessibility standards and any named UCD standard are left out; the KK names none of them.
- U4O1-KK04. No item sorts code repositories, APIs, libraries and AI assistants into "established" and "innovative", because that split depends on the study design's wording. Repository items use only commit, history and roll back; branching, pull requests and named tools (Git, GitHub) are left out. The licence MCQ names no Act (U3O2-KK10 and U4O2-KK07 are verify entries). AI assistants appear in one compare card only; prompting and hallucination stay with U3O1-KK01.
- U4O1-KK05. Items use existence, type and range checks only. Format, length and lookup checks, verification, and client-side versus server-side validation are left out, as in part u3o1-b.
- U4O1-KK06. Unit, integration, system and regression testing are not named as terms; the ideas appear in plain words (test each module, then the modules together; re-run earlier tests after a fix). Trace tables are not named (U3O1-KK14 verify); hand tracing is called desk checking. Conditional breakpoints, watches and stepping are left out.
- Pseudocode. There are no file operations in the pseudocode, because docs/PSEUDOCODE.md defines no syntax for them. File reading is described in prose, or simulated with an array literal (m-u4o1-kk02-003).
- Every computed answer was traced by hand and checked by running it in node:
  - m-u4o1-kk02-003: `"12" + "5"` joins to 125. The distractors are 17 (values converted to Integer), `12 5` (a space wrongly added) and BK-20412 (indexes read as if from 1).
  - m-u4o1-kk03-002: `shippingCost(8, TRUE)` = (9.50 + 3 × 1.20) × 2 = 26.20. The distractors are 13.10 (no doubling), 19.00 (wrong branch) and 38.20 (the whole weight charged).
  - m-u4o1-kk03-004: the late fees are 0, 5 and 11, so the total is 16. The distractors are 11 (last fee only), 21 (0 days charged) and 10 (branch order ignored).
  - m-u4o1-kk05-002: each condition was tested over ages −5 to 40. Only `age < 5 OR age > 17` matches the invalid ages.
  - m-u4o1-kk05-003: with inputs 13, 0, 12 and 5, the message is displayed twice, the program displays `Order: 12 trays`, and 5 is never read.
  - s-u4o1-kk05-002: with inputs 12 then 15, the message is displayed once and the program displays "Booked for 15 guests".
  - m-u4o1-kk06-002: the actual outputs are 72, 180, 178.20 and 324. Only test 2 differs (expected 162.00).
  - m-u4o1-kk06-004: only `[20, 18, 7, 15]` returns a wrong answer (18, not 20). The other inputs return their true maximum.
  - s-u4o1-kk06-001: 10 minutes gives $0 and $0; 90 minutes gives $6 expected and $3 actual; 600 minutes gives $15 and $15. The suggested fix, `(minutes + 59) DIV 60`, gives 1, 1, 2 and 10 hours for 16, 60, 90 and 600 minutes.
  - s-u4o1-kk03-002: the model returns 0, 6, 6 and 10 for ages 3, 4, 15 and 16.

## Review pass (u4o1-a)

Every item was reviewed. All traces and calculations were recomputed in node outside the repo, and every one matched its key: m-u4o1-kk02-003, m-u4o1-kk03-002, m-u4o1-kk03-004, m-u4o1-kk05-002 (ages −5 to 40), m-u4o1-kk05-003, m-u4o1-kk06-002, m-u4o1-kk06-004, s-u4o1-kk03-002, s-u4o1-kk05-002 and s-u4o1-kk06-001 (including 16, 60, 61 and 120 minutes, and the `(minutes + 59) DIV 60` fix). No item was dropped.

Held back:

- The claim that a change with fewer steps leaves effectiveness unchanged (U4O1-KK01): held back. The glossary and part u3o2-c count usability as a measure of effectiveness. c-u4o1-kk01-006 and the explanation of m-u4o1-kk01-002 now say only that accuracy is unchanged.
- The claim that a calendar control takes less time than typing a date (U4O1-KK01): held back. Experienced typists may be as quick, so s-u4o1-kk01-002 now credits fewer keystrokes and less effort.
- The claim that a withdrawn code library carries no risk (U4O1-KK04): held back. The KK names the risk when a library changes or access is revoked, so c-u4o1-kk04-004 now says that your copy keeps running but gets no more fixes.
- How specific version control tools merge changes (U4O1-KK04): held back. s-u4o1-kk04-002 describes merging and conflict flagging in generic terms and names no tool.
- Language-specific results of a failed String-to-number conversion (U4O1-KK05): held back. Some languages return a partial number instead of failing, so c-u4o1-kk05-007 says "in most languages".
- The claim that every field read from any text file is a String (U4O1-KK02): held back. Some file-reading tools convert types, so c-u4o1-kk02-001 now describes reading a line and splitting it.

Fixed:

- `c-u4o1-kk01-006` (U4O1-KK01): fixed. The question now asks which quality the redesign most directly improves, and the answer and mistake no longer say that effectiveness is unchanged.
- `m-u4o1-kk01-002` (U4O1-KK01): fixed. The explanation no longer says that effectiveness is unchanged.
- `m-u4o1-kk01-004` (U4O1-KK01): fixed. The stem now asks for an evaluation of the route-planning module, so the key isn't open to the objection that longer routes make the delivery run less efficient.
- `c-u4o1-kk01-008` (U4O1-KK01): fixed. The mistake note no longer says that an efficiency gain doesn't count.
- `s-u4o1-kk01-002` (U4O1-KK01): fixed. The marking point and model answer now credit fewer keystrokes and less effort, not less time.
- `c-u4o1-kk02-001` (U4O1-KK02): fixed. It now scopes the claim to a line that is read and split.
- `m-u4o1-kk02-003` (U4O1-KK02): fixed. The stem now says that the array literal stands in for the file read.
- `m-u4o1-kk02-004` (U4O1-KK02): fixed. The whyWrong line for the CSV option no longer suggests that CSV can't hold varying numbers of competitors. A flat file with one line per competitor can. It now rests on nesting and on new fields breaking position-based reading.
- `c-u4o1-kk03-008` (U4O1-KK03): fixed. It no longer says that a function works only with its parameters, since a function can also use global variables and constants.
- `c-u4o1-kk04-001` and `c-u4o1-kk04-002` (U4O1-KK04): fixed. An API is now "defined" rather than "published", since internal APIs exist, which also matches the glossary. A library is "reusable" rather than "tested".
- `m-u4o1-kk04-002` (U4O1-KK04): fixed. The whyWrong line for saved map images no longer says that live positions can't be shown on them.
- `m-u4o1-kk05-001` (U4O1-KK05): fixed. The wording of the explanation is clearer.

## U4O1 KK07 to KK12 (part u4o1-b)

### Dropped in review

- `c-u4o1-kk08-003` (U4O1-KK08): dropped. It asked the same question as c-u3o2-kk13-006 ("Where do evaluation criteria come from?"), with the same answer, so a student would see the card twice; replaced by c-u4o1-kk08-008 on why the strategy names who is responsible.
- `c-u4o1-kk09-002` (U4O1-KK09): dropped. Its survey versus interview contrast repeats c-u3o2-kk04-001 almost row for row; replaced by c-u4o1-kk09-009 (system logs versus a user survey), which is specific to evaluation data.
- `c-u4o1-kk09-007` (U4O1-KK09): dropped. "State two limitations of observation" repeats c-u3o2-kk04-003 nearly word for word; KK09 stays above its floor without a replacement.
- `c-u4o1-kk10-001` (U4O1-KK10): dropped. It was a third reverse card for "Scope creep", after t-scope-creep and c-u3o2-kk07-002 (which already carries U4O1-KK10); replaced by c-u4o1-kk10-009 on reducing the effect of technical issues.

### Held back

- The study design's list of evaluation strategy features (U4O1-KK08): held back. The list is a `verify` entry, so no item asks for it, how many features it has, or which feature is *not* on it; c-u4o1-kk08-001 says only that a strategy *typically* covers criteria, data and methods, timing and responsibility.
- Which PSM stage the evaluation criteria and the evaluation strategy belong to (U4O1-KK08): held back. PSM stage and activity names are unconfirmed, so criteria are tied only to the requirements, and no item says the strategy must be written before release.
- Classifying usability, accessibility or satisfaction as efficiency or effectiveness (U4O1-KK08): held back. The glossary is unconfirmed, so only time (efficiency) and accuracy (effectiveness) are classified; the low-vision criterion in s-u4o1-kk08-001 is left unlabelled.
- Slack or float (U3O2-KK03): held back. It is a `verify` entry, so the five Gantt MCQs and the Gantt short answer recompute finish dates and speak only of time a path "had to spare".
- A distinction between a log and a journal (U4O1-KK11): held back. Textbooks use the two terms loosely.
- Named project management products (U4O1-KK11): held back. No real product is named.
- Acceptance testing, user acceptance testing and think-aloud protocols as terms (U4O1-KK07): held back. The KK names user group selection, test plans, scenarios, observation and documenting results only.
- An "Alpha testing versus beta testing" card in this part (U4O1-KK07): held back. Part u4o1-a already has one (c-u4o1-kk06-002), so c-u4o1-kk07-002 is a cloze on when beta testing happens instead.
- Contingency as a defined term (U4O1-KK10): held back. It appears only as spare time in a plan (c-u4o1-kk10-008, c-u4o1-kk10-009).
- Development models (agile, waterfall, spiral) and their effect on project plans (U4O1-KK10): held back. They are out of scope.

### Review fixes (kept items)

- m-u4o1-kk08-002: the correct criterion "90% of online bookings are completed without phoning the clinic" had no obvious data source. It is now "At least 90% of online bookings are completed in under two minutes", which the program can log.
- m-u4o1-kk08-004: criterion 1 collected data from week 1, the learning stage, which contradicted the item's own reasoning in option D and c-u4o1-kk08-002. It now collects in weeks 5 to 8.
- s-u4o1-kk12-001: the model said adding a second tester "cut testing" and "risks errors being missed". Two testers for 3 days is more tester-days than one for 5, so that criticism was unsound. The adjustment is now credited as recovering 2 days, and the judgement point weighs the evidence explicitly.
- c-u4o1-kk10-007: the gap "adjusted" is now "shortened", and the back says a non-critical delay moves the finish date only if the delay makes its chain *longer than* the critical path (a tie doesn't move it).
- Organisations renamed after spot checks: Dundas Office Supplies (a real Ontario retailer) is now Mount Napier Office Supplies. Kestrel Cycles (Kestrel is a real bicycle brand, and cs-01 uses Kestrel Bay) is now Tarrawingee Cycles. Carwarp Grain Co-operative (Carwarp is a real grain receival site) is now Wemen Plains Grain Co-operative. Northwind Meter Services (Northwind is a common real company name) is now Dooen Meter Services. Figure ids were renamed to match. Grangeburn Office & IT is a real Hamilton business, so that name was avoided.

### Computation checks (node, review pass)

- Saltbush (m-u4o1-kk10-002): planned handover day 24. With Code interface 11 days and Integrate and test 2 days, handover is day 25, 1 day late.
- Murray Bend (m-u4o1-kk10-004): planned handover day 18, with the report path at 15. Only Design stock screens +1 moves it (to 19). Code report module +3, Design reports +2 and any 3-day split across the two report tasks all leave it at 18.
- Little Wrens (m-u4o1-kk11-004): planned go-live day 19. With Code forms +2 it is day 21. Code reports 2 days: 21. Beta test 2 days: 20. Alpha test 1 day: 19. Design reports 1 day: 21.
- Tawonga (m-u4o1-kk12-003): planned handover day 19. With actual durations, the booking path finishes day 15 and the reports path day 16, so the handover is day 20 (1 day late). The reports path had 4 days to spare in the plan.
- Dooen, formerly Northwind (s-u4o1-kk10-002): planned release day 28. Code database due day 13 against Connect starting day 16. With +5 it finishes day 18, and release is day 30.
- Quote times (m-u4o1-kk09-002): sum 1890, mean 236.25. Without the fastest: 248.57. Quotes at 240 or more: 4.
- Ratings (m-u4o1-kk09-004): 4 or 5 is 33/40 = 82.5%. 3 or more is 92.5%. 5 only is 35%. Mean 4.075.
- Hargreaves (m-u4o1-kk12-002): 25 planned, 31 actual. Thomson (s-u4o1-kk12-001): 29 planned, 32 actual.

## U4O2 KK01 to KK05 (part u4o2-a)

### Drops

No item was dropped in review. Every item had a defensible core, so the weak points were fixed in place (see the reviewer's report).

### Held back

- The steps of threat modelling, their names, order and number (U4O2-KK05): held back. The KK map marks the steps "verify", so no item names, numbers, orders or counts them (including the five-step sequence in the build brief), and none asks for the next or missing step; items teach the purpose of threat modelling, doing it during design, using a DFD, prioritising by likelihood and impact, mitigating with controls, testing mitigations and security requirements as general principles.
- STRIDE, DREAD, attack trees and trust boundaries (U4O2-KK05): held back. The KK map names none of them.
- Effort or cost of a fix as a factor in prioritising threats (U4O2-KK05): held back. Textbooks differ on whether ease of mitigation should affect priority, so items prioritise by likelihood and impact only, and no item claims that effort never matters.
- The name "insecure direct object reference" (U4O2-KK05): held back. The term is above Year 12 textbook level; m-u4o2-kk05-004 describes the attack in plain words only.
- Which vulnerabilities and risks the study design lists (U4O2-KK03): held back. The list is marked "verify", so no item asks which vulnerability or risk is or isn't listed; each item describes a specific weakness in a scenario.
- Named Acts, the Australian Privacy Principles, the Essential Eight and the Information Security Manual (U4O2-KK07, U3O2-KK10): held back. Which Acts and frameworks the study design names is unverified, so no item in this part names one.
- The legal default owner of code written by an external developer (U4O2-KK02, U4O2-KK07): held back. It depends on copyright law the study design may or may not name, so items say only that the contract should settle ownership and require the source code to be handed over.
- Buying off-the-shelf software (U4O2-KK02): held back. It isn't development, so external development means software built to order under a contract.
- Firewalls, antivirus, penetration testing, and password hashing and salting (U4O2-KK04): held back. The KK map's examples of controls don't include them.
- Least privilege as a standalone control (U4O2-KK04): held back. U4O2-KK09 covers it; here it appears only inside identity and access management items and one marking point.
- Biometrics on a registered device as an example of single-factor authentication (U4O2-KK04): held back. Whether a biometric check bound to a device counts as one factor or two depends on how it is built, so m-u4o2-kk04-002 was reworded to give two biometrics checked against stored records, with no device.
- Authentication factors beyond know, have and are, such as location or behaviour (U4O2-KK04): held back. Some sources add them, so c-u4o2-kk04-004 says "three main categories" and no item claims there are only three.
- Mission and vision statements, the SMART acronym, strategic, tactical and operational levels, and types of goals such as financial or social (U4O2-KK01): held back. The KK map names none of them.

### Checks

- m-u4o2-kk04-003 was traced again in node: with `["Wombat1", "Kanga!8", "kanga7", "Kanga!7"]` and arrays indexed from 0, attempts 0 to 2 fail, the loop ends with `failures` = 3 and `i` = 3 before `attempts[3]` is read, and the function returns "Account locked". Read as `failures ≤ 3`, it would return "Access granted" (distractor 0).
- The DFD label boxes in m-u4o2-kk05-002 and s-u4o2-kk05-001 were computed with the repo's own routing code (`src/figures/flows.ts`). No label overlaps a node, another label or another flow's line. `order_details` (Tidewater) was moved clear of its own line. `appointment_details` (Pepper Creek) now sits at the renderer's default midpoint on its own line.

## U4O2 KK06 to KK10 (part u4o2-b)

### Drops

- `c-u4o2-kk09-005` (U4O2-KK09): dropped. It restated c-u4o2-kk04-007 in part u4o2-a almost word for word (a second developer checks each change before merging, catching flaws and malicious code), so it only duplicated that card.

### Held back

- Which Acts and frameworks the study design names (U4O2-KK07): held back. The list carries a verify note, so no item asks which Acts or frameworks the study design names, how many there are, or which is not among them. Items say only what each Act or framework covers, which holds whatever the list says. If the confirmed list drops one of the Privacy Act 1988 (Cth), the Privacy and Data Protection Act 2014 (Vic), the Health Records Act 2001 (Vic), the Copyright Act 1968 (Cth), the Essential Eight or the Information Security Manual, drop the items that name it: c-u4o2-kk07-001 to -008, m-u4o2-kk07-001 to -004, s-u4o2-kk07-001 and -002, and the secondary mentions in c-u4o2-kk08-003, c-u4o2-kk08-008 and m-u4o2-kk08-004.
- The Privacy Act small business exemption and turnover threshold (U4O2-KK07): held back. They are subject to law reform, so items say "many private organisations" and state coverage in the scenario when it matters.
- APP, IPP and HPP numbers or counts, penalty amounts, the 2024 privacy amendments and ransomware payment reporting (U4O2-KK07): held back. They change often or go beyond the KK.
- Essential Eight maturity levels, the Commonwealth policy that mandates the Essential Eight for some agencies, and ISM control numbers (U4O2-KK07): held back. They change often or go beyond the KK.
- Exceptions to the Privacy Act's exclusion of state bodies, such as tax file number rules and state-owned corporations (U4O2-KK07): held back. Items say only that Victorian public sector bodies such as departments and councils fall under the Victorian Act.
- Whether the Health Records Act or the Privacy Act binds an external developer that builds a clinic's app (U4O2-KK07): held back. s-u4o2-kk07-001 now says the app must let the clinic meet the Act, and doesn't claim the developer itself is bound.
- Whether a contractor serving a Victorian public sector body is also bound by the Privacy Act for that work (U4O2-KK07): held back. Items say only that the Victorian Act binds a contractor when its contract says so.
- Notifiable Data Breaches detail: the 30-day assessment period, the remedial-action exception's wording and the contents of the statement (U4O2-KK07): held back. c-u4o2-kk07-008 and m-u4o2-kk07-004 cover only the duty to notify affected people and the Commissioner as soon as practicable, for an organisation stated to be covered and a breach stated as likely to cause serious harm.
- Copyright ownership of commissioned code (U4O2-KK07): held back. U3O2-KK10 covers it; here copyright appears only as licence conditions and acknowledging reused code.
- Moral rights, including the right of attribution (U4O2-KK07, U4O2-KK08): held back. They can make uncredited reuse a legal issue too, so no item claims that reusing code without credit is legal; c-u4o2-kk08-001's legal-versus-ethical example now uses unchecked AI-generated code.
- Reverse (definition) cards for Essential Eight and least privilege (U4O2-KK07, U4O2-KK09): held back. The glossary part already defines both (t-essential-eight, t-least-privilege), so c-u4o2-kk07-004 now asks why a team would apply the Essential Eight and c-u4o2-kk09-001 asks how least privilege limits damage.
- A fixed set of criteria for evaluating development security (U4O2-KK06): held back. Criteria are given as examples ("any three"), and no item claims the study design lists particular criteria. The invented term "security evaluation criterion" is no longer a reverse card (c-u4o2-kk06-001 is now a basic card).
- Algorithmic bias, accessibility and the effect of automation on jobs (U4O2-KK08): held back. The KK's examples don't name them.
- Transferring and accepting risk (U4O2-KK09): held back. The KK names only reducing and eliminating.
- Named products (version control products, secrets managers, scanners), and password hashing and salting (U4O2-KK09): held back. They go beyond the KK map.
- "Defence in depth" as a term to recall (U4O2-KK09): held back. The KK map doesn't name it, so c-u4o2-kk09-007 teaches layering measures and gives the name only in passing, and no reverse card asks for it.
- Definitions of threat, vulnerability and risk (U4O2-KK09): held back. U4O2-KK03 in part u4o2-a covers them.
- Threat modelling steps or a named threat modelling model (U4O2-KK05): held back. The steps carry a verify note, and no item in this part refers to them.
- How recommendations are marked (U4O2-KK10): held back. The one exam-convention card (c-u4o2-kk10-005) states only what the command term *recommend* asks for, as docs/EXAM_INSIGHTS.md describes it.

### Checks

- s-u4o2-kk09-002 was traced in node with arrays indexed from 0: username `guest` with password `Kookaburra99` displays "Welcome guest" with `found` still FALSE, and a real username with the master password also logs in. Lines 2 and 11 are the master password assignment and test, as the marking points say.
- The model answer and mistake for s-u4o2-kk09-002 no longer say the master password must be changed. Once the back door is removed, the password no longer logs anyone in. The "change the password" advice stays with c-u4o2-kk09-004, where the hard-coded password is a live database credential.

## Glossary, TERMS (part terms)

Review pass: no items dropped. All 75 entries were kept, and 10 cards were fixed in place (t-generative-ai, t-array, t-csv, t-validation, t-runtime-error, t-gantt-chart, t-constraint, t-effectiveness, t-api, t-threat).

The real "Terms used in this study" list couldn't be checked (DECISIONS D-001). The 75 entries are a provisional glossary drawn from the KK titles, summaries and examples in `study-design.json` and Sections 4 and 5 of the brief. Every entry is `provisional`, every card is `source: textbook`, and no card claims that a term is in the study design's glossary. Aliases hold accepted alternative forms for `blitz` (abbreviations, expansions and US spellings); card fronts use Australian spelling.

- The full "Terms used in this study" list (TERMS): held back. It can't be checked, so the merge makes the glossary exactly these 75 provisional terms; recheck the whole list against the source when it is available.
- Individual data types (character, string, integer, floating point, Boolean) and "data type" itself (U3O1-KK04): held back. The list of data types is marked verify.
- Associative arrays and lists (U3O1-KK05): held back. Whether they are named is marked verify.
- Trace tables and desk checking (U3O1-KK14): held back. Whether trace tables are named is marked verify.
- Slack and float (U3O2-KK03): held back. Whether slack is named is marked verify.
- Named data collection techniques such as interviews, surveys and observation (U3O2-KK04): held back. The list of techniques is marked verify.
- Constraint types other than economic, legal and technical, such as social and usability (U3O2-KK06): held back. The list of constraint types is marked verify, so t-constraint gives only the three KK map examples and doesn't claim they are the full set.
- The contents of an SRS (U3O2-KK09): held back. The listed contents are marked verify, so t-software-requirements-specification says only "including its requirements, constraints and scope".
- Named Acts, the Australian Privacy Principles and the Information Security Manual (U3O2-KK10, U4O2-KK07): held back. Which Acts and frameworks are named is marked verify. Kept: t-essential-eight, because its definition is correct whatever the study design names and part u4o2-b already teaches the Essential Eight; it makes no claim that the study design lists it.
- Ideation techniques and tools such as brainstorming, mind maps, mood boards and sketches (U3O2-KK12): held back. The list is marked verify.
- Named design principles such as alignment, contrast and consistency (U3O2-KK16): held back. The list is marked verify.
- Evaluation strategy (U4O1-KK08): held back. Any definition amounts to the features list, which is marked verify.
- Threat modelling steps (U4O2-KK05): held back. The steps and their names are marked verify, so t-threat-modelling names, orders and counts no steps.
- Problem-solving methodology and its stage names (PSM): held back from TERMS. The PSM group covers them, and each TERMS card needs a Unit 3/4 KK.
- Development models (agile, waterfall, spiral), polymorphism, firewalls, penetration testing and social engineering (all areas): held back. The KK map doesn't name them.
- Authorisation (U4O2-KK04): held back as a separate entry. It appears only in the t-authentication mistake note.
- Selection sort, quick sort and linear search (U3O1-KK12): held back from the glossary. Part u3o1-c defines them, and t-binary-search contrasts with linear search in its mistake note.
- Local and global variables, function versus procedure, constant and two-dimensional array (U3O1-KK05, U3O1-KK08): held back from the glossary. Per-KK cards cover them, and t-array covers two-dimensional indexing.
- Plain text file, attribute, error handling, breakpoint and test table (U3O1-KK06, U3O1-KK07, U3O1-KK13, U3O1-KK14): held back from the glossary as near-duplicates of per-KK cards.
- Stakeholder, user experience, portability and reliability (U3O2-KK04, U3O2-KK05, U3O2-KK15): held back from the glossary as near-duplicates of per-KK cards.
- Copyright, personal information, archiving, task dependency, external entity, data store, actor, `<<includes>>` and `<<extends>>` (U3O2-KK03, U3O2-KK08, U3O2-KK10, U3O2-KK11): held back from the glossary. Per-KK cards cover them.
- Identity and access management, insider threat, security control and production environment (U4O2-KK03, U4O2-KK04): held back from the glossary. Part u4o2-a covers them.
- Type mismatch as a runtime error (U3O1-KK13): held back from t-runtime-error. Whether it is caught before or during running depends on the language's typing, so the card names only division by zero, index out of range and overflow, and doesn't claim a full list.
- "Timely" as an effectiveness measure (U3O2-KK13): held back from t-effectiveness. It sat awkwardly beside speed as an efficiency measure, so the card now uses the KK map's accurate, complete and usable, matching part u3o2-c.

## PSM (part psm)

Review pass: 34 items reviewed (19 cards, 13 MCQs, 2 short answers), plus the 4 stages and 10 specification notes. Four cards were dropped because they repeat cards in other parts. Five items were fixed in place. The part now has 15 cards, 13 MCQs and 2 short answers, above the PSM floor of 12 cards and 6 MCQs, so no replacements were needed. The MCQ answer positions are unchanged (0: 3, 1: 3, 2: 4, 3: 3).

### Dropped in review

- `psm-c-009` (PSM): dropped. Its "Validation versus testing" compare card repeats c-u3o1-kk10-005, which has the same front and the same contrast, and psm-c-005's mistake note already covers the difference.
- `psm-c-013` (PSM): dropped. "Why is a solution evaluated after it has been in use for a while" repeats c-u4o1-kk08-002 ("When is a solution usually evaluated, and why then?"), which gives the same answer and reason.
- `psm-c-016` (PSM): dropped. "Why generate several design ideas instead of developing the first one?" asks the same question as c-u3o2-kk12-007, almost word for word.
- `psm-c-017` (PSM): dropped. Its internal versus user documentation contrast (who reads each) repeats c-u3o1-kk11-006 row for row. psm-m-011 and psm-m-012 still place documentation in development.

### Held back

- The study design's own names for the activities in each PSM stage (PSM): held back. The wording can't be checked (D-001), so activity names in `stages` are general descriptions (for example "Coding the solution", not "manipulation"). No item asks for a stage's list of activities, how many a stage has, or which activity is *not* in the PSM. Reconcile `stages` with the source first when it is available.
- Moving any activity to a different stage (PSM): held back. Items follow mainstream textbook placement: evaluation criteria in design (psm-c-004, psm-c-010, psm-m-006), validation, testing and internal and user documentation in development (psm-c-005, psm-m-012), and the evaluation strategy in evaluation (psm-c-006, psm-m-010). Part u4o1-b holds back naming these stages, so recheck these items first if the source places an activity elsewhere.
- The listed features of an evaluation strategy (U4O1-KK08): held back. It is a verify entry. The activity summary and specification note say only that a strategy *typically* covers criteria, data and methods, timing and responsibility. psm-m-010 asks only which activity a plan of data, method and timing is, and no item says the strategy must be written before release.
- The contents of an SRS (U3O2-KK09): held back. It is a verify entry. The SRS appears only as the usual place analysis findings are gathered. When the SRS is produced is left to part u3o2-b (m-u3o2-kk09-001, c-u3o2-kk09-002).
- Constraint types (U3O2-KK06): held back. It is a verify entry. Constraints appear only as examples (a fixed budget, a deadline), and no item names or classifies a type.
- Named data collection and ideation techniques (U3O2-KK04, U3O2-KK12): held back. Both are verify entries, so techniques appear only as "for example" or "such as" examples, and no item depends on which techniques the study design lists.
- Beta testing (U4O1-KK07): held back from the PSM items. Textbooks differ on whether it is part of development testing or sits apart from it, so no PSM item places it in a stage.
- Project planning with Gantt charts, logs and journals (U3O2-KK03, U4O1-KK11): held back. No item says which PSM stage planning belongs to, or whether it is part of the PSM.
- Iteration, meaning a return to an earlier stage (PSM): held back. Textbooks present it differently. The only rework covered is debugging within development.
- One identical set of criteria for judging design ideas and the finished solution (U3O2-KK13): held back. No item says whether the two sets of criteria are the same.
- Development models such as agile, waterfall and spiral (PSM): held back. They are out of scope.

### Review fixes (kept items)

- `psm-c-001`: the back said "each stage's documentation feeds the next", which has no meaning for evaluation, the last stage. It now says each stage builds on the work of the one before it.
- `psm-c-002`: "a design is judged against the analysis" is now "design ideas are judged against the requirements found in analysis", and "the code follows the design" is now "the code is built from the detailed design".
- `psm-c-005`: the mistake note said testing checks "the whole solution", although modules are also tested one at a time. It now says testing checks that the solution, including its validation, gives the expected output.
- `psm-m-009`: the key's "it" had no singular antecedent (the stem spoke only of "every module"). The stem now says "every module of a solution", and the key is "Testing checks the solution works; evaluation judges how efficient and effective it is in use", which keeps it no longer than the distractors.
- `psm-s-002`: the prompt began "The Wodonga clinic's practice manager ... Zara's booking program", which made sense only after psm-s-001. It now introduces Zara and the clinic, so it stands alone.

### Checks

- No item in this part has a trace, sort, search, calculation or Gantt figure, so there was nothing to recompute. MCQ keys were checked for a single best answer, and every whyWrong line was checked against the option it explains.
- Organisations are generic and unnamed (an aged care home in Warrnambool, a Geelong hardware store, a Mildura fruit growers' co-operative), so none can match a real business. People are first names only.

## Case study cs-01: Kestrel Bay Freight, ParcelTrack (part cs-01)

- Invented organisation: Kestrel Bay Freight, a Geelong freight company with 480 staff. The insert ends with a line saying the organisation and everyone named are fictional. The insert runs to about 695 words, with 13 questions worth 60 marks and no MCQs. It has four figures: a context diagram, a Gantt chart, an object description and pseudocode.
- Two figures contain a deliberate error, and the insert labels both as drafts. Figure 1 (context diagram) has one convention error, the `delivery_instructions` flow from Customer to Driver (q03). Figure 3 (object description) types `consignmentId` as Integer (q05). Every other element of both figures follows the conventions, so each question has exactly one answer.
- U4O2-KK07 and U3O2-KK10 (verify: which Acts and frameworks). No question names an Act, the Australian Privacy Principles, the Essential Eight or the Information Security Manual, and there is no legislation question. Privacy appears only as an ethical issue (q11) and a security risk (q13).
- U4O2-KK05 (verify: threat modelling steps). q12 asks why to threat model during design and for threats and controls on named flows in Figure 1. It doesn't name, number or order any threat modelling steps.
- U4O2-KK03 (verify: listed vulnerabilities). q13 asks students to find weaknesses in the insert's own description of the environment. It never asks which vulnerabilities the study design lists.
- U4O2-KK06 isn't tagged. q13 asks for weaknesses and controls, not for evaluation criteria, because the criteria would be given as a fixed set.
- U3O2-KK03 (verify: whether slack is named). q04 never names slack or float. It says only that the portal task "still finishes two weeks before it is needed", worked out from the dependencies.
- U4O1-KK08 (verify: features of an evaluation strategy). q09 is tagged U4O1-KK09 only and asks for data collection techniques matched to Kestrel Bay's objectives. It doesn't list the features of a strategy, or say who evaluates or when as required features.
- U3O2-KK04 (verify: data collection techniques) and U3O2-KK06 (verify: constraint types). There is no data collection or constraint question. The q02 mistake note calls the budget "a constraint" without giving a constraint type.
- U3O1-KK04 (verify: data types). Only String, Integer, Floating point and Boolean appear, with no date or time types. U3O1-KK14 (verify: trace tables). q07 uses a test table with the house columns and never mentions a trace table.
- U3O2-KK05. The non-functional examples are the 99.5 per cent availability target (reliability) and the 30-second recording target. The offline store-and-upload feature isn't offered as an example of either kind of requirement, because it could be read either way.
- OOP (q06). Inheritance adds a property and a method in a subclass. Overriding and polymorphism are left out because the KK map doesn't name them.
- PSM stage names are unconfirmed, so no model answer says which PSM stage an activity belongs to.
- Computed answers were checked by running them in node (a direct transcription of Figure 4 and a forward and backward pass over Figure 2):
  - q07: `deliveryCharge(12, 3, FALSE)` = 45.00 (given). `deliveryCharge(30, 1, FALSE)` returns 51.00; the insert's rule (surcharge at 30 kg or more) expects 76.00. `deliveryCharge(40, 2, TRUE)` = (15 + 72 + 25) × 1.5 = 168.00, both expected and actual. The error is on line 11 (`>` should be `≥`), counting lines from 1 with the comment as line 2.
  - q04: the critical path is Analyse requirements and write SRS (3), Design driver app screens (3), Develop driver app (5), Connect mapping service (2), Alpha testing (2), Beta testing at Ballarat depot (2), Train drivers and depot staff (2), then Go-live. That is 19 weeks, with only one critical path, because Design driver app screens (3) is longer than Design database and classes (2). Develop portal and charging module runs from week 5 to week 9 and could finish four weeks later without delaying Alpha testing. With six weeks it ends at week 11, so go-live stays at 19. Adding two weeks to Develop driver app moves go-live to week 21. Security review runs from week 15 to week 16 and doesn't affect go-live.

## Review pass (cs-01)

Every question, figure and computed answer was re-checked. The pseudocode was transcribed and run: `deliveryCharge` gives 45.00, 51.00 against an expected 76.00, and 168.00 against 168.00, and the error is on line 11 of the listing numbered from 1. The Gantt plan was re-scheduled with the repo's `computeSchedule`: 19 weeks and one critical path (t1 t2 t4 t6 t7 t8 t10 m1). With t5 at six weeks it is still 19 weeks, because t5 has 2 weeks of slack left. With t4 at seven weeks it is 21 weeks. Figure 1 was routed with the repo's `routeConnectors`: no label boxes overlap and no lines cross. Question marks total 60, and all four areas are covered.

Drops: none. No KK floor is affected, because case study questions don't count toward floors.

Fixes:
- `cs-01-q06` (U3O1-KK07): The model and marking point said the subclass "inherits every property" of a class whose properties are all private. They now say every ChilledConsignment object has those properties, and that the subclass's methods reach them through the inherited public methods, or protected access could be used.
- `cs-01-q09` (U4O1-KK09): An accepted alternative (timing drivers against the 30-second requirement) measured a requirement, not either of Kestrel Bay's objectives. It is replaced by a customer survey on how customers now find a consignment's status.
- `cs-01-q10` (U4O2-KK02): A marking point cited Tomas's leave, which appears only in q04's scenario and not in the insert. It is removed.
- `cs-01-q11` (U4O2-KK08): The model and marking point said AI-generated code goes live untested. The insert says only that no one reviews code before it goes live, and it mentions a test database. They now say "no one reviews it".
- `cs-01-q12` (U4O2-KK05): The model said enumerating consignment numbers reveals where goods will be delivered, but the portal shows only status and estimated time. That claim is removed. Part 1 now uses the item's command term (describe, not explain). Part 2 now asks for flows between ParcelTrack and an external entity, which rules out the draft's erroneous flow. The model's second flow is now consignment_details (individual accounts, multi-factor authentication, least privilege), so its two controls differ.
- `cs-01-q13` (U4O2-KK10): The example lists now include no version control (a weakness the insert names) and moving the password out of the source code (the matching control).
- `cs-01-q05` (U3O1-KK04): The mistake note is rewritten as a misconception and its correction.
- `parceltrack-context` figure: The delivery_instructions labelAt moves from x 588 to x 580, so the label box ends 31 units from the right edge instead of 23.

Held back:
- Legislation and frameworks: Acts, Australian Privacy Principles, Essential Eight, Information Security Manual (U4O2-KK07, U3O2-KK10): held back. The set of Acts and frameworks is marked verify. Privacy appears only as an ethical issue (q11) and a risk (q13).
- Threat modelling steps, by name or in order (U4O2-KK05): held back. The step list is marked verify. q12 asks only for a benefit of threat modelling early and for threats and controls on named flows.
- Slack or float by name (U3O2-KK03): held back. Whether slack is named is marked verify. q04 reasons from dependencies only.
- Features of an evaluation strategy (U4O1-KK08): held back. The listed features are marked verify. q09 is tagged U4O1-KK09 only.
- Choosing a data collection technique per stakeholder group (U3O2-KK04): held back. The technique list is marked verify.
- Classifying constraints by type (U3O2-KK06): held back. The constraint types are marked verify. The q02 mistake note calls the budget "a constraint" with no type.
- Vulnerabilities "the study design lists" (U4O2-KK03): held back. The list is marked verify. q13 uses only weaknesses described in the insert.
- Date and time data types (U3O1-KK04): held back. The data type list is marked verify. Figure 3 uses String, Integer, Floating point and Boolean only.
- Trace tables (U3O1-KK14): held back. Whether trace tables are named is marked verify. q07 uses a test table only.
- Security evaluation criteria as a question (U4O2-KK06): held back. The case study is at 13 questions, and q13 asks for weaknesses and controls instead.
- Overriding and polymorphism (U3O1-KK07): held back. The KK map doesn't name them.
- Validation (U3O1-KK10, U4O1-KK05) and API change risk (U4O1-KK04): held back to stay within 13 questions.
- Naming the quality of the 30-second recording target (U3O2-KK05): held back. It could be classed as usability or as performance or efficiency, so it is accepted as non-functional without naming its quality. The model uses the 99.5 per cent availability (reliability) example.
- The offline store-and-upload feature as a requirement example (U3O2-KK05): held back. It could be read as functional or as a reliability requirement.
- PSM stage names (PSM): held back. They are unconfirmed, so no model answer assigns an activity to a named stage.
