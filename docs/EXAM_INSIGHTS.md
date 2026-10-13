# Exam insights

What the VCAA's report on the 2025 Applied Computing: Software Development examination shows about where marks were won and lost, in our own words. The percentages are the report's published figures (share of students). The report comments on individual questions only; it has no general commentary, so the patterns below are COLDBOOT's reading of those comments. These points feed the `mistake` notes on content items. Question ids: A1 to A20 (Section A), B1a to B5c (Section B), C1 to C13 (Section C, the case study).

## Where the marks went

Section A went well overall. Thirteen of the twenty questions were answered correctly by more than 70% of students, and commenting out code (A12, 98%) and matching a constraint to limited processing power (A8, 95%) were almost universal. The losses were concentrated in the written sections, and most of them came from answering a neighbouring question, using the wrong term, or stopping halfway.

The questions where the most students scored zero:

| Question | Topic | Scored zero |
| --- | --- | --- |
| C10b | A threat modelling principle to apply after the security requirements are defined | 83% |
| C4b | The error in a Level 1 data flow diagram (an entity sending data straight to a data store) | 81% |
| B5b | The data type for a value that is always one symbol, with a reason | 72% |
| C12b | A beta testing strategy for a given user group | 65% |
| C9 | How user-centred design makes a solution efficient and effective | 62% |
| C8 | Which UX characteristic each of two sketches shows better | 59% |
| B5c | Two benefits of XML for the scenario | 58% |
| B2 | A strategy to improve the security of development practices | 55% |
| C7b | The names of two sections of an object description | 50% |
| C7a | A benefit of inheritance, with an example from the case | 49% |

The lowest multiple-choice results were variable scope (A15, 42% correct), includes and extends on a use case diagram (A9, 52%), tracing tiered pseudocode at a boundary (A5, 55%) and naming the UX characteristic a mock-up lacks (A6, 55%).

## Patterns behind the lost marks

**Answering the question next door.** Asked for a strategy to improve secure development (B2), many named a control such as encryption. Asked about the risks of pushing an update in a combined environment (B3), many wrote about the risks of not updating. Asked for benefits of XML (B5c), many compared it with CSV. Asked how a Gantt chart monitors progress (B1c), many described what a Gantt chart is. Asked for a beta testing strategy (C12b), many described testers checking calculations or hunting bugs. Read the question twice and answer exactly that.

**Study design words, exactly.** "Bool" and "Float" earned nothing where Boolean and floating point were wanted (C7c), and "string" earned nothing where a single symbol called for a character (B5b). A UX answer had to name one of the four study design characteristics (C8). DFD labels had to be copied with their underscores (C4a), and new attribute names had to follow the camel casing already used in the object description (C7c). The object description's sections are Name, Properties/attributes and Methods (C7b).

**The second half of a two-part answer.** Many identified a milestone but didn't say why it matters for monitoring progress (B1b), justified in-house development without giving a drawback of going external (C2), or named a data collection method without a reason tied to the people involved (C3). An identify-and-explain question pays for the explaining.

**Generic Section C answers.** Full marks in the case study went to answers that used its people, data and scale: the head office's reasons for the project (C1), customer data staying in-house (C2), surveys for many dispersed agencies and interviews for a small leadership group (C3), the User class and its four subclasses as the inheritance example (C7a).

**Saying the same thing twice.** A second test row that repeats an earlier scenario (C11c), or a second recommendation that restates the first (C13), earns nothing extra.

## Topic by topic

### Unit 3, programming

- **Data types.** Use the study design's names: character, string, integer, floating point, date/time, Boolean. A value that is always one symbol is a character, because only one symbol needs storing (B5b: 72% scored zero). Money is floating point.
- **Data structures.** A row of indexed values is a one-dimensional array (A1, 83%) and a grid is a two-dimensional array (B5a, 79%).
- **Data sources.** Benefits of XML are its own: extensible for future changes, self-describing tags, portable between systems. Tie each to the scenario.
- **Variables.** A local variable can be used anywhere in the module that declares it, not only inside the control structure where it first appears; a global variable's value can change while the program runs (A15, 42%).
- **Control structures and tracing.** An IF/ELSEIF chain is selection (A4, 71%). Trace tiered pseudocode with the actual boundary values: a larger input can give a smaller result when it crosses a tier (A5, 55%, with 40% choosing the reverse).
- **Errors.** A missing required symbol is the classic syntax error (A3, 69%). Matching descriptions to overflow, type mismatch, logic and index out of range went very well (B4, 82% full marks).
- **Inheritance.** An example needs a parent class and its subclasses; a stand-alone class with attributes and methods isn't one. Name the benefit and explain how inheritance produces it (C7a).
- **Validation.** A not-blank check is an existence check (C11a). When adding a check, say what goes wrong without it, for example a type check on a number used in a comparison (C11b).
- **Testing tables.** Each row needs a new combination of inputs, and expected and actual output must be written in full (C11c: average 3.6 of 6).

### Unit 3, analysis and design

- **Reasons for projects.** Match them to the study design's list (productivity and efficiency, cost, gaps in the market, organisational objectives or needs) and to the case (C1).
- **Gantt charts.** Tasks are sequenced by their dependencies (B1a). A milestone is a point in time, such as the end of a problem-solving methodology stage, not a task copied from the task list (B1b). Monitoring means updating the chart and comparing actual with planned progress, especially on the critical path (B1c: 15% full marks). A delayed critical-path task gets a new time frame and its dependent tasks move with it (A13, 85%).
- **Data collection.** Justify the method by the size and spread of the group and the detail needed (C3).
- **Requirements.** What the solution must do is functional, even when the statement contains a number; which platforms it needn't support is non-functional (C5, 58% full marks).
- **Constraints.** Limited processing power on target devices is a technical constraint (A8, 95%).
- **Analytical tools.** A data flow can't go from an external entity straight to a data store; a process must sit between them (C4b: 81% scored zero). An actor is a role, not an organisation or a device (A10: 21% chose the council office). Shared behaviour that a use case always needs is `<<includes>>`; an optional addition is `<<extends>>`, drawn from the addition to the base (A9, 52%).
- **Ideation.** In a mind map the key considerations are the first-level branches, and each idea sits under one of them (C6).
- **Design tools.** Know the object description's section names (C7b) and read an IPO chart's conditional processing (A7, 80%).
- **UX.** The four characteristics are affordance, interoperability, security and usability; contrast is a design principle, not a UX characteristic (A6: 25% chose contrast). Comparing two designs means naming a characteristic, pointing to the feature that shows it, and saying what the other design lacks: a login and role heading for security, recognisable icons for affordance, a drop-down instead of free text for usability (C8: 2% full marks).

### Unit 4, development and evaluation

- **Efficient and effective solutions.** User-centred design means involving actual users at each stage (interviews, design reviews, beta testing); "it meets the users' needs" earned nothing on its own. Give one example for efficiency (time, cost) and a separate one for effectiveness (fewer errors, clearer feedback) (C9: 62% scored zero).
- **Access modifiers.** Private limits an attribute to the class's own methods; protected also opens it to subclasses (A11: 20% chose protected).
- **Beta testing.** Testers come from the user group that receives the data flow being tested, which the context diagram shows (C12a). A strategy says how participants are chosen, what scenario they work through, and what is recorded and how (C12b).
- **Project plans.** Unchecked scope creep puts the original objectives at risk; it doesn't buy a better product (A14, 76%). A log entry that only says a task ran over, with no reason or effect on later tasks, the critical path or the finish date, can't support an assessment of the plan (C13: 9% full marks).

### Unit 4, cyber security

- **In-house versus external.** Justify in-house with an advantage of in-house and a disadvantage of external, both from the case (C2: 1% full marks).
- **Vulnerabilities and risks.** A developer's own misconfiguration exposing code and data is an insider threat (A16, 86%). Pushing an update into a combined development, testing and production environment risks an untested change, new bugs or vulnerabilities, corrupted data and downtime (B3).
- **Security controls.** Encryption protects sensitive stored data (A17, 75%). Identity and access management in a development environment authenticates developers and limits access to code and project data; customer data shouldn't be there. Version control keeps the code's history so a bad change can be rolled back; it isn't a backup (C10a).
- **Threat modelling.** After security requirements are defined, the remaining principles are identifying and mitigating threats, then confirming the threats have been mitigated (C10b: 17% correct).
- **Legislation and frameworks.** Editing someone else's code without permission breaches copyright (A18, 71%). Regular backups are an Essential Eight strategy (A19, 84%).
- **Ethics.** Relying on AI to write all the initial code is an ethical problem of over-reliance; using AI isn't unethical in itself (A20, 65%).
- **Strategies.** Developer training, onboarding or induction, and a risk management plan are the strategies; a control isn't a strategy (B2: 55% scored zero).

## Notes on the report itself

A few details in the report don't match the paper, so COLDBOOT follows the paper: its model testing table shortens the program's message, its comment on A6 calls the mock-up's check box a radio button, and its comment on C8 lists only some of Sketch 1's icons. Several published averages are slightly higher than their own mark distributions allow; the figures above are as published.
