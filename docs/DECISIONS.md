# Decisions

Every call made without asking the operator, with the reason and the alternative that lost. Newest entries at the bottom. IDs are stable; later entries may supersede earlier ones and say so.

## D-001 Source documents could not be downloaded

**Decision.** The VCAA host (`vcaa.vic.edu.au`, `www.vcaa.vic.edu.au`) is denied by this build environment's network egress policy (HTTP 403 at the proxy on every URL in Section 3). The build proceeds with Section 4 as a provisional map. Each KK in `content/study-design.json` carries a `status` of `provisional` until the study design text confirms it, and content that depends on a "verify" entry is held back until then. The host is re-checked before content authoring begins.

**Reason.** Most of the build (scaffold, terminal, games, scheduler, installer) does not depend on the source text, and stopping outright would waste the eight weeks that matter.

**Rejected.** Fetching copies of the VCAA documents from third-party mirrors: provenance can't be checked and it would route around an access policy rather than fix it.

## D-002 Branch, deploy and release

**Decision.** Work is committed and pushed to the session branch `claude/confident-dijkstra-m541dc`. `deploy.yml` deploys from `main` exactly as briefed; a separate `ci.yml` runs the same checks and build on every other branch and on pull requests. The early placeholder deploy, Pages enablement and the `v1.0.0` tag wait until the branch is merged into `main` and a deploy runs green.

**Reason.** This session may only push its own branch, has no `gh` CLI, and can't change repository settings, so it can't switch on Pages, deploy, or verify a live URL. Tagging `v1.0.0` before a green deploy would pin the installer to an unverified commit.

**Rejected.** Pushing straight to `main` (outside this session's permissions) and tagging early.

## D-003 TypeScript 6.0 rather than 7.0

**Decision.** Pin `typescript@6.0.3`.

**Reason.** `typescript-eslint@8.71` (the current release) supports TypeScript below 6.1. TypeScript 7 would mean dropping the TypeScript lint rules.

**Rejected.** TypeScript 7.0.2 with plain ESLint.

## D-004 Playwright version

**Decision.** Pin `@playwright/test@1.56.1`.

**Reason.** It matches the Chromium build preinstalled in the development container (revision 1194), so local runs need no browser download. CI installs its own Chromium for that version.

**Rejected.** The newest Playwright, which would need a browser download the container blocks.

## D-005 Fonts

**Decision.** Self-host through `@fontsource-variable/martian-mono` and `@fontsource-variable/atkinson-hyperlegible-next` (both confirmed on npm, OFL-licensed, variable weight axis).

**Reason.** One variable file per family covers every weight in use and Vite bundles the files same-origin, which the CSP requires.

**Rejected.** Static per-weight packages (more files for no gain) and downloading font files into `public/fonts` by hand (not needed once the packages exist).

## D-006 Content Security Policy in production only

**Decision.** A small Vite plugin injects the CSP meta tag from Section 10 into the production `index.html` only.

**Reason.** The Vite dev server injects `<style>` tags and opens a websocket for hot reload, both of which the policy blocks. Production builds emit only same-origin scripts and stylesheets, and React sets styles through the CSSOM, which `style-src` does not govern, so the policy needs no relaxation.

**Rejected.** Adding `'unsafe-inline'` to `style-src` everywhere.

## D-007 CI runtime and action versions

**Decision.** Node 22 in CI (`react-router@8` requires Node 22.22 or later); `actions/checkout@v5`, `actions/setup-node@v5`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v4`.

**Reason.** Current major versions of the official actions; Node 22 matches the development container.

**Rejected.** Node 24 (no benefit for this build and a mismatch with local runs).

## D-008 Content file shapes

**Decision.** Per-outcome files (`cards.json`, `mcq.json`, `short.json`) and `terms.json` are plain arrays; `psm.json` is an object holding the stages, activities, specification notes and its own cards, MCQs and short answers. Cloze gaps are written `{{text}}` in `front`. Glossary cards are `reverse` cards whose `front` is the term, with an optional `aliases` list that `blitz` accepts. Case study questions are the MCQ or short-answer schema plus `figureRefs`, told apart by their fields (strict schemas make the union unambiguous). Each KK entry carries `status` (`confirmed` or `provisional`) and an optional `verify` note.

**Reason.** Plain arrays are the easiest shape to author and diff. The additions (`aliases`, `status`, `verify`) are optional or metadata, so the Section 8.1 item shapes are unchanged.

**Rejected.** A `format` discriminator on case study questions (redundant with strict schemas) and wrapping every file in a versioned object (content ships with the app, so it never needs migrating).

## D-009 Floors on branch CI

**Decision.** `ci.yml` (branches and pull requests) reports content floors without failing (`content:check -- --floors=warn`, `COLDBOOT_SKIP_FLOORS=1` for the floors test). `deploy.yml` always enforces them. The relaxation is removed once Phase 1 content lands.

**Reason.** Content is authored after the app code, and a permanently red branch CI would hide real regressions in the meantime.

**Rejected.** Enforcing floors everywhere from day one.

## D-010 Contract review fixes before Phase 1

**Decision.** An adversarial two-agent review of the Phase 0 contracts found two blockers and a set of gaps, all fixed before any track started:

- Persistence no longer drops a whole store when one record is bad. Hydration salvages valid records, copies the damaged original to `coldboot:v1:<name>:quarantine`, and raises the storage warning. Data saved by a newer build is never loaded or overwritten, and the warning asks for a reload. A `storage` listener merges writes from another window (the installed app window and a normal tab share one profile) instead of letting the last writer win. Every store action and `recordAttempt` validate at the write boundary.
- Export writes one `{ v, data }` envelope per store, so backups made now still import after a store's shape changes.
- The study day uses wall-clock hours, so the rollover stays at 4 am on daylight-saving days; the test suite runs in `Australia/Melbourne`.
- MCQs and short answers can carry figures; figure data is checked for dangling ids and dependency cycles.
- The daily challenge has a pure set builder (rendezvous hashing, so new content doesn't reshuffle a day) and a record protocol that keeps only first attempts.
- Written can open a case study (`/written?cs=cs-01`), so Section C content is reachable in P0.
- The glossary list lives in `study-design.json` and drives the TERMS floor; KKs can be marked `held`.
- Reverse cards alternate direction within one SRS record.

**Reason.** Six tracks build on these contracts in parallel. Changing them afterwards means rework in every track.

**Rejected.** Fixing these inside the tracks as they came up.

## D-011 Deploy keeps the floors strict

**Decision.** `deploy.yml` enforces content floors. The branch CI reports them as warnings (D-009).

**Reason.** The deploy is the release gate. This branch reaches `main` only once Phase 1 content is in, so a strict deploy costs nothing and guards against a half-filled release.

**Rejected.** Enforcing floors only on tag builds. A reviewer suggested it so that a placeholder could deploy early, but this session can't deploy anyway (D-002).

## D-012 Track branches start from the session head (tracks A and B1)

**Decision.** Both wave 1 worktrees were created from `main` (c856201), which holds only `BUILD_PROMPT.md`. Each track branched from `1008b60`, the head of `claude/confident-dijkstra-m541dc` at the time (`track/a-shell`, `track/b1-terminal`), and the integrator merged both into the session branch with `--no-ff`.

**Reason.** The scaffold and the Phase 0 contracts exist only on the session branch. `git rev-parse --show-toplevel` still printed each worktree's own path, so isolation held.

**Rejected.** Branching from the worktree's own `HEAD`, which has no code to build against.

## D-013 Phone navigation: five tabs and a More menu (track A)

**Decision.** Below 720 px the tab bar has five tabs: Home, Review, Drill, Terminal and More. More opens a menu with Written, Exam, Map, Stats, Settings and About, and shows as current (bold with a top bar) on any of those pages. Esc, choosing an item or tapping outside closes the menu, and Esc puts focus back on More.

**Reason.** Five 72 px tabs fit a 360 px screen with "Terminal" at 14 px, and the first four are where students go every day.

**Rejected.** A horizontally scrolling tab bar, which hides items and breaks the no-sideways-scroll rule.

## D-014 Bare shell until first run is done (track A)

**Decision.** Until onboarding is complete the shell shows only the wordmark and the main column: no rail, tabs, status bar or terminal drawer. An onboarded user who opens `/welcome` is sent to Home.

**Reason.** Before onboarding every route redirects to `/welcome`, so a rail of links would only bounce back. Running first run again would call `completeOnboarding` and reset `createdAt`.

**Rejected.** The full shell with links that return to `/welcome`.

## D-015 Focus ring with an ice halo (track A)

**Decision.** Every focusable element gets a 2 px `--cobalt` outline offset by 2 px, and the gap is filled with a 2 px `--ice` ring drawn as a zero-blur box-shadow. Rail and tab items draw the same ring inset, because the rail scrolls and would clip it.

**Reason.** `--cobalt` on `--trench` is exactly 3.00:1, the bare AA minimum, and a cobalt ring disappears against a cobalt primary button. The halo is the only box-shadow in the app, and `docs/DESIGN.md` documents it as a ring, not an elevation shadow.

**Rejected.** A cobalt outline on its own.

## D-016 Hover states (track A)

**Decision.** Buttons and links underline on hover, and secondary buttons also switch their border to `--ice`. Hover has no transitions.

**Reason.** The palette has no lighter or darker shades to swap in, and Section 9 keeps motion for user actions that matter.

**Rejected.** Tinting or mixing tokens to make hover colours.

## D-017 Navigation picked by media query (track A)

**Decision.** The rail and the tab bar are rendered conditionally with `useNarrow()` (`matchMedia` at `max-width: 719.98px`).

**Reason.** Only one "Main" navigation landmark exists at a time, and components and tests see one DOM.

**Rejected.** Rendering both and hiding one with CSS.

## D-018 Feedback announces and plays its own cue (track A)

**Decision.** `<Feedback>` calls `announce()` with "Correct" or "Incorrect" (plus an optional summary) and `playCue()` when it mounts. `announce={false}` or `cue={false}` turns either off.

**Reason.** Every answer screen then gets the live region and the sound right with no extra code.

**Rejected.** Leaving both to each screen, which risks missed or doubled announcements.

## D-019 Report dialog details (track A)

**Decision.** The first reason, "Wrong answer", is preselected. "Open GitHub issue" is a real link to the prefilled issue URL (`target="_blank"`, `rel="noopener noreferrer"`). "Copy report" falls back to a focused, selected, read-only text area. The copy confirmation sits in a live region inside the dialog. The help line tells people without GitHub to send the copied report to whoever shared COLDBOOT with them.

**Reason.** A link can't block navigation to check that a reason was chosen, so one is chosen already. `showModal()` makes the rest of the page inert, so the shared live regions can't speak while the dialog is open.

**Rejected.** No default reason plus validation, and announcing through the shared live region.

## D-020 Exam time validation (track A)

**Decision.** The first-run and Settings forms reject exam times in the past, except the value already stored. The Melbourne date and time go through `melbourneWallTimeToIso`. When the device clock shows a different wall time from Melbourne, the form also shows the device-local equivalent.

**Reason.** A past time at first run is almost certainly a typo. After the real exam, the stored time must not stop other settings from saving.

**Rejected.** Accepting any date.

## D-021 Boot sequence counts as played even when skipped (track A)

**Decision.** `setLastBootDay` runs on mount whether the sequence plays, is skipped or is suppressed by reduced motion. The overlay is `aria-hidden`, holds nothing focusable and never makes the page inert. Any key, click or tap skips it without calling `preventDefault`. On phones the key knowledge lines wrap with a hanging indent.

**Reason.** The full version should play at most once per study day, and screen readers and keyboards must never be blocked.

**Rejected.** Setting `lastBootDay` only when the sequence finishes, and shortening the "N key knowledge points" wording on phones.

## D-022 Service worker updates (track A)

**Decision.** `reload()` listens for `controllerchange` itself, with a 4 s fallback, and reloads straight away when nothing is waiting. An open window also checks for updates hourly while it is visible and online. Registration waits for the `load` event. `checkForUpdate()` returns `latest`, `ready`, `unavailable` or `error`.

**Reason.** The plugin attaches its reload listener only when its own `waiting` event fires, 200 ms after install, so a quick Reload activated the new build without reloading the page. This was reproduced in Chromium and fixed. The installed app window can stay open for days.

**Rejected.** Relying on the plugin's own `controlling` listener.

## D-023 Fonts are never inlined (track A)

**Decision.** `build.assetsInlineLimit` in `vite.config.ts` returns `false` for `woff`, `woff2`, `ttf` and `otf` files.

**Reason.** Vite inlined the 3 KB Martian Mono cyrillic-ext subset as a `data:` URI, and the production CSP (`font-src 'self'`) blocked it with a console error on every page. Track B1 found the same fault separately.

**Rejected.** Adding `data:` to `font-src`.

## D-024 Status bar refresh (track A)

**Decision.** The status bar ticks every 15 s through `useNow` and is a footer landmark labelled "Status", not a live region.

**Reason.** The countdown shows hours, so a one-second tick is wasted work, and announcing the countdown would interrupt screen reader users.

**Rejected.** A 1 s tick.

## D-025 Settings save model (track A)

**Decision.** Name, exam time and the daily new-card limit save together with "Save changes", which confirms "Changes saved.". Sound and motion apply as soon as they change. Import asks for confirmation, and the confirm button's description carries the file summary and the warning. Reset needs RESET typed exactly (case-sensitive), shown as boxed code.

**Reason.** Text fields need checking before they save, while toggles are expected to apply at once. Section 6.10 requires the typed RESET, the only all-caps string apart from identifiers.

**Rejected.** Autosaving every field.

## D-026 Dialog backdrop (track A)

**Decision.** The native dialog backdrop is a `--void` scrim at 85% opacity, the only translucency in the app.

**Reason.** It dims the page behind a modal without adding a colour.

**Rejected.** A solid black backdrop that hides the page completely.

## D-027 One screen reader channel for terminal output (track B1)

**Decision.** The terminal output is `role="log"` with `aria-live="off"`. After each submitted line, Ctrl+C, a list of completions or the end of a timed game, the terminal calls `announce()` once with a plain-text digest of what it printed (`src/terminal/speech.ts`). Answer feedback comes first ("Correct." or "Incorrect. Expected: ..."), then the reason and the next question. The digest is capped at 1500 characters.

**Reason.** A live log plus `announce()` would read every answer twice. The digest also reads out the next question, which a feedback-only sentence would leave out.

**Rejected.** A polite live log with the feedback hidden from assistive technology, which takes the feedback out of the log, and announcing only the feedback sentence, which leaves screen reader users to hunt for the next question.

## D-028 What `report` targets during a game (track B1)

**Decision.** `report` opens the most recently answered item (the one whose feedback is on screen), or the current item if nothing has been answered yet. `report current` always targets the question waiting for an answer. During a game these are the only words not treated as answers.

**Reason.** The next question prints straight after the feedback, so "current" has already moved on by the time a student disagrees with the feedback.

**Rejected.** Always reporting `session.current()`, which reports the wrong question after feedback.

## D-029 Input during games and command history (track B1)

**Decision.** While a game runs, every line is an answer except `report`. A command word that isn't a valid answer prints a hint on how to stop the game. A pending command from `useTerminal.run()` ends the running game and runs as a command. Only commands go into the persisted history; during a game, Up and Down step through that game's answers.

**Reason.** Answers such as "quick sort" or "3 1 2" can't be told apart from commands safely, and answers would clutter the 100-entry persisted history.

**Rejected.** Reserving command words during games, and keeping answers in the persisted history.

## D-030 Tab in the terminal (track B1)

**Decision.** Tab completes only when the line has text and no game is running. Otherwise Tab and Shift+Tab move focus as usual. While the drawer is open, Tab stays inside it.

**Reason.** Shell-style completion without turning the input into a keyboard trap.

**Rejected.** Always capturing Tab in the input.

## D-031 Selection sort with repeated values (track B1)

**Decision.** Hard rounds, which always contain a repeated value, state that the leftmost smallest value is chosen, and the algorithm compares with a strict `<`.

**Reason.** With repeats, choosing the first or the last occurrence gives different arrays after a pass, so the rule has to be stated.

**Rejected.** Leaving the tie rule unstated.

## D-032 Quick sort item structure (track B1)

**Decision.** A round asks the partition question and then the sub-lists question on the same array, as two consecutive items that each stand alone. Sub-lists are typed in brackets in array order, without the pivot, with `[]` for an empty one. Half the hard partition items make the repeated value the pivot, so the "less than or equal" rule matters.

**Reason.** The engine checks one answer per item, and `generate()` needs every item to stand alone for the daily challenge.

**Rejected.** One two-part item with its own multi-step check.

## D-033 Algorithm rules in words, not pseudocode (track B1)

**Decision.** The selection sort, Lomuto partition and binary search rules are written out in words, plus the exam's `DIV` operator. The sort and search prompts carry no pseudocode listings.

**Reason.** The exam's pseudocode conventions (the assignment symbol, for one) are unconfirmed while the sources are unavailable (D-001), and a listing in the wrong convention would teach it.

**Rejected.** A pseudocode partition function in every quick sort item.

## D-034 Input that isn't an attempt (track B1)

**Decision.** Unparseable input, the wrong number of array values, and anything other than exactly two bracketed sub-lists re-prompt without recording an attempt.

**Reason.** These are slips, not attempts, and counting them would unfairly lower mastery.

**Rejected.** Marking them wrong.

## D-035 Command suggestions for short words (track B1)

**Decision.** The edit distance allowed for a "Did you mean" suggestion is `min(2, max(1, floor(length / 2)))`, so "hlep" still suggests `help` but "1" doesn't suggest `ls`. A line that starts with a digit or bracket when no game is running says there is nothing to answer.

**Reason.** The screenshot review showed "Did you mean ls?" after typed answers, which is noise.

**Rejected.** A flat distance of 2 for every word length.

## D-036 Block caret over a real input (track B1)

**Decision.** The prompt is a real `<input>` with a transparent native caret. A block span (`--trench` text on `--phosphor`) follows the cursor in `ch` units and is updated directly in the DOM (`useBlockCaret`). It is hollow when the input is unfocused and hidden during a selection. The focused prompt row shows a 2 px cobalt top rule.

**Reason.** Native editing, selection, IME and the mobile keyboard keep working, and typing doesn't re-render the log. CSS `caret-shape` isn't reliable across browsers yet.

**Rejected.** A fake input built from spans, and a full cobalt frame around the prompt row, which looked heavy in screenshots.

## D-037 No drawer on the terminal route (track B1)

**Decision.** The drawer renders nothing on `/terminal`. The route cancels any request to open the drawer, takes pending commands and focuses its own input.

**Reason.** Two views of one session on the same screen would be confusing, and the brief says the backtick focuses the route's input there.

**Rejected.** Letting the drawer open over the route.

## D-038 Drill order without an argument (track B1)

**Decision.** The drill ranks KKs as: seen KKs below 65 (lowest first), then unseen KKs in study design order, then the rest. It draws round-robin from at least three KKs, adding more until 10 questions are available.

**Reason.** Unseen isn't weak, but it should come before strong KKs so coverage grows.

**Rejected.** Ranking only seen KKs, which drills a student's only practised KK again.

## D-039 Zod runs jitless (integration)

**Decision.** `src/lib/zodConfig.ts` calls `z.config({ jitless: true })`, and `main.tsx` imports it before anything else.

**Reason.** Zod 4 probes for eval support with `new Function('')` when it builds its first object schema. The production CSP (`script-src 'self'`) blocks the probe, and Chromium reports a `securitypolicyviolation` on every load even though Zod catches the error. The interpreted parser is quick enough for the stores and import files.

**Rejected.** Adding `'unsafe-eval'` to `script-src`, and leaving the report in place.

## D-040 Wave 1 integration seams

**Decision.** The shell sets `--terminal-route-offset` from its own chrome (main column padding and status bar on desktop; the 56 px top bar, padding, status bar and tab bar on phones), so the full-screen terminal fills the viewport without a page scroll. The drawer uses `z-index: var(--z-drawer)` instead of 900, which puts it over the rail, bars and popovers and under the boot overlay. The drawer title sets the mono face itself, because `global.css` gives every `h2` the reading face.

**Reason.** At 360 px the route's 160 px default left the page 36 px taller than the screen. Track B1 was built without `global.css` and the new tokens, so the other two fixes bring it into line with track A.

**Rejected.** Changing `global.css` or the tokens to suit one component.

## D-041 Figures: Object description as a semantic HTML table

**Decision.** ObjectDescription renders a <table>: the object name in <thead>, then a Properties <tbody> (Name, Data type, and Description when any member has one), then a Methods <tbody>. Member names are in Martian Mono.

**Reason.** The text wraps and stays selectable, screen readers can move cell by cell, and it needs no scaling or scroll box at 360 px.

**Rejected.** An SVG box diagram, which would need manual text wrapping and a sideways scroll on phones, and would be less accessible.

## D-042 Figures: Scroll container with a label-size floor

**Decision.** Each canvas sits in an overflow-x:auto box (width: fit-content, max-width: 100%, --void background). Inside it, a stage has min-width: min-content, and a hidden zero-height sizer SVG is width x 12/14 wide. The SVG shows at its natural size where there is room and scales down to fit, but never below the sizer width, so 14-unit labels stay at 12 px or more. The box becomes a focusable role=group tab stop, with a 'Scroll sideways to see the whole figure.' hint, only while it actually overflows (checked with a ResizeObserver).

**Reason.** This keeps the page from scrolling sideways and keeps labels legible without per-figure style attributes, which the no-inline-style rule forbids. Measured in Chromium, labels are exactly 12.0 px at 360 px, and the page width is 360.

**Rejected.** Setting min-width or max-width per figure through the style prop (writes style attributes); letting SVGs shrink to fit (labels at about 7 px on phones); always making the box a tab stop.

## D-043 Figures: Label widths from measured font metrics

**Decision.** text.ts holds advance widths for printable ASCII in Atkinson Hyperlegible Next, at regular and bold weights, measured once in Chromium. It adds a 4% safety margin and assumes 0.7 em for other characters. These widths drive wrapping inside shapes and the --void backing rectangles.

**Reason.** Layout stays deterministic and testable in jsdom, with no layout pass or font-load race. In Chromium every flow-label backing was at least 6 units wider than its rendered text, and no label overflowed its shape.

**Rejected.** Measuring each label with getBBox after render, which doesn't work in jsdom and would need re-measuring after fonts load.

## D-044 Figures: Parallel flows and short-line labels

**Decision.** Straight flows between the same pair of nodes are spread 22 units apart along a normal shared by both directions, and their labels move to the outer side. A label that would cover the arrowhead or either end of the line moves beside the line: above a flatter line, right of a steeper one, switching sides if that side leaves the canvas. All labels are kept on the canvas. labelAt always wins.

**Reason.** Request and reply flows are the norm in context diagrams, and forcing authors to add via points to every pair would be error-prone. Nodes never move, so this is still layout from coordinates, not auto-layout.

**Rejected.** Drawing both flows on the same line (they overlap) and requiring via points for every pair.

## D-045 Figures: Highlight API

**Decision.** highlight is either string[] (markers A, B, C, ... in order) or Record<id, markerText>. A highlighted element gets a dashed --cobalt ring plus a small marker box, and the text description gains a 'Marked on the figure' section, which also goes into the SVG <desc>. Ids by kind:
- Context: 'system' and entity ids.
- DFD: node ids.
- Context and DFD flows, and use case links: flow.id, or 'from->to'.
- Use case: actor and use case ids.
- Gantt: task ids.
- Object: member names.
- Pseudocode: line numbers, drawn through renderPseudo's highlightLines with a dashed override.
- Table: 1-based row numbers.
- Mock-up: e1, e2, ... in data order.
Unknown ids are ignored.

**Reason.** Letter markers let a question say 'the flow marked A', and the dfd game can mark candidate elements. The marker means colour or dash never carries the highlight alone.

**Rejected.** A single fixed marker such as '*' (can't tell several highlights apart) and ring-only highlighting.

## D-046 Figures: Gantt slack in the text description only with showCriticalPath

**Decision.** The description always lists each task's duration, dependencies, explicit start and the days or weeks it runs in. It adds slack, critical status and the critical path only when showCriticalPath is set; otherwise the summary says 'Slack and the critical path are not marked.'

**Reason.** The description mirrors what the chart shows, so opening it never gives away an answer that a question on an unmarked chart asks the student to work out.

**Rejected.** Always listing slack, as the brief's list suggests, which would reveal the critical path on charts that deliberately hide it.

## D-047 Figures: Schedule semantics

**Decision.** An explicit start means 'starts no earlier than', so earliest start = max(start, latest dependency finish). Slack is total float, LS - ES. critical is slack == 0. criticalPaths returns every maximal chain of critical tasks joined by tight links (each dependant starts exactly when its predecessor finishes), from a task whose start isn't set by a dependency to a task that finishes at the project duration, sorted by input position. Zero-duration milestones stay on the path. Cycles, unknown or self dependencies, duplicate ids and negative durations throw a ScheduleError that names the problem, e.g. 'Gantt tasks form a dependency cycle: B → C → A → B.'

**Reason.** This matches the textbook critical path method and is what the gantt game needs. The brute-force reference checks the same definition independently, as the heaviest paths through a network with a source and a sink, excluding chains that are a contiguous piece of another.

**Rejected.** Treating start as a fixed start that could break a dependency, and returning only one critical path when chains tie.

## D-048 Figures: Gantt chart layout

**Decision.** Rows follow task order. Table columns come first (Task: id and name; Days or Weeks; Depends on), then one column per unit numbered from 1, so ES 2 with duration 3 fills columns 3 to 5. Milestones (duration 0, or milestone: true) are diamonds on the boundary where they happen. Normal bars are solid --phosphor; critical bars are hatched --ice with an outline and the word 'critical' after them; slack is a dashed --steel line with an end tick at the latest finish. Unit width is 18 to 48; tick labels thin out for long projects. The legend is HTML so it wraps at 360 px.

**Reason.** Exam-style Gantt charts number their columns from 1, and a 'Depends on' column shows dependencies without cluttering the chart with connector arrows.

**Rejected.** A 0..T boundary axis and dependency connector arrows (busy, and they collided with the 'critical' labels).

## D-049 Figures: ASCII Gantt format

**Decision.** The columns are:
- a two-character mark ('* ' on critical rows);
- the task, as 'id name' truncated with '...';
- Days or Weeks;
- Slack;
- the bars, one column per unit.
Bar characters: '#' for critical tasks, '=' for other tasks, '.' for slack up to the latest finish, 'M' for a milestone at the end of its unit. Plans longer than 60 columns fit several units per column and say so ('Scale: 1 column = 2 days.'). A key line explains only the symbols present. showCritical: false (for while a game asks for the critical path) hides the marks, the Slack column and the dots. Non-ASCII in names is folded to ASCII.

**Reason.** Critical tasks are marked by a symbol as well as the bar character, so nothing depends on colour, and the output copies cleanly anywhere.

**Rejected.** Unicode block characters and diamonds, which break the ASCII-only rule for pre blocks copied into editors.

## D-050 Figures: Pseudocode double spacing fixed locally

**Decision.** Figure.module.css sets white-space: normal on the figure's pre.pseudo code (each .ps-line keeps white-space: pre). The figure's listing box scrolls instead of the pre.

**Reason.** renderPseudo joins its display:block line spans with '\n', and inside a <pre> each newline renders as a blank line, so every listing was double-spaced. src/ui/markdown.css and src/content/markdown.ts belong to other tracks or contracts, so I scoped the fix to figures and report the global bug.

**Rejected.** Editing markdown.css (track A) or renderPseudo (contract file) from this track.

## D-051 Figures: Other drawing conventions

**Decision.** - Default sizes follow content/README.md, and a process radius comes from w/2 when w is given.
- Actors route links to a 40x72 box, and their highlight ring takes in the label.
- The use-case boundary is a 1.5 ice rectangle drawn first.
- Figures sit on a --void canvas even on --trench surfaces, so label backings match.
- Mock-up list items are split on newlines, and notes are numbered in data order.
- Decorative SVGs (the scroll sizer, legend swatches) are aria-hidden instead of role=img.
- Title and caption are plain text; only table cells and pseudocode go through Markdown.

**Reason.** These keep the notation consistent and accessible, stay within the tokens, and never render figure strings as HTML outside the content pipeline.

**Rejected.** Transparent canvases, which would need a per-surface backing colour, and naming decorative SVGs as images.

## D-052 Distribution: A test-only switch to cover the no-Chromium path in CI

**Decision.** install.ps1 honours COLDBOOT_NO_CHROMIUM=1, which skips the Edge and Chrome search. CI uses it after an Edge install to check that .url shortcuts replace the .lnk files and that uninstall removes .url files. It is documented in the script header next to COLDBOOT_NO_LAUNCH.

**Reason.** Every runner has Edge, so without the switch the fallback path and uninstall's .url handling would never be run anywhere before a student hits them.

**Rejected.** Keeping strictly to the brief's knobs and leaving the fallback untested, or hiding Edge on the runner, which is fragile.

## D-053 Distribution: Constrained Language Mode stops early with advice

**Decision.** If $ExecutionContext.SessionState.LanguageMode isn't FullLanguage, the installer says PowerShell runs in a restricted mode, points to the Pages URL and the browser's own install option, and returns.

**Reason.** Managed school laptops often enforce this mode, which blocks WScript.Shell COM and .NET calls, and the student would otherwise see a confusing partial failure.

**Rejected.** Letting the first blocked call fail into the generic catch.

## D-054 Distribution: Setbacks in one step don't stop the whole install

**Decision.** A failed icon download keeps the previous icon, or falls back to the browser's icon, and the install carries on. The icon downloads to a temp file first and is moved into place. Each shortcut location has its own try/catch, so a blocked Desktop (for example by Controlled Folder Access, or a redirect to a missing drive) still leaves the Start menu shortcut. The launch has its own try/catch too.

**Reason.** A student should end up with a working shortcut whenever that's possible, and every failure is reported in plain words.

**Rejected.** Aborting on the first failure.

## D-055 Distribution: Wider browser and folder search

**Decision.** Besides the briefed locations, the search checks the HKLM WOW6432Node App Paths view and %ProgramW6432%. If GetFolderPath returns empty, it retries with SpecialFolderOption.Create. Re-running removes a shortcut of the other kind (.lnk or .url) in the same place.

**Reason.** This covers 32-bit PowerShell hosts and missing special folders, and makes a re-run a true repair when the browser situation has changed.

**Rejected.** Only the exact paths in the brief.

## D-056 Distribution: .url files are ASCII, with the icon dropped for non-ASCII paths

**Decision.** Internet shortcuts are written with Set-Content -Encoding ASCII. IconFile is left out when the icon path contains non-printable-ASCII characters, such as an accented user name.

**Reason.** The .url format is an ANSI INI file, and 5.1 and 7 disagree about what 'Default' encoding means. A missing icon is better than a corrupted path.

**Rejected.** UTF-16 .url files (not sure Explorer reads them) and code-page juggling.

## D-057 Distribution: COLDBOOT_NO_LAUNCH applies to both paths

**Decision.** The variable also stops the no-Chromium path from opening the default browser.

**Reason.** It gives CI and testers the same behaviour on both paths.

**Rejected.** Honouring it only when a Chromium browser is found.

## D-058 Distribution: How the lint works and what it checks

**Decision.** A small scanner blanks out strings, here-strings, comments and braced variables, and tracks brace depth before the code checks run. The preferences count only when set on their own line at the top level of the & { } block and before the first download. The progress rule applies to install.ps1 and to any script that downloads. The tests run the lint the way CI does, over fixture scripts in a temp dir, and the lint stays a CLI with no exports.

**Reason.** Line regexes alone would pass a preference set inside a nested function or a comment, and would fail a message that merely mentions Invoke-WebRequest. Running the lint as CI does tests exit codes and output, and avoids declaration files for an .mjs import.

**Rejected.** Plain regexes over raw lines, and exporting functions with a .d.mts.

## D-059 Distribution: How the Windows CI job is built

**Decision.** One matrix leg per shell (defaults.run.shell from the matrix), with fail-fast off. A parse step uses each version's own parser, which catches 7-only syntax under 5.1. PSScriptAnalyzer fails on Error, ParseError and Warning; Information findings are printed but don't fail the job. The student-style run also checks a repair, a second uninstall, the fallback path, and that the installer writes nothing to the pipeline. The job gets permissions contents: read and a 15-minute timeout. Icon paths are compared after ExpandEnvironmentVariables.

**Reason.** The brief's assertions plus cheap extra coverage of re-runs. Windows may store shortcut icon paths with variables such as %USERPROFILE%, so a direct comparison could fail for no real reason.

**Rejected.** Two steps in one job sharing state, a checked-in helper .ps1 for the assertions, and filtering with -Severity (which may drop parse errors).

## D-060 Distribution: Console colours

**Decision.** Cyan only, for the banner and the success headline. Failures use the default colour and say plainly what happened.

**Reason.** Section 9: no green or red, and colour never carries meaning alone.

**Rejected.** Red errors and green success lines.

## D-061 Distribution: README scope wording

**Decision.** The README says development models 'weren't found in the 2025 key knowledge' and points to the About screen for anything still being checked against the study design.

**Reason.** The study design couldn't be downloaded (D-001), so the README must not claim it has been checked. The wording matches the About screen.

**Rejected.** Stating outright that the 2025 study design excludes development models.
