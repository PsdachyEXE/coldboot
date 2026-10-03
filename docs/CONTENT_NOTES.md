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

## Cross-unit consistency pass

After the units were merged, four finders read all content across units: duplicates and contradictions, every pseudocode listing run through the `deskcheck` interpreter along with every other computed claim, language and conventions, and the unit reviewers' residual concerns. They raised 63 findings. Fixers then worked through them file by file, re-verifying each one before applying it. Most drops below remove area cards that repeated a glossary card's term, so students don't review the same definition twice.

### u3o1

- `c-u3o1-kk01-008` (U3O1-KK01): dropped. Its 'over-reliance on AI-generated code' front and answer duplicate c-u4o2-kk08-002, which already carries U3O1-KK01; c-u3o1-kk01-002 covers the risk angle.
- `c-u3o1-kk02-001` (U3O1-KK02): dropped: duplicates the glossary card t-functional-requirement.
- `c-u3o1-kk02-002` (U3O1-KK02): dropped: duplicates the glossary card t-non-functional-requirement.
- `c-u3o1-kk02-003` (U3O1-KK02): dropped: duplicates the glossary card t-constraint.
- `c-u3o1-kk02-004` (U3O1-KK02): dropped: duplicates the glossary card t-scope (same will/won't answer and mistake note).
- `c-u3o1-kk03-001` (U3O1-KK03): dropped: duplicates the glossary card t-data-dictionary.
- `c-u3o1-kk03-002` (U3O1-KK03): dropped: duplicates the glossary card t-ipo-chart (same input, processing and output content).
- `c-u3o1-kk03-003` (U3O1-KK03): dropped: duplicates the glossary card t-mock-up.
- `c-u3o1-kk03-004` (U3O1-KK03): dropped: duplicates the glossary card t-object-description.
- `c-u3o1-kk05-001` (U3O1-KK05): dropped: duplicates the glossary card t-array.
- `c-u3o1-kk05-003` (U3O1-KK05): dropped: duplicates the glossary card t-record.
- `c-u3o1-kk06-002` (U3O1-KK06): dropped: duplicates the glossary card t-xml.
- `c-u3o1-kk07-001` (U3O1-KK07): dropped: duplicates the glossary card t-class.
- `c-u3o1-kk07-002` (U3O1-KK07): dropped: duplicates the glossary card t-encapsulation.
- `c-u3o1-kk07-004` (U3O1-KK07): dropped: duplicates the glossary card t-generalisation (same Car/Truck to Vehicle example).
- `c-u3o1-kk07-005` (U3O1-KK07): dropped: duplicates the glossary card t-abstraction (mistake note almost word for word).
- `c-u3o1-kk08-006` (U3O1-KK08): dropped: duplicates the glossary card t-control-structure.
- `c-u3o1-kk09-001` (U3O1-KK09): dropped: duplicates the glossary card t-hungarian-notation.
- `c-u3o1-kk09-002` (U3O1-KK09): dropped: duplicates the glossary card t-camel-case.
- `c-u3o1-kk09-003` (U3O1-KK09): dropped: duplicates the glossary card t-snake-case.
- `c-u3o1-kk10-001` (U3O1-KK10): dropped: duplicates the glossary card t-existence-check.
- `c-u3o1-kk10-002` (U3O1-KK10): dropped: duplicates the glossary card t-type-check.
- `c-u3o1-kk10-003` (U3O1-KK10): dropped: duplicates the glossary card t-range-check.
- `c-u3o1-kk11-001` (U3O1-KK11): dropped: duplicates the glossary card t-internal-documentation.
- `c-u3o1-kk13-001` (U3O1-KK13): dropped: duplicates the glossary card t-syntax-error.
- `c-u3o1-kk13-002` (U3O1-KK13): dropped: duplicates the glossary card t-logic-error.
- `c-u3o1-kk13-003` (U3O1-KK13): dropped: duplicates the glossary card t-runtime-error.
- `c-u3o1-kk14-007` (U3O1-KK14): dropped. It teaches the same boundary-value fact, with the same `<` versus `≤` reason, as c-u3o1-kk10-008, which already carries U3O1-KK14.
- `m-u3o1-kk02-001` (U3O1-KK02): dropped. Its stem, key type (a fee calculation) and distractor types repeat m-u3o2-kk05-001. U3O1-KK02 keeps 3 MCQs.

### u3o2

- `c-u3o2-kk03-001` (U3O2-KK03): dropped. Duplicates the glossary card t-critical-path.
- `c-u3o2-kk03-002` (U3O2-KK03): dropped. Duplicates the glossary card t-milestone.
- `c-u3o2-kk03-004` (U3O2-KK03): dropped. 'What does a Gantt chart show?' repeats the back of t-gantt-chart almost word for word.
- `c-u3o2-kk05-001` (U3O2-KK05): dropped. Duplicates the glossary card t-functional-requirement. It was the third reverse card for the term, alongside c-u3o1-kk02-001.
- `c-u3o2-kk05-002` (U3O2-KK05): dropped. Duplicates the glossary card t-non-functional-requirement. It was the third reverse card for the term, alongside c-u3o1-kk02-002.
- `c-u3o2-kk06-001` (U3O2-KK06): dropped. Duplicates the glossary card t-constraint. It was the third reverse card for the term, alongside c-u3o1-kk02-003.
- `c-u3o2-kk06-002` (U3O2-KK06, U3O2-KK05): dropped. 'Constraint versus non-functional requirement' mirrors c-u3o1-kk02-006, which now also carries U3O2-KK06 and U3O2-KK05.
- `c-u3o2-kk07-001` (U3O2-KK07): dropped. Duplicates the glossary card t-scope (and c-u3o1-kk02-004), with the same will/won't answer.
- `c-u3o2-kk07-002` (U3O2-KK07, U4O1-KK10): dropped. A second reverse card for Scope creep that duplicates t-scope-creep. Its mistake note moves to t-scope-creep.
- `c-u3o2-kk08-001` (U3O2-KK08): dropped. Duplicates the glossary card t-context-diagram.
- `c-u3o2-kk08-002` (U3O2-KK08): dropped. Duplicates the glossary card t-data-flow-diagram.
- `c-u3o2-kk08-003` (U3O2-KK08): dropped. Duplicates the glossary card t-use-case-diagram.
- `c-u3o2-kk09-001` (U3O2-KK09): dropped. Duplicates the glossary card t-software-requirements-specification.
- `c-u3o2-kk10-001` (U3O2-KK10): dropped. Duplicates the glossary card t-intellectual-property.
- `c-u3o2-kk13-001` (U3O2-KK13): dropped. Duplicates the glossary card t-efficiency.
- `c-u3o2-kk13-002` (U3O2-KK13): dropped. Duplicates the glossary card t-effectiveness.
- `c-u3o2-kk15-002` (U3O2-KK15): dropped. Duplicates the glossary card t-interoperability.
- `c-u3o2-kk15-003` (U3O2-KK15): dropped. Duplicates the glossary card t-usability, and its 'accurately, quickly' wording mixed efficiency into usability.
- `m-u3o2-kk07-002` (U3O2-KK07): dropped. It told the same story as s-u3o2-kk07-001: a feature the scope explicitly excluded is requested halfway through development and treated as a scope change assessed for time and cost. The short answer tests that reasoning in more depth.

### u4o1

- `c-u4o1-kk01-001` (U4O1-KK01): dropped. It duplicates the glossary card t-user-centred-design; its mistake note moves to t-user-centred-design.
- `c-u4o1-kk04-001` (U4O1-KK04): dropped. It duplicates the glossary card t-api.
- `c-u4o1-kk04-002` (U4O1-KK04): dropped. It duplicates the glossary card t-library.
- `c-u4o1-kk04-003` (U4O1-KK04): dropped. It duplicates the glossary card t-code-repository; its mistake note moves to t-code-repository.
- `c-u4o1-kk06-001` (U4O1-KK06): dropped. It duplicates the glossary card t-alpha-testing.
- `c-u4o1-kk07-001` (U4O1-KK07): dropped. It duplicates the glossary card t-beta-testing; its mistake note moves to t-beta-testing.
- `c-u4o1-kk09-004` (U4O1-KK09): dropped. Its quantitative versus qualitative contrast repeats c-u3o2-kk04-005, which now also carries U4O1-KK09.
- `c-u4o1-kk10-003` (U4O1-KK10): dropped. 'How can a development team control scope creep?' repeats c-u3o2-kk07-007 (record the request, assess time and cost, agree or defer), which already carries U4O1-KK10.
- `c-u4o1-kk10-007` (U4O1-KK10): dropped. Its critical-path cloze repeats c-u3o2-kk03-005, down to 'unless later critical tasks are shortened'.
- `c-u4o1-kk08-004` (U4O1-KK08): dropped. 'Efficiency criterion versus effectiveness criterion' repeats c-u3o2-kk13-003 ('Efficiency versus effectiveness'), which carries U4O1-KK01.
- `c-u4o1-kk08-005` (U4O1-KK08): dropped. The 'criteria should be measurable' cloze repeats c-u3o2-kk13-007, and both use the 'program is fast' example.
- `m-u4o1-kk10-001` (U4O1-KK10): dropped. 'Which situation is an example of scope creep?' is m-u3o2-kk07-001 turned around, with the same personnel-change and technical-issue distractors; m-u3o2-kk07-001 already carries U4O1-KK10.

### u4o2

- `c-u4o2-kk01-001` (U4O2-KK01): dropped. Duplicates the glossary card t-goal.
- `c-u4o2-kk01-002` (U4O2-KK01): dropped. Duplicates the glossary card t-objective.
- `c-u4o2-kk03-001` (U4O2-KK03): dropped. Duplicates the glossary card t-vulnerability.
- `c-u4o2-kk04-005` (U4O2-KK04): dropped. Duplicates the glossary card t-multi-factor-authentication, including its password-plus-PIN mistake note.
- `c-u4o2-kk05-001` (U4O2-KK05): dropped. Duplicates the glossary card t-threat-modelling.

### shared

- `t-*` / `psm-*` / `cs-01-*` (all): none dropped. No id was removed from terms.json, psm.json or cs-01.json. The docs/CONTENT_NOTES.md lines that need updating (docs/ is off-limits to me) are listed under `added`.

## Case study 2: Neilborough Trade College, SignOff (part cs-02)

- Invented organisation: Neilborough Trade College, a private registered training organisation in Bendigo with campuses in Echuca and Swan Hill. SignOff replaces paper apprentice logbooks with an apprentice phone app (built by an external firm, Kilnworth Apps), a supervisor web page, a trainer dashboard that flags apprentices at risk, and a nightly CSV or XML export to a state records system. The insert runs to about 697 words and ends with a line saying the organisation and everyone named are fictional.
- 13 questions worth 60 marks: 1 MCQ and 12 short answers of 3 to 8 marks, covering all four areas. Four figures, none of a kind cs-01 uses: a draft use case diagram, the project plan as a task table (weeks), a draft phone mock-up of the Log a task screen, and pseudocode for `isAtRisk` (arrays indexed from 0) with a deliberate index-out-of-range error.
- Held back as in cs-01: no Act, framework, threat modelling step, trace table, slack, float or constraint type is named, and only the house data type names appear. q13 is the first case study question on U4O2-KK06 (criteria for evaluating security); it builds its criteria from the insert's own weaknesses.

### Review pass (cs-02)

All 13 questions, the 4 figures and every computed answer were checked again. The plan was scheduled with the repo's `computeSchedule` and with a separate Python critical path script. Both give 19 weeks and one critical path, A B D G H K, with G's earliest start at 14. With F at 9 weeks the plan takes 20 weeks and the critical path is A C F G H K. F at 9 weeks plus H at 2 weeks, G at 1 week, or F at 8 weeks each brings the plan back to 19 weeks. `isAtRisk` was traced with the repo's deskcheck interpreter and a separate Python copy. As written, all three tests stop at line 6 with an index out of range error: index 5 in test 1 and index 6 in tests 2 and 3. With line 5 changed to `numWeeks - 1`, the results are TRUE, FALSE and TRUE. Marks total 60. `content-parts.ts check` prints ok.

Drops (the replacements keep the same id, KK, type and marks, because cs-02 has not shipped):
- `cs-02-q01` (U4O2-KK01): dropped and replaced. The MCQ asked which option was one of the objectives, and the insert labels the objectives outright, so reading the insert was enough to answer it. The replacement asks which SignOff feature most directly supports the completion-rate objective. The answer is the at-risk flag, because the insert says trainers don't notice that apprentices have stopped logging tasks until they drop out.
- `cs-02-q04` (U3O2-KK03, U4O1-KK10, U4O1-KK11): dropped and replaced. Parts 1 and 3 copied cs-01-q04 sentence for sentence ("Identify the tasks on the critical path...", "Identify the factor affecting the project plan that this represents... describe how ... should record the change"), and part 2 repeated cs-01's delay to a task off the critical path. The new question has four parts: the earliest start of G, found from the dependencies; the critical path and the planned length; the effect of F growing to 9 weeks on go-live (+1 week) and on the critical path (A C F G H K); and an adjustment that keeps go-live at week 19, with one drawback. Slack and float are still never named.

Fixes:
- Organisation renamed. Greystone College is a real Australian vocational college (ILSC-Greystone College, with a Melbourne campus). A public TAFE in Bendigo with campuses in Castlemaine and Echuca mirrors the real Bendigo TAFE. Quillon is a real app and software company name. The organisation is now Neilborough Trade College, a private registered training organisation in Bendigo with smaller campuses in Echuca and Swan Hill, 420 staff and about 7,000 students (still 3,200 apprentices). The developer is now Kilnworth Apps. Web searches found no business trading under either new name. The title, insert, Figure 2 and every question were updated.
- `cs-02-q02` (U3O2-KK07): statement 4 repeated the insert's scope sentence word for word. It is now "An apprentice can pay their course fees in the apprentice app", which students must recognise from the scope statement as outside the scope even though it is worded like a functional requirement.
- `cs-02-q09`: kk reordered to U4O1-KK09 then U3O2-KK13. Evaluating the solution after go-live and collecting data for it is U4O1 work, and before this change no question had a U4O1 primary KK.
- `cs-02-q11` (U4O2-KK08): the model and marking point said the apprentices weren't asked about the use of their data, but the insert never said so. The insert now says the spreadsheet was emailed "without telling the apprentices", and the answer matches that.

Held back (confirmed): no Act, framework, threat modelling step, trace table, slack or float or constraint type is named. Only house data type names are used. q13 (U4O2-KK06) asks for criteria built from the insert's own weaknesses. KK06 has no verify note, and no listed set of criteria is assumed.

Noted, not changed: the mock-up renderer's `window` element always draws desktop minimise, maximise and close controls, so the phone screen in Figure 3 has them. No question refers to them.

## Games that go further than the holdbacks (law, threat)

- The law game and threat's Essential Eight round teach, at textbook level, which of the Privacy Act 1988 (Cth), the Privacy and Data Protection Act 2014 (Vic), the Health Records Act 2001 (Vic) and the Copyright Act 1968 (Cth) applies to a scenario, including the Privacy Act's $3 million turnover threshold, and they name the eight strategies. That goes further than the U4O2-KK07 and U3O2-KK10 holdbacks above, because the brief asks for these games (`DECISIONS.md` D-148). The study content keeps its holdbacks.
- When the study design can be read (D-001), check both games against it: which Acts and frameworks it names, the ACSC's current name for the Office macro strategy, and any reform of the small business exemption. If the confirmed list drops an Act or the Essential Eight, change or retire the matching scenarios in `src/games/law/` and `src/games/threat/`.
- The threat game's round that orders the threat modelling steps is not built, in line with the U4O2-KK05 holdback; its man page says why.


## Phase 3: case studies 3 and 4, and growth above the floors

Two more case studies, cs-03 and cs-04, were each written by one agent and reviewed by another. Eight growth units then took every KK to at least 6 MCQs and 3 short answers of its own (primary KK), with an emphasis on applied scenarios and the command terms students most often under-answer: explain, justify and recommend. Each growth unit was reviewed item by item against the existing content for its KKs. Reviewers recomputed every trace, schedule and calculation with the repository's own interpreter and scheduling tools. Totals after Phase 3: 441 cards (75 glossary), 349 MCQs, 158 short answers and 4 case studies. The review notes follow.

### cs-03

- Invented organisation: Pardalote Foods, a chilled ready-meal maker with plants in Dandenong South and Ballarat and 760 staff. LotTrail records each ingredient delivery as a lot, links the lots to production batches, and traces a recalled lot to the batches that used it. It then sends recall notices to supermarkets through their supplier portal APIs. The insert runs to about 700 words and ends with a line saying the organisation and everyone named are fictional.
- 13 questions worth 60 marks: 2 MCQs and 11 short answers covering all four areas (U3O1 18 marks, U3O2 9, U4O1 15, U4O2 18). There are three figures: a draft DFD with one deliberate convention error (a flow from data store D1 straight to D2), a draft data dictionary with three data types left as `?`, and a draft mock-up of a line dashboard that ranks workers by name. cs-01 and cs-02 used neither a DFD nor a data dictionary, and this case study has no Gantt chart or pseudocode.

### Review pass (cs-03)

The author's run was cut off by a session limit, so no author report survives. All 13 questions and the 3 figures were reviewed as the file stood.

Checks:
- The binary search figures in q06 were recomputed with the repo's `binaryWorstCase` and `binarySearchTrace` (`src/games/search/algorithms.ts`) over all 120 000 positions. A binary search makes at most 17 comparisons and a linear search up to 120 000. Fixed-width lot numbers (`L0048213`) sort the same way as text and as numbers, so a binary search on them is valid.
- q07: with the rule "reject if warmer than 5.0 °C", 4.9 and 5.0 are accepted and 5.1 is rejected. With a `≥` bug, only the 5.0 test changes result.
- q04: 5.3 stored as an Integer becomes 5 whether it is truncated or rounded, so a delivery at 5.3 °C passes the 5.0 check. `0371` converts to 371.
- q05: five of the seven field names in Figure 2 are plain camel case (lotNumber, supplierCode, arrivalTemp, storageArea, isRejected).
- Figures 1 and 3 were rendered with the repo's `FigureView`. No labels overlap, and every element sits inside the 24-unit margin.
- Marks total 60. `content-parts.ts check` prints ok.

Drops: none. Every item had a defensible core, so the problems were fixed in place.

Fixes:
- System renamed. "LotLedger" is a registered US trademark for database management software (filed 2025), so the system is now LotTrail, and the Figure 1 id is now `lottrail-dfd`. Web searches found no product or business called LotTrail, and none called Pardalote Foods. Pardalote Press, a real Tasmanian publisher, is a different name.
- Insert and Figure 1: the insert said supervisors scan the lot labels, but the dashboard (Figure 3, q12) ranks each line worker by the times they scan. Line workers now scan each ingredient's lot label as they add it to a batch, and the DFD entity is now Line worker. The Figure 1 caption now says "Printing product labels isn't shown yet", because the lot label is shown. The dashboard's scan rates, which were over 200 an hour, now fit 18 batches a shift (12 to 31 an hour).
- Insert: it now says Graham hasn't told the line workers about the dashboard. The q12 model and marking point relied on this, but the insert never said it.
- `cs-03-q01` (U4O2-KK01): the key was the longest option. The options have been rebalanced (70 to 74 characters), and "batch labels" is now "the labels for every batch" to match the insert's product labels. The item differs from m-u4o2-kk01-001, whose distractors are all goals: here the distractors are a goal, a functional requirement and a project constraint.
- `cs-03-q02` (U3O2-KK04): the marking point and model mentioned checking a supplier's docket, which the insert never describes. They now use the insert's paper form and probing.
- `cs-03-q03` (U3O2-KK08): the prompt said Figure 1 leaves out "one part" of LotTrail, but it leaves out two (product labels and recall notices). The prompt now names the recall notices directly. The second marking point now also accepts a new process (such as 4 Send recall notices) between process 3 and Supermarket. The model now reads "line workers", and a dangling "which arrive" is fixed.
- `cs-03-q05` (U3O1-KK09): marking points 5 and 6 both credited field names versus column numbers, so they weren't discrete. They now credit the String conversion cost and named access to fields separately. The examples used arrivalTemp and isRejected, whose types Figure 2 leaves as `?`, so they now use only the types Figure 2 gives (lotNumber String, quantity_kg Floating point, storageArea Character).
- `cs-03-q08` (U4O1-KK04): the key was the longest option. Two distractors were implausible: that an API can't be switched off, and asking for the chain's source code. They are now asking the chain to keep the old version running, and emailing recall notices by hand. The key is shorter than two of the distractors, and difficulty is now 2. The item differs from m-u4o1-kk04-002, which is about a fee and a choice of provider; this one is about moving to a new API version before a known switch-off.
- `cs-03-q09` (U4O1-KK01): "no batch record is missing or unreadable" overclaimed, and it now reads "batch records are no longer lost or unreadable". The mistake note said that doing a task faster never improves effectiveness. Textbooks differ on timeliness (see the t-effectiveness holdback), so the note now says only to apply each quality to the scenario separately.
- `cs-03-q10` (U4O1-KK10): part 3 ("Describe how Harriet should record this change") repeated the recording sub-question of cs-01-q04, the same structure the cs-02 reviewer removed. It now asks how updating the plan in project management software helps Harriet manage the change's effect, because dependent tasks move and the team shares one plan. Marks are unchanged.
- `cs-03-q11` (U4O2-KK05): the control said no one could ever change a saved batch record, which leaves no way to correct errors. It now lets only a few named quality staff correct records, using multi-factor authentication. It also reads "line workers" to match the insert.
- `cs-03-q13` (U4O2-KK10): the prompt said Imogen's budget covered only two fixes, but removing a public link costs nothing. It is now framed as advising Harriet which weaknesses to deal with first. The likelihood-and-impact prioritisation keeps it distinct from cs-01-q13 and cs-02-q12.

Held back (confirmed):
- No Act, framework, threat modelling step, trace table, slack or float, constraint type or development model is named. q07 never uses the word "boundary". Only house data type names are used (String, Floating point, Character, Boolean).
- U3O2-KK04 (verify: the list of techniques). q02 accepts any suitable technique justified from the group's features, with interviews, observation and surveys given only as examples. Nothing depends on which techniques the study design lists.
- U4O2-KK05 (verify: the steps). q11 uses a DFD to find threats and prioritises by likelihood and impact (q13). It never names, numbers or orders the steps.
- U4O2-KK08. q12's issue is data collected for food safety being reused to rank named workers, without telling them, on a public screen. This follows the KK's "exposed personal data" example; algorithmic bias and automation's effect on jobs stay held back.

Noted, not changed: q01, q08 and the U3O2-KK04 short answer follow common exam patterns that also appear in bank items (m-u4o2-kk01-001, m-u4o1-kk04-002, s-u3o2-kk04-001). Each was checked. The scenario, the distractors and the key reasoning differ, so none repeats a bank item.

### cs-04

All 13 questions (60 marks), the insert and the 3 figures were reviewed. `content-parts.ts check` prints ok.

### Drops

- None. No question was dropped. Two questions that repeated existing content (q08 part 1, q11) were rewritten in place, keeping their KKs, command terms and marks. cs-04 hasn't shipped, so they keep their ids.

### Fixes

- `cs-04-q01` (U3O2-KK01): The problem marking points accepted the insurer's new history requirement as a *problem*. c-u3o2-kk01-002 and s-u3o2-kk01-002 teach that a new obligation is a *need*, and the insert never says the paper records fail. The points now accept only the overdue-hire problem. The mistake note says the insurer's requirement is a need. "Nothing is going wrong with phone bookings" is now "phone bookings still work".
- `cs-04-q02` (U3O2-KK08): The mistake note repeated s-u3o2-kk08-002's note ("not how important the step is"). It now teaches arrow direction: changing the label isn't enough, because <<includes>> points from the base and <<extends>> points to the base. This matches c-u3o2-kk08-008.
- `cs-04-q03` (U3O1-KK05): The key was the longest option (94 characters against 93). The options were reworded to 84, 82, 88 and 92 characters. The key is unchanged (index 2), and every whyWrong line still holds.
- `cs-04-q07` (U4O1-KK06): The breakpoint marking point now accepts any breakpoint after `expectedHours` is calculated, not only one on the comparison line.
- `cs-04-q08` (U3O2-KK03): Part 1 ("explain why *Alpha testing* can't start until the end of week 12") asked the same thing as cs-02-q04 part 1, also about Alpha testing (G). It now asks why the go-live milestone J has no duration and in which week J is planned (end of week 16, A B D G H). Part 2 (the training dependency) is unchanged. The mistake note now covers the dependency change.
- `cs-04-q09` (U4O1-KK12): "No spare time was built in before go-live" could be read as spare time before the 1 July 2027 deadline, which the insert doesn't place in weeks. It now says the plan left no spare time for delays to tasks on the critical path.
- `cs-04-q11` (U4O2-KK05): The threat, the control and the test repeated m-u4o2-kk05-004 (Spadefoot Ticketing) almost exactly: change a sequential number in the web address, check ownership on the server, then request another test customer's record and confirm it is refused. The threat is now a password-only trade portal login: someone who learns or guesses a trade customer's password books an excavator for pick-up. The likelihood and impact are justified from the insert. The control is multi-factor authentication, or a code that confirms each booking. Kirra tests it with a test account by entering only the password. U4O2-KK04 was added as a tag.
- `cs-04-q12` (U4O2-KK06) and the insert: Criterion B ("no real customer information is used in development or testing") could be judged only for the test database, because the insert didn't describe the development data. The insert line now says "The development and test databases hold only made-up customers and items that Kirra created", and the q12 marking point and model match it. The insert is now 701 words.
- `cs-04-q13` (U4O2-KK08): The second issue now accepts accountability (no one can be held responsible for unrecorded use) as well as honesty.

### Held back

- Threat modelling steps, by name, number or order (U4O2-KK05): held back. q11 asks only for likelihood and impact, a control, and a test of the control.
- Slack or float by name (U3O2-KK03): held back. q08 and q09 say only that training "had two weeks to spare", and q09 says that a delay to a task off the critical path didn't move go-live. No item computes how far a task could slip.
- Contingency as a term (U4O1-KK10): held back. q09 says "spare time".
- Acts, the Australian Privacy Principles, the Essential Eight and the ISM (U3O2-KK10, U4O2-KK07): held back. None is named.
- Vulnerabilities "the study design lists" (U4O2-KK03): held back. q12 uses only the weaknesses in Joel's notes and three criteria given in the prompt.
- Trace tables (U3O1-KK14): held back. q07 uses a test table with the house columns.
- The insurer's requirement as a problem (U3O2-KK01): held back. It is a need, as described under Fixes.

### Checks

- `isSafeToHire` (q05 model) was run in the repo's deskcheck interpreter. (TRUE, 180.5, 250, 8) gives TRUE (180.5 + 64 = 244.5). (TRUE, 180.5, 250, 9) gives FALSE (252.5). (FALSE, 20.0, 250, 2) gives FALSE. 234 + 16 = 250 gives FALSE, which shows the strict `<`. The q07 bug (`days + 8`) gives TRUE, TRUE and FALSE for tests 1 to 3, which matches the Actual output column, and `expectedHours` is 17 for test 3.
- Figure 2 was scheduled with the repo's `computeSchedule`:
  - The plan takes 16 weeks, with one critical path, A B D G H J. D finishes at week 12, E at week 10, and I has 2 weeks to spare.
  - With I depending on H, the plan takes 18 weeks, and the path is A B D G H I J.
  - With actual durations (D 9, F 7), go-live is at week 19. F finishes at week 13, and G and H run in weeks 16 to 19.
- q06: the range for a 3-day hire from 1180.5 is 1180.5 to 1252.5. The mistyped 1210.5 (for 1201.5) is inside it, 9 hours too high. Q5's 180.5 hours since service is consistent with Q6's reading if the last service was at 1000.0.
- Figure 1 was laid out with the repo's `wrapText` and `routeConnectors`:
  - Every label fits inside its ellipse.
  - No line crosses a use case or an actor.
  - The two <<extends>> labels overlap nothing.
  - Every element is within the 24-unit margin.
  - The gaps between *Book item online*, *View current and past hires* and *Pay invoice online* are 19 units. That is in line with cs-02's 16 units, and none of these links carries a label.
- Names: web searches found no business called "Tarwin Valley Hire" (the Tarwin Valley Landcare group and Tarwin Valley Primary School are not hire businesses) and no software called "PlantPass". "Tarwin" appears elsewhere in the content only as a place name (Tarwin Community Transport, Tarwin Tide Egg Farm).
- Marks total 60 over 13 questions (1 MCQ and 12 short answers). Every short answer's marking points reach its marks. All four areas are covered.

### g-u3o1-a

All 23 items (16 MCQs, 7 short answers) were reviewed. `content-parts.ts check` prints ok. Counting primary items, KK01 has 7 MCQs and 3 short answers, and KK02 to KK07 each have 6 MCQs and 3 short answers.

### Drops

- None. Every item had a defensible core, so the weak points were fixed in place. No ids changed.

### Fixes

- `m-u3o1-kk02-005` (U3O1-KK02): R5 said only when the shop keeps the deposit, so the key's refund rested on an unstated rule. R5 now says that a customer who cancels at least 24 hours ahead gets the deposit back, and otherwise the shop keeps it. The explanation and the whyWrong line for option C match.
- `m-u3o1-kk03-006` (U3O1-KK03): Distractors B (postcode "should be an Integer") and D (membership number "should be an Integer") didn't answer the stem, which asks which size would reject or cut short correct data. Students could rule them out on their framing alone. Both are now size claims that fail on counting: a String of size 4 "would drop a leading zero" (Strings keep every character), and 6 characters "can't hold two letters and four digits" (CC0427 is exactly 6). The key and its position are unchanged.
- `m-u3o1-kk06-006` (U3O1-KK06): Member 1043, surname Tran, echoed m-u3o1-kk06-004 (1042 Tran, 1043 Wilson) and c-u3o1-kk06-007 (1042 Tran). The member is now 2087 Haddad of a Kyneton bowls club. Every option and whyWrong line still holds.
- `m-u3o1-kk07-005` (U3O1-KK07): The `Member` and `JuniorMember` classes repeated the class pair in m-u3o1-kk07-003. The classes are now `LibraryItem` (itemID, title, onLoan; getTitle(), recordLoan(memberID)) and its subclass `AudioBook` (narrator, lengthMinutes; getNarrator()), in a Shepparton library's loans program. The key (index 3, all five properties and both classes' methods) is unchanged.
- `m-u3o1-kk01-007` (U3O1-KK01): The explanation implied that only AI-generated code needs test data that combines rules. It now says that test data for generated code must cover each combination of the rules, not just each rule on its own.
- `m-u3o1-kk02-006` (U3O1-KK02): The explanation ("the butcher can't approve an order that hasn't been submitted") was elliptical. It now says that requirement 2 needs approval between submission and payment, and requirement 3 leaves no time for it.
- `s-u3o1-kk01-003` (U3O1-KK01): Marking point 4 bundled three ideas: a fair set-up, data set size, and the decision rule. The speed points are now discrete: time both functions on the same records (fair comparison), and use a large data set because a difference may not show with a few records. The model matches.
- `s-u3o1-kk03-003` (U3O1-KK03): The figure's column was headed "Size or format", but `qtyOnHand` held a range (0 to 9999), which the alternative marking point relies on. The column is now "Size, format or range".

### Held back

- Which design tools, data types or data structures the study design lists (U3O1-KK03, KK04, KK05): held back. These are verify entries. No item asks which tool or type is, or isn't, listed. Types are limited to Integer, Floating point, String, Character and Boolean, and structures to one-dimensional arrays, two-dimensional arrays and records.
- Trace tables (U3O1-KK14): held back. The trace items ask only for the output or the final array contents.
- Real AI products, and policy or law on AI-generated code (U3O1-KK01): held back. The AI items cover prompting for a diagnosis, judging an optimisation, and testing generated code.
- Polymorphism and overriding (U3O1-KK07): held back. m-u3o1-kk07-005 covers inheriting properties and public methods only.

### Checks

- Every listing was run through `src/games/deskcheck/interpreter.ts`:
  - `bagsLoaded`: both versions give 1140 for [30, 25, 40], as well as 120, 0 and 84 for other inputs.
  - `ticketPrice`: 14.4 (member on a Tuesday), 16.0, 18.0 and 20.
  - The innings average displays 11.75.
  - The rain array, indexed from 1, displays `Gauge 2, week 3`.
  - The restock array ends as [12, 20, 7, 23, 20].
- Line references in the explanations were rechecked: line 6 of the AI's `bagsLoaded`, lines 4 and 7 of `ticketPrice`, and lines 7 and 8 of the innings listing.
- No key is strictly the longest option. Every KK's MCQ set includes a difficulty 3, and answer positions are spread within each KK.
- Web searches found no business trading as Paperbark Picture House, Lyrebird Lane Gelato, Flourmill Row Bakery, Blackwood Hollow Wildlife Park, Merri Bend Couriers, Wimmera Wave Swim School or Tallarook Reach Rowing Club.
- Noted, not changed: m-u3o1-kk04-005 (an average of Integers needs Floating point) teaches the same point as sibling m-u4o1-kk02-006 (`avgKg`). The skills differ: this item traces `/` in pseudocode, and the sibling corrects a data dictionary. No repo item makes the point yet, so both are kept.

### g-u3o1-b

All 25 items (18 MCQs, 7 short answers) were reviewed against the existing MCQs, short answers and cards for U3O1-KK08 to KK14, the glossary cards tagged with these KKs, and the other parts in this directory. `content-parts.ts check` prints ok.

### Drops

- None. No item was dropped. Every KK still has at least 6 MCQs and 3 short answers with it as the primary KK.

### Fixes

- `m-u3o1-kk08-005` (U3O1-KK08): The whyWrong line for 5 said the inner loop shows "several" matches on each pass. On the last pass (home = 5) it shows one, so the line now says "one or more".
- `m-u3o1-kk10-006` (U3O1-KK10): The explanation said the upper limit should be raised to "an age no volunteer could reach, such as 120". It now says "well above any real volunteer's age, such as 120", so every valid age is accepted and typing mistakes such as 830 are still rejected.
- `m-u3o1-kk11-005` (U3O1-KK11): In a stocktake program, the key ("the count module rounds each value to cents before totalling the values") didn't say which values it meant. It now reads "Why the report module rounds each stock value to cents before adding them up", and the explanation matches. At 76 characters it ties the longest distractor, so the key is still not the only longest option.
- `m-u3o1-kk13-005` (U3O1-KK13): The scenario was a "Sale community radio station", and fault 2 is about the "daily sales summary", so the town name could be read as the word "sale". The station is now in Seymour.
- `m-u3o1-kk14-007` (U3O1-KK14): The whyWrong line for option 1 said "the output has four lines", but the program displays five: four debugging lines and the order total. It now says "Line 6 displays four lines".

### Checks

- Every listing was run through the repo's `src/games/deskcheck/interpreter.ts`:
  - The netball fixtures list 15 matches. Starting the inner loop at `home` gives 20, and running it from 1 gives 30.
  - The ride time displays `2 h 15 min`.
  - `middleScore([8, 6, 9, 5, 7], 5)` returns 9.
  - `findCode([315, 742, 108, 742, 560], 742)` returns 3.
  - `findBay(bays, "YPL900")` stops at line 3 with an index out of range error when `i` is 3. A registration that is present returns its index.
  - `rewardLevel` returns Silver for 500, 999, 1000 and 1250, and Bronze for 0 and 499.
  - The debugging output shows totals of 12, 8, 15 and 5. With `total ← total + prices[i]` it shows 12, 20, 35 and 40.
  - `weeksToTarget` returns 0 for (900, 50, 800) and for (800, 50, 800), and 4 for (620, 50, 800).
  - `sessionFee` returns 12, 15, 22 and 17.6 for (15, TRUE), (15, FALSE), (16, FALSE) and (16, TRUE).
  - `binarySearch` on the unsorted `regos` returns −1 for 377. It compares 164, 341 and 452. On the sorted array it returns 5.
  - `totalRainfall` returns 26, and 35 with `TO n`.
- Calculations:
  - Selection sort makes n(n − 1)/2 comparisons: 1 999 000 for 2 000 records and 7 998 000 for 4 000.
  - A binary search of 30 000 records needs at most 15 comparisons (2^14 = 16 384 ≤ 30 000 < 2^15).
  - In the squash test table, each member's actual output is 25% of the full fee.
- Every line number in the stems, explanations, whyWrong lines, marking points and models was checked against the listings.
- No key is the only longest option. Keys tie for longest only where every option is a number or a reordering of the same three words. Answer positions vary within each KK, and each KK has a new difficulty 3 item.
- Marking points add up to at least the marks for every short answer, and each model earns full marks within the scenario.
- No organisation is named. Each scenario names a town and a kind of business only, and people have first names only.

### Held back (confirmed in this part)

- Trace tables, boundary, extreme and exceptional test data by name (U3O1-KK14): held back. s-u3o1-kk14-003 asks for the last element, the first element and a target that isn't there, and names no category.
- Which language features the study design lists (U3O1-KK08): held back. m-u3o1-kk08-007 tests only the difference between a function and a procedure.
- Overflow, try/catch, Big O, bubble and insertion sort, "conditional operator", Pascal case, and format, length or lookup checks: none appears.

### g-u3o2-a

All 27 items (19 MCQs, 8 short answers) were reviewed against the existing items for the same KKs. `content-parts.ts check` prints ok. Counting primary items, KK01 to KK07 each have 6 MCQs and 3 short answers, and KK08 has 8 MCQs and 3 short answers.

### Drops

- `m-u3o2-kk03-006` (U3O2-KK03): dropped. It asked for how many days *Code reports module* could be delayed without delaying the handover. That is a slack calculation in all but name, and the U3O2-KK03 holdback (slack is a verify entry) says no item names, defines or calculates slack; items may ask only whether a stated delay moves the finish. Replaced by `m-u3o2-kk03-007` on the same chart and at the same difficulty (3). The replacement asks for the new minimum time when *Design database* can't start until *Design screens* has finished: 28 days, with distractors of 24, 30 and 35 days. It tests sequencing and dependencies, and no existing item changes a dependency.

### Fixes

- `s-u3o2-kk03-003` (U3O2-KK03): the Ribbonwood Ferries Gantt copied m-u4o1-kk10-002's Saltbush Solar plan task for task (4, 5, 3, 8 and 6 days, then 4 to integrate, with the same dependencies). The new plan is Gather requirements 4 → Design ticket screens 3 → Code ticket screens 7, and Design fares database 2 → Code fares database 5, both into Integrate and test 3 → Staff training 2 → Go live. The options are now *Code fares database* 5 → 2 days and *Code ticket screens* 7 → 3 days. The teaching point is unchanged: Option 2 saves 3 days, not 4, because the fares database chain (16 days) becomes critical. The points, model and mistake note now match.
- `m-u3o2-kk01-006` (U3O2-KK01): the Kyneton bakery with misheard phone orders repeated m-u3o2-kk01-001 (a Castlemaine bakery with misread phone orders). The item now uses two florists. Kyneton loses paper order slips, so some bouquets are never made. The option and the two whyWrong lines that named phone orders now match the florists.
- `m-u3o2-kk03-005` (U3O2-KK03): the explanation said "the chains through Design screens and through Interview instructors each total 22 days". The chain through both totals 20. It now says which task replaces which.
- `s-u3o2-kk04-003` (U3O2-KK04): a library service surveying its members with closed questions and an open question sat beside m-u3o2-kk04-004, also a library survey of members about open and closed questions. The scenario is now a cycling association with six member clubs and about 4500 riders. The points, model and mistake note now match.
- `m-u3o2-kk05-005` (U3O2-KK05): the food relief charity with volunteers, "two laptops and volunteers' phones" and a two-minute target for a new volunteer echoed s-u3o2-kk05-001 (Wirra Community Pantry). It is now an animal shelter intake form, with new options and whyWrong lines. The key and its position are unchanged.
- `m-u3o2-kk07-007` (U3O2-KK07): a café ordering app with a scope dispute at handover sat beside m-u3o2-kk07-004 (Gumleaf Café ordering app, scope dispute at evaluation). It is now a Warburton guesthouse whose scope says only *The app will manage bookings*, and the owner expected card deposits and feedback surveys. The first distractor was lengthened so the key isn't the longest option.
- `m-u3o2-kk08-006` (U3O2-KK08): two distractors repeated m-u3o2-kk08-004's ("*Trainer* should be inside the boundary because trainers are staff" and "associations need data labels"). They are now "*Payment service* should sit inside the boundary, because the app depends on it" and "Use case names such as *Book class* should be nouns, like the labels on data flows". The key is unchanged.
- `m-u3o2-kk08-007` (U3O2-KK08): the key read "A use case diagram, as it shows ...", while every distractor read "because it shows". It now uses "because" too, at 74 characters against 75, 75 and 73.
- Names: "Wirilda" was a real Victorian nursery (the 'Wirilda' rhododendron nursery at Toolangi), so `s-u3o2-kk01-003` now uses Hollowgum Native Nursery. "Quartz Hill" is a Californian town with hardware stores, so `m-u3o2-kk04-005` now uses Ironstone Gully Hardware.

### Held back

- Slack or float, by name or by calculation (U3O2-KK03): held back. Nothing in this part asks how far a task could slip. The Gantt items ask for the critical path, the effect of a dependency change, and the effect of shortening one of two tasks.
- Which data collection techniques or constraint types the study design lists (U3O2-KK04, U3O2-KK06): held back. Items use only interviews, surveys and observation, and only economic, technical and legal constraints. None asks which technique or type is or isn't listed.
- Named Acts (U3O2-KK06, U3O2-KK10): held back. The photo copyright MCQ (`m-u3o2-kk06-005`) names no Act.
- Non-functional qualities beyond reliability, usability and portability (U3O2-KK05): held back.

### Checks

- Gantt answers were recomputed with the repo's `computeSchedule`:
  - Riding school: 24 days, with critical path Survey parents → Write SRS → SRS approved → Design database → Code booking module → Test program → Handover. The m-u3o2-kk03-005 distractor chains total 22, 22 and 21 days. With *Design database* after *Design screens*, the plan takes 28 days, and *Design screens* joins the critical path.
  - Ribbonwood: 19 days. Option 1 leaves it at 19, and Option 2 gives 16, with the critical path moving to A C E F G.
- The four diagrams (canteen DFD, gym use case, athletics context diagram, campground DFD) were laid out with the renderer's own shapes and routed with `routeConnectors`. No labels overlap, no lines cross or pass through shapes, every gap is at least 40 units, and everything sits inside the 24-unit margin.
- No key is strictly the longest option. In m-u3o2-kk03-007, all four options are "N days".
- Answer positions vary within every KK. Every short answer's points reach its marks.
- No "slack", "float", VCAA or examiner claim, development model or US spelling appears.
- No id clashes with the repo or the other p3 parts. The dropped id m-u3o2-kk03-006 must not be reused.
- Web searches found no business trading as Hollowgum Native Nursery, Ironstone Gully Hardware, Wagtail Party Hire, Blue Tongue Bushwalking Club, Greenhood Tennis Club, Yellow Robin Community Garden or Ribbonwood Ferries, and no campground called Grey Box Flat.
- Noted, not changed: no U3O2-KK05 MCQ, existing or new, is difficulty 3. Each item's difficulty is rated honestly.

### g-u3o2-b

All 25 items were reviewed (17 MCQs, 8 short answers). One MCQ was dropped and replaced, and five items were fixed in place. Counting primary-KK items only, KK09 has 7 MCQs and 3 short answers; KK10 to KK16 each have 6 and 3.

### Dropped

- `m-u3o2-kk15-005` (U3O2-KK15): dropped. It repeated m-u3o2-kk15-001: the same four options (portability, interoperability, affordance, security) and the same answer, interoperability. Its scenario, staff retyping app data into an existing scheduling program, also repeated the interoperability half of s-u3o2-kk15-001. It is replaced by m-u3o2-kk15-007, which asks students to tell usability from affordance and interoperability. Testers find every control easy to recognise, but the task takes nine screens and asks for the same details twice.

### Fixed in place

- `s-u3o2-kk10-003` (U3O2-KK10): "routes and times of their runs" could mean run durations, but the risk argument (when a member is away from home) needs the time of day. The app now records each run's start time, the leaderboard ranks members by distance, and the model and marking points refer to start times. The Australian Privacy Principles are no longer part of the marking point, so the mark doesn't depend on naming them. The model still mentions them, as m-u3o2-kk10-003 does.
- `s-u3o2-kk14-003` (U3O2-KK14): renamed "Bogong Hollow Ski Hire" to "Snowgrass Gap Ski Hire". A real Bogong Ski Centre hires out skis in Tawonga South, Mount Beauty.
- `s-u3o2-kk16-003` (U3O2-KK16): in the redesign, Clear had also moved from beside Submit to the far left. That was a third change, and the marking points credit only alignment and contrast, so Clear now sits beside Submit as it did on the old screen.
- `m-u3o2-kk14-006` (U3O2-KK14): renamed "Dollarbird Bend Caravan Park" to "Dollarbird Flat Caravan Park". The old name was a near-copy of "Blackbox Bend Caravan Park" in m-u3o2-kk09-004.
- `m-u3o2-kk13-005` (U3O2-KK13): the key "All fees in a sample including siblings match fees worked out by hand" read ambiguously. It now reads "Every fee in a sample that includes siblings matches a hand calculation", and the explanation was reworded to match.

### Kept after checking

- `s-u3o2-kk09-003` asks the same question as the card c-u3o2-kk09-005 (why the client approves the SRS before design). It was kept as scenario practice, as s-u3o2-kk12-002 sits beside c-u3o2-kk12-007.
- `m-u3o2-kk12-005` shares the "only one idea" theme with s-u3o2-kk12-002. It was kept because its key also tests that sketches are quick and rough, and that detail comes later.
- `s-u3o2-kk16-003` shares the destructive-button contrast idea with m-u3o2-kk16-004. It was kept because KK16 items are limited to alignment, contrast and consistency, and here the task is to justify a redesign from a mock-up.

### Checks

- `m-u3o2-kk14-005` was run through the repo's deskcheck interpreter (arrays from 0). It displays 3. With `≥` on line 7 it displays 4, and without lines 14 to 16 it displays 2, so the distractors and the line numbers in the whyWrong lines are right.
- `m-u3o2-kk14-006`: 3 nights × 45.00 = 135.00, less 10% = 121.50.
- `s-u3o2-kk11-003`: a weeknight window from 6 pm to 8 am is 14 hours. A full backup of about 20 hours fits from Friday 6 pm (finishing about Saturday 2 pm). Incrementals on Monday to Thursday nights, plus the Friday full backup, cover every working day.
- The mock-up coordinates in s-u3o2-kk14-003, s-u3o2-kk15-003 and s-u3o2-kk16-003 are inside the 24-unit margin. Notes render as numbered callouts listed below the drawing.
- Web searches found no real business trading under the invented names. The one exception was Bogong Hollow Ski Hire, renamed above. Toolleen Wildlife Rescue and Snowgrass Gap Ski Hire were checked before use.
- No item names an Act as applying to a scenario, relies on a listed set of SRS contents, ideation techniques or design principles, or uses slack, float or a development model.

### g-u4o1-a

All 24 items (18 MCQs, 6 short answers) were reviewed. `content-parts.ts check` prints ok. Counting primary items, each of U4O1-KK01 to KK06 has 7 MCQs and 3 short answers.

### Drops

- None. Every item had a defensible core, so the weak points were fixed in place. No ids changed.

### Fixes

- `s-u4o1-kk01-003` (U4O1-KK01): The scenario repeated s-u4o1-kk01-001: a manager commissions the app, retiree volunteers use it, and the first marking point was "the volunteers, not the manager, will use it". The animal-shelter intake setting also repeated m-u3o2-kk05-005 in part g-u3o2-a. The task is now a check-in app for volunteers at the gate of the Cherry Ballart Farmers' Market in Alexandra, with a queue of vans waiting and volunteers who work only once a month. The question is the same (justify a first week of observation and paper mock-ups, which the coordinator thinks wastes time). It still has 3 marks and 3 points, and the model is rewritten to match.
- `m-u4o1-kk01-006` (U4O1-KK01): Workers in chemical gloves who couldn't tap small buttons repeated m-u4o1-kk07-005 in part g-u4o1-b (gloves in a freezer room, "buttons too small to tap with a gloved finger"). The second problem is now patchy mobile coverage, so sprays recorded out of range are never saved. The explanation and the whyWrong lines for options B and C now refer to both problems. The key and its position are unchanged.
- `s-u4o1-kk06-003` (U4O1-KK06): Full marks needed a point for removing the debugging output statements after the fix, which isn't part of what the question asks (how to find the module with the error). The points are now: an output statement after `readPicks`, an output statement after `calculatePay`, the hand-worked values to compare with, and the first differing value identifying the module. The model no longer ends with the removal step.
- `s-u4o1-kk05-003` (U4O1-KK05): The mock-up heading now starts at x 96, in line with the labels. It used to start at x 200.

### Held back

- Which data types, data structures, language features or validation checks the study design lists (U3O1-KK04, KK05, KK08): held back. These are verify entries or overlap them. Types are limited to Integer, Floating point, String and Boolean. Structures are limited to one-dimensional and two-dimensional arrays and arrays of records. Checks are limited to existence, type and range.
- Trace tables (U3O1-KK14): held back. The breakpoint table in m-u4o1-kk06-005 is titled "Values at each pause on line 6".
- File operations in pseudocode: held back. docs/PSEUDOCODE.md has no syntax for them, so s-u4o1-kk03-003 is in prose. Its scenario states that the program stopped with an error, so the item doesn't depend on any one language's behaviour.
- Integration testing as a named term (U4O1-KK06): held back. m-u4o1-kk06-006 says only that modules must also be tested together.

### Checks

- Every listing was run through `src/games/deskcheck/interpreter.ts`:
  - `hireCost(45, 8)` gives 312 and `hireCost(8, 45)` gives 315. The distractors are 352 = (45 − 1) × 8 and 360 = 45 × 8.
  - With `wind` holding 48 readings, indexed from 0: `47 TO 42 STEP -1` displays indexes 47 down to 42. `42 TO 47` displays the same six, oldest first. `48 TO 43 STEP -1` stops with index 48 out of range. `47 TO 41 STEP -1` displays seven readings.
  - `nightlyCharge([12, 34, 8])` returns 95, and line 6 runs twice. At the pauses, `i` and `total` are 1 and 50, then 2 and 85. With line 5 changed to `IF weights[i] > 30 THEN`, it returns 85.
- The Bilby Burrow conditions were tested for 0 to 45 children in each room. Only the key matches the rules: the other options mismatch 25, 35 and 30 of the 92 cases. Each whyWrong example (25 and 5 in the small room, 40 in the large room, 20 in each room) behaves as the line says.
- The Silvereye CSV lines rejected are 2, 3, 5 and 6. 18462.5 ÷ 640 = 28.85 to two decimal places, and 28.8 to one.
- `yields[1][2]` is 29. `yields[2][1]` is 53, `yields[2][3]` is 46, and row 3 doesn't exist.
- Nankeen: 1250 × 1.1 = 1375, against 12.50 × 1.1 = 13.75. Ghost Crab: requesting every 30 minutes uses 48 of the 1000 requests a day.
- Short-answer marks: each set of points reaches its marks (s-u4o1-kk03-003 offers 4 points for 3 marks, using the house "Alternative:" label).
- No key is strictly the longest option. Each KK has a difficulty 3 MCQ, and answer positions are spread within each KK.
- Names: none of the organisations is used elsewhere in the content or in the other parts. Web searches found no business trading as Ghost Crab Cruises, Pelican Point Sailing Club, Nankeen Electrical, Messmate Hardware, Silvereye Singers, Grey Fantail Café, Gang-gang Electrical, Bilby Burrow Party Rooms, Sugarloaf Ridge Wildlife Shelter, Bluestone Loop Shuttle, Bellbird Knoll Cherries, Woodfire Wren Pizza, Blue Loam Potatoes, Tussock Lane Kitchen, Bindi Creek Plumbing Supplies, Goldfinch Lane Produce or Cherry Ballart Farmers' Market. Kangaroo Apple was rejected as the replacement market's name because the name appears to be in use in Frankston, and Stringybark is already used by m-u3o1-kk06-003.
- Noted, not changed:
  - m-u4o1-kk02-006 (`avgKg` should be Floating point) teaches the same point as m-u3o1-kk04-005 in part g-u3o1-a, and its distractors use the same type judgements as m-u4o1-kk02-002. Its key, correcting an average's type in a data dictionary, isn't tested elsewhere in the KK, so it is kept. The g-u3o1-a reviewer kept the sibling for the same reason.
  - s-u4o1-kk05-003 draws on points made in s-u4o1-kk05-001 (checks on a text box), s-u4o1-kk03-001 and c-u4o1-kk05-003 (controls that remove type and range checks). It is the only item that asks which checks each kind of control on a form needs, so it is kept.
  - s-u4o1-kk02-003 shares its read-at-start, write-at-close design with s-u4o1-kk02-001. There, the design is given and the item asks for a structure and types. Here, students must recommend the file format and describe loading and saving, so it is kept.

### g-u4o1-b

All 22 items were reviewed (16 MCQs, 6 short answers). No item was dropped, and ten were fixed in place. Counting primary-KK items only, KK07, KK09 and KK11 have 7 MCQs each, KK08, KK10 and KK12 have 6, and every KK has 3 short answers. Every KK has at least one difficulty-3 MCQ, and answer positions vary across each KK's full set, including the shipped items.

### Dropped

None.

### Fixed in place

- `m-u4o1-kk07-005` (U4O1-KK07): the key was the shortest option by 11 to 12 characters. It now reads "Run the same scenarios on handheld scanners...". The whyWrong line for the invalid-inputs option said that validation testing "belongs in" alpha testing; it now says that checking validation with prepared invalid data is the developers' job in alpha testing.
- `m-u4o1-kk09-005` (U4O1-KK09): the key was the only short option (58 characters against 63). It now reads "Not met, because 2.4% of the sampled labels had a wrong address", so all four options are 63 characters.
- `m-u4o1-kk10-007` (U4O1-KK10): the whyWrong line for option A now reads "Cutting a task shortens the path it is on; it can't make the critical path longer". Before, it spoke of removing a task from the critical path, which isn't what the project manager does.
- `m-u4o1-kk11-005` (U4O1-KK11): the stem put the four developers "at Eurack Solar", so it read as an in-house team, yet Anh's entry says she emailed "the client". The developers are now building the program *for* Eurack Solar.
- `m-u4o1-kk11-006` (U4O1-KK11): the whyWrong line for Code staff reports said "furthest behind as a percentage (3 days)", which mixed the two units. It now reads "furthest behind in percentage terms (60%, or 3 days of work)".
- `m-u4o1-kk11-007` (U4O1-KK11): the key was the shortest option by 10 characters. It now reads "The Gantt chart, annotated with actual dates and task progress" (62 characters, tied for shortest with one distractor).
- `m-u4o1-kk12-005` (U4O1-KK12): the key was the shortest option. It now reads "Base the coding estimates on this project's actual durations".
- `s-u4o1-kk10-003` (U4O1-KK10): marking point 1, the model and the mistake note said request B was added "without being assessed", but the prompt says the developer guessed it would take a day. Point 1 and the model now say it was added on a quick guess, with no change to the plan or the handover date agreed with the league. The mistake note now says "without being properly assessed and agreed". The developer is renamed from Rosa to Hazel, because Rosa is already the project manager in a Gantt item in part g-u3o2-a (s-u3o2-kk03-003) and appears in three other items.
- `s-u4o1-kk12-003` (U4O1-KK12): the journal note "Library server down" could be read as a server that hosts code libraries (U4O1-KK04). It is now "Test server down for 2 days". Justification 2 and the model said that spare time before 1 February would have put go-live on time. Spare time covers only the 2-day outage; the 3-day beta overrun is covered by recommendation 1. Both now say that a delay like this would have been absorbed instead of pushing go-live past the date.

### Kept after checking

- `m-u4o1-kk08-006` uses the same five-column strategy table and the same "main weakness" stem as m-u4o1-kk08-004. It was kept because it tests a different weakness: the person responsible for criterion 3 leaves when the contract ends. Only card c-u4o1-kk08-008 covered that before. The item doesn't depend on the verify list of strategy features; it only assumes that a strategy can name who is responsible.
- `m-u4o1-kk09-005` and `m-u4o1-kk09-006` share the "Which statement correctly applies the criterion" stem with m-u4o1-kk09-002 and m-u4o1-kk09-004. They were kept because applying criteria to data is the KK, and each item sets a different trap: a rate taken from a random sample, and a fall measured against the original time rather than the new one.
- `s-u4o1-kk08-003` and s-u4o1-kk08-002 both argue for evaluating later. s-u4o1-kk08-003 was kept because its main reason is a seasonal workload (harvest volume), not just the learning stage.
- `m-u4o1-kk10-006` (library withdrawn: a technical issue, not scope creep) is close in idea to m-u4o1-kk12-002 (card payment library changed). It was kept because the format and the distractors differ, and it asks directly for the scope creep versus technical issue distinction.
- `m-u4o1-kk10-005` asks how long a task off the critical path can run late, as cs-01-q04 part 2 and m-u3o2-kk03-002 do in other forms. It was kept: it asks for the amount, and it never names slack or float.
- `m-u4o1-kk12-006` (a dependency missing from the plan, seen in hindsight) was checked against m-u3o2-kk03-007 in part g-u3o2-a and cs-04-q08. Those items ask for the new length when a dependency is added during planning. This one asks what the evidence says about the plan, which is KK12 work.
- `m-u4o1-kk10-005` has numeric options ("0 days", "1 day", "3 days", "7 days"). The key ties the two other options for the longest at 6 characters. This was accepted, because number options can't avoid it.

### Checks

- Gantt charts, run through the repo's `computeSchedule`:
  - Joel Joel (`m-u4o1-kk10-005`): go-live is day 23, and the critical path is A, B, D, G, H, I. Code database finishes on day 13 and must finish by day 16. At 9 days, go-live is still day 23; at 10 days it moves to day 24. The distractor values also check out: 7 − 6 = 1, and 20 − 13 = 7.
  - Dergholm (`m-u4o1-kk12-006`): handover is day 16. With Code reports also depending on Code database, it moves to day 21, which is 5 days late.
- Moliagul (`m-u4o1-kk11-006`): the gaps are 20% of 10, 60% of 5, 25% of 4 and 50% of 8, which are 2, 3, 1 and 4 days, against 0, 4, 5 and 5 days that each task can run late. A plan with these numbers exists: Code bookings runs from day 7 to day 17, the other three tasks start on day 8, and go-live is day 24. Applying all four gaps together moves go-live to day 26, so no two delays interact.
- Arithmetic:
  - Wychitella: 6 ÷ 250 = 2.4%, against 6 ÷ 1 200 = 0.5%; 244 ÷ 250 = 97.6%, and 98% of 250 is 245.
  - Toolamba: 1.8 ÷ 8.0 = 22.5%, against 1.8 ÷ 6.2 ≈ 29%; a 25% fall needs 6.0 minutes.
  - Streatham: 444 ÷ 480 = 92.5%. The return times total 34.4, an average of 4.3, and three returns are under 4 minutes.
  - Carapook: 8 to 12 and 6 to 9 are both 50% longer.
  - Marnoo: 26 days planned and 31 actual; 2 + 3 = 5 days late.
- Short answers: the marking points reach the marks in all six (4/4, 3/3, 4/4, 3/3, 4/3, 4/4), and each model earns full marks against the scenario. Command terms fit the tasks: justify ×2, explain ×2, recommend ×2.
- No item uses slack, float, a development model, user acceptance testing, think-aloud or contingency as a term, or claims anything about examiners. No item depends on the verify list of evaluation strategy features. No US spellings were found.
- Web searches found no real business trading under any of the 22 organisation names. None of the names appears in the repo content or in another part file. The nearest matches were Gypsum Creek Outfitters (Colorado), Wychitella Holdings (a Coffs Harbour timber supplier) and the Kanawinka Geopark. None of them is close to the invented business. Marnoo has no standalone library (a regional mobile library visits), so Marnoo Community Library is clearly invented.
- `content-parts.ts check` prints ok.

### g-u4o2-a

All 20 items (15 MCQs, 5 short answers) were reviewed. `content-parts.ts check` prints ok. Counting primary items, each of U4O2-KK01 to KK05 has 7 MCQs and 3 short answers.

### Drops

- None. Every item had a defensible core, so the weak points were fixed in place. No ids changed.

### Fixes

- `s-u4o2-kk02-003` (U4O2-KK02): Woorak Grain Co-operative, a Horsham grain handler paying farmers for deliveries, repeated the setting of Kiata Grain Co-op in Horsham (s-u3o1, a module that pays for each truck's load) and Wemen Plains Grain Co-operative (U4O1). The scenario is now Bushwren Health Fund, a Geelong health insurer with six in-house developers, which needs a module that records members' claims and pays benefits into their bank accounts, with benefit rules that change every April. The question (justify building it in-house), the 3 marks and the three points are unchanged in substance. The data point is stronger, because claims show the health services members have used.
- `m-u4o2-kk05-006` (U4O2-KK05): The pharmacy prescription service, with a "reorder a repeat prescription in three taps" distractor, echoed Merricks Lane Pharmacy's prescription-reorder app (s-u3o2-kk15-002) and was the second pharmacy in this KK after Tidewater Pharmacy (m-u4o2-kk05-002). The service is now a Melbourne tutoring company's online lesson portal. The options and whyWrong lines are rewritten. The key (lock an account for 15 minutes after five failed logins) and its position are unchanged.
- `m-u4o2-kk03-006` (U4O2-KK03): Real patient records copied to an unencrypted USB drive for testing repeated the setting of s-u3o2-kk11-002 (real client records on a USB drive after testing). The records now go onto an unencrypted work laptop. The four options (vulnerability, threat, risk, control), the explanation and the whyWrong lines are updated. The key is still the risk option at position C, and it isn't the longest option.
- `m-u4o2-kk01-007` (U4O2-KK01): The objective "answer 90% of phone calls within two minutes by 30 June" was the exact example on c-u4o2-kk01-003. It is now 85% within three minutes. Boobialla Mutual is renamed Treecreeper Mutual, because Boobialla Beach Surf Rescue is already used in U3O2.
- `m-u4o2-kk05-005` (U4O2-KK05): Potoroo Point Fitness is renamed Dunnart Fitness, because g-u4o2-b uses Potoroo Rural Supplies. The figure id and title follow it (`dunnart-dfd`). The layout is unchanged.
- `s-u4o2-kk04-003` (U4O2-KK04): Box Ironbark Outdoor is renamed Tarilta Homewares. "Outdoor" repeated Tall Timber Outdoor in the same area (s-u4o2-kk01-002) and three U4O1 retailers, and "Ironbark" is already used by Ironbark Lane Freight and Ironbark Gully Tool Library.
- `m-u4o2-kk04-006` (U4O2-KK04): "Manna Gum Bank, a Bendigo bank" could be read as the real Bendigo Bank. It is now a Shepparton bank.
- `s-u4o2-kk01-003` (U4O2-KK01): Project A was "a phone app that sends each report straight to the nearest repair crew", which didn't say who used it. It is now a system that sends each report from the call centre straight to the nearest crew's phones. The water corporation is no longer described as "a regional water corporation", which was the same wording used for Mallee Rise Water in s-u4o2-kk04-001.

### Held back (confirmed)

- No item names, numbers, orders or counts the threat modelling steps, or names STRIDE, DREAD, attack trees or trust boundaries (U4O2-KK05). m-u4o2-kk05-006 teaches security requirements as a general principle, and s-u4o2-kk05-003 teaches revisiting a threat model when a feature is added.
- No item asks which vulnerabilities or risks the study design lists (U4O2-KK03). Each KK03 item describes a specific weakness in a scenario.
- No Act or framework is named. Least privilege appears only inside identity and access management (m-u4o2-kk04-006, m-u4o2-kk02-007). No firewall, antivirus, penetration testing, hashing or salting appears. There are no development models, no slack or float, and no SMART, mission or vision statements.

### Checks

- `canMerge` (m-u4o2-kk04-007) was run through `src/games/deskcheck/interpreter.ts`. `("Ari", "Bea", TRUE)` gives TRUE, `("Ari", "", TRUE)` gives FALSE, `("Ari", "Ari", TRUE)` gives TRUE and `("Ari", "Bea", FALSE)` gives FALSE. Only the key returns TRUE when the policy should refuse the merge. Line 3 is the `IF` that the explanation names.
- Both DFDs were routed with `src/figures/flows.ts` and rendered. No label overlaps a node or another label, no flow crosses a node, and every node keeps the 24-unit margin. In s-u4o2-kk05-003, the new feature is process 2, the registry entity and three flows (`registration_record` from D1, `owner_details`, `update_status`), as the model answer says.
- Marks: each short answer's points add up to exactly its marks (3, 3, 3, 4, 3).
- No key is the uniquely longest option. Answer positions over each KK's full set (existing and new) are 2-2-1-2 (KK01), 2-2-1-2 (KK02), 2-2-2-1 (KK03), 1-2-2-2 (KK04) and 2-2-1-2 (KK05). Each KK has a difficulty 3 MCQ among the new items.
- Australian spelling was checked, including licence, centre, organisation and behaviour.
- Names: the four new names (Treecreeper Mutual, Bushwren Health Fund, Dunnart Fitness, Tarilta Homewares) aren't used anywhere in the repo content or the other p3 parts. The web search quota was used up during this review, so these names were chosen as unusual combinations that aren't an obviously real business. Re-check them by web search before merging. The names kept from the author's draft were web-searched by the author.

### Noted, not changed

- `m-u4o2-kk03-005` (verbose error messages left on in the live site) sits at the edge of "insecure development environments". It is kept because the weakness is a development setting carried into release, which is a misconfiguration of the kind the KK covers.
- `s-u4o2-kk03-003` is the third KK03 item set on a shared development and production server (with m-u4o2-kk03-002 and s-u4o2-kk03-001). It is kept because it is the only item about how two weaknesses combine: password-only remote login is the way in, and the shared server is what makes that entry reach live customer data.
- `m-u4o2-kk02-006` (a sole in-house developer with no documentation) touches the same staff-loss theme as m-u4o1-kk10-003 and s-u3o1-kk11-002. It is kept because it is the only item that frames this as a disadvantage of in-house development.

### g-u4o2-b

All 19 items were reviewed: 12 MCQs and 7 short answers. None was dropped, and 9 were fixed in place. Counting only items whose first KK is that KK:

| KK | MCQs | Short answers |
|---|---|---|
| U4O2-KK06 | 7 | 3 |
| U4O2-KK07 | 6 | 3 |
| U4O2-KK08 | 6 | 3 |
| U4O2-KK09 | 6 | 3 |
| U4O2-KK10 | 7 | 3 |

Answer positions vary across each KK's full set, shipped items included, and no key is the longest option.

### Dropped

None.

### Fixed in place

- `m-u4o2-kk09-005` (U4O2-KK09): "Kelpfield Ferries" was too close to "Kelpwater Ferries" in m-u3o1-kk03-002, since both are ferry companies with ticketing systems. The organisation is now an unnamed Gippsland tour company. The stem used to ask which change "applies the principle of least privilege", which made it the same recall task as m-u4o2-kk09-001. It now asks which change most directly limits what an attacker who controls the website could do to the database, and the explanation names the principle. The whyWrong line for backups now says the attacker could still delete tables and read the staff records.
- `s-u4o2-kk08-003` (U4O2-KK08): "Potoroo Rural Supplies", chosen in the authoring pass to replace Boobialla, clashes with "Potoroo Point Fitness" in part g-u4o2-a (m-u4o2-kk05-005). The business is now unnamed: "a Horsham farm supplies business". The mistake note now warns students not to rest the answer on the law, because the scenario doesn't say whether a notification law covers the business.
- `m-u4o2-kk09-006` (U4O2-KK09): this was the part's second payroll company ("Mulloway Payroll Systems", beside Nardoo Payroll Services in m-u4o2-kk06-005, and Orchard Lane Payroll already ships), and like m-u4o2-kk09-002 it was set in Bairnsdale. It is now an unnamed Wangaratta company that builds stock-control software, and the broken calculation is the stock count.
- `s-u4o2-kk06-002` (U4O2-KK06): the IT manager Callum is renamed Petra. Callum Fraser is the systems analyst throughout cs-04.
- `s-u4o2-kk09-003` (U4O2-KK09): the developer Rosa is renamed Sunita. Rosa is already in m-u3o1-kk14-003 and s-u3o2-kk03-003, and the g-u4o1-b reviewer renamed a third Rosa for the same reason.
- `m-u4o2-kk06-007` (U4O2-KK06): the whyWrong line for the written-statement option said that a statement is "not evidence" and that "a developer may not know what others committed". Each developer vouches only for their own commits, so the second half missed the point. The line now says that a statement relies on memory and honesty and doesn't check what the code contains.
- `m-u4o2-kk07-006` (U4O2-KK07): the explanation said that the Act "governs this app". It now says that the Health Records Act's Health Privacy Principles set the rules for this information, and that the council's other personal information, such as ratepayers' details, falls under the Privacy and Data Protection Act.
- `m-u4o2-kk10-007` (U4O2-KK10): the whyWrong line for the laptop option said that the risk was "less harmful" without support. It now compares likelihood only: someone has to be at the laptop within 30 minutes, against an attack from anywhere on the internet. Difficulty was lowered from 3 to 2, because the two database options differ only in which database they name.
- `s-u4o2-kk07-003` (U4O2-KK07): the finding "the web server's operating system hasn't been updated for nine months" read almost word for word like s-u4o2-kk07-002 ("has not been updated for 14 months"). It now says that the web server's operating system "is missing nine months of security updates". The marking points and model still match it.

### Kept after checking

- `m-u4o2-kk07-006` relies on one point of law: the Privacy and Data Protection Act 2014 (Vic) defines personal information so that it excludes health information covered by the Health Records Act 2001 (Vic). A council's health records therefore fall under the Health Records Act's Health Privacy Principles, not the Information Privacy Principles. The item was kept at difficulty 3. Recheck it first if a source summarises the Victorian Acts differently.
- `s-u4o2-kk07-003` was kept beside s-u4o2-kk07-002 because its task is different. Students must answer the claim that the Essential Eight is pointless because it isn't law: the Privacy Act requires reasonable steps to protect personal information, and the framework gives a prioritised way to take those steps. Its third finding (untested backups) maps to a strategy that s-u4o2-kk07-002 doesn't use.
- `m-u4o2-kk06-005`: the key is the shortest option by 5 characters. That was accepted, because the three distractors each need a reason clause.
- `m-u4o2-kk10-007` uses a default administrator password, as the cs-04 insert does. It was kept because it tests prioritisation by likelihood and impact across four findings, which cs-04 doesn't ask.

### Follow-up for docs/CONTENT_NOTES.md (U4O2-KK07 drop list)

These items name an Act or an Essential Eight strategy. If the confirmed set of Acts and frameworks drops the one named, drop the item: `m-u4o2-kk07-005` (Essential Eight, application control), `m-u4o2-kk07-006` (Health Records Act 2001 (Vic), Privacy and Data Protection Act 2014 (Vic), Privacy Act 1988 (Cth), Copyright Act 1968 (Cth)) and `s-u4o2-kk07-003` (Essential Eight, Privacy Act 1988 (Cth)).

### Checks

- There is no pseudocode, Gantt chart, sort, search or calculation in the part, so nothing needed tracing. The one figure, a table in m-u4o2-kk10-007, has no coordinates. Every row has two cells.
- Short answers: the marking points reach the marks in all seven (4/4, 5/4, 5/4, 3/3, 3/3, 4/4, 4/4). Each model earns full marks against its scenario. The command terms (explain ×3, justify ×3, recommend ×1) fit the tasks.
- No item names slack, float, a development model, threat modelling steps, APP numbers or a named product. None asks which Acts, frameworks, vulnerabilities or criteria the study design lists.
- No US spellings were found. "Licence" is used as a noun throughout ("driver licence").
- Names. The web search budget for this session ran out after one search ("Nardoo Payroll" found no payroll business), so no new organisation name was introduced. The three renamed organisations are now unnamed. The new person names, Petra and Sunita, appear nowhere else in the content or the other parts. The authoring agent reported web-searching the other organisation names.
- `content-parts.ts check` prints ok.
