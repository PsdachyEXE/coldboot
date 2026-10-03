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

## D-062 Study: The interval uses the updated ease

**Decision.** From the third review on, the interval is round(previous interval × the ease after this rating's update), and at least 1 day.

**Reason.** Hard, Good and Easy then give different intervals, so the times on the rating buttons differ and the rating affects this review. This matches the original SuperMemo order, where the ease is updated after the response and then used for the next interval.

**Rejected.** Multiplying by the ease from before the update, as common library ports do. From the third review on, Hard, Good and Easy would then give identical intervals.

## D-063 Study: Ease updates on every rating, between 1.3 and 10

**Decision.** The standard SM-2 ease update runs on every rating, Again included, and never goes below 1.3. It is also capped at 10, the most the SRS store's schema accepts; no real schedule gets near it.

**Reason.** The brief asks for the standard formula on every rating. The cap stops `setCard` from ever rejecting a state.

**Rejected.** The reading of the original SM-2 that leaves the ease unchanged after a failed recall (quality below 3).

## D-064 Study: The stored interval is the one actually scheduled

**Decision.** `next.interval` is the number of study days from today to the due day after both exam caps, not the uncapped interval.

**Reason.** The next multiplication then grows from what really happened. A card the cap cut from 50 days to 22 grows to 55 next time, not to 125.

**Rejected.** Storing the uncapped interval, which makes the first review after the exam jump.

## D-065 Study: A lapsed card is due at the next 4 am

**Decision.** Again sets `due` to the start of tomorrow's study day. The 10-minute return (`requeueAfterMs`) exists only inside the session that asked for it.

**Reason.** `due` stays at the start of a study day, as specified, which matches SM-2's 1-day interval. If the student leaves, the card comes back tomorrow.

**Rejected.** Storing `due` as now plus 10 minutes, which would count in the status bar and bring the card back outside the session.

## D-066 Study: When the final-week cap applies

**Decision.** Before the exam starts, intervals are capped at 2 days when the current study day is 7 or fewer days before the exam's study day, including the exam day itself. Separately, due dates are clamped to no later than exam day minus 2, and never earlier than tomorrow.

**Reason.** This is the most literal reading of "the final 7 days before the exam's study day".

**Rejected.** Measuring the 7 days in milliseconds from the exam's start time.

## D-067 Study: How Drill and Written choose the weakest KKs

**Decision.** KKs that have items are ranked with seen ones first (lowest mastery first), then unseen ones in study design order. KKs are taken from the top until there are at least 3 KKs and enough items for the round, and the questions are drawn from them round-robin.

**Reason.** This follows the brief's definition: the lowest-mastery seen KKs, topped up with unseen ones when fewer than 3 have been seen.

**Rejected.** Reusing the terminal drill's ranking from D-038 (seen below 65, then unseen, then the rest).

## D-068 Study: The run's drill tops up from the next weakest KKs

**Decision.** Step 2 of Today's run takes every question from the single weakest KK first, then fills to 10 from the next weakest KKs in the same ranking.

**Reason.** Most KKs will have only 3 to 5 MCQs, so a drill on one KK alone could rarely reach 10.

**Rejected.** A round limited to the one weakest KK, which would usually be 3 to 5 questions.

## D-069 Study: The run's review step includes new cards

**Decision.** Step 1 of Today's run uses the normal review queue (due cards, then new cards up to the daily limit) and is skipped with a note only when that queue is empty.

**Reason.** New cards are how coverage grows each day, and Home's preview says how many are in the step.

**Rejected.** Due cards only, which would leave the run introducing no new cards.

## D-070 Study: Timed rounds and unanswered questions

**Decision.** A timed drill allows 72 seconds per question (20 questions in 24 minutes), so a round with fewer questions available gets proportionally less time. At time-out, unanswered questions count as wrong in the round's score but aren't written to the attempt log. Feedback still shows after each answer while the clock keeps running.

**Reason.** An unanswered question says nothing about what the student knows, so it shouldn't lower mastery (the same reasoning as D-034). Showing feedback keeps both modes consistent with Section 6.4.

**Rejected.** Logging unanswered questions with a score of 0, and holding all feedback until the end of the round.

## D-071 Study: How the coverage grid shows unseen KKs and mastery bands

**Decision.** A seen cell is a solid box with a four-segment gauge, with 1 to 4 segments lit for weak, shaky, solid and strong. An unseen cell is a dashed outline on the page background with no gauge. A legend explains both. Each cell is a button whose accessible name gives the KK id, the title and "62% mastery" or "unseen".

**Reason.** The number of lit segments and the dashed or solid frame carry the meaning without colour, using only the seven palette tokens.

**Rejected.** A colour-only heatmap, and making new shades by mixing tokens.

## D-072 Study: Screen widths for the map and case study

**Decision.** The syllabus map shows four columns from a 1280 px viewport, two from 900 px and one below that. The case study insert sits beside the question from 1100 px; below that it folds into a collapsible section and the referenced figures show with the question.

**Reason.** Below these widths the columns become too narrow for a KK row or for figures.

**Rejected.** Four fixed columns at every desktop width.

## D-073 Study: Written marking flow

**Decision.** Rounds are 5 short answers. The score is recorded only when the student presses "Save score", the mistake note appears after that, and the draft is cleared then. Case study answers are kept in memory, so going back to a question shows the answer, the ticked points and the saved score.

**Reason.** Recording once, on an explicit action, avoids double logging while points are being ticked, and follows the spec's order: record, then show the mistake.

**Rejected.** Recording automatically on every tick.

## D-074 Study: Keyboard shortcuts

**Decision.** Single-key shortcuts listen on the document. They're ignored when focus is in a text field, when any dialog (the report dialog included) is open, when the terminal drawer is open, or when a modifier key is held. Space and Enter on a focused button use the button's own activation.

**Reason.** This gives full keyboard use without taking keys from the terminal, fields or dialogs.

**Rejected.** Handling keys only on the focused card or question, which fails whenever focus moves elsewhere.

## D-075 Study: Detecting that the daily challenge is done

**Decision.** Today's run treats the daily as done when `useTerminal.lastGameEnd` reports gameId `daily` after the step began, or when today's session record has `completedAt`. This is worked out while rendering rather than set in an effect. If `findGame('daily')` is undefined, the step is skipped with a note.

**Reason.** Both completion paths are covered, and the run never waits for a game the build doesn't have.

**Rejected.** Waiting only on `lastGameEnd`, which misses a daily finished before the run started.

## D-076 Games: Answers come from interpreters and validators, checked a second way

**Decision.** deskcheck and triage answers come from the pseudocode interpreter, validate answers from `firstFailedCheck`, and test-table coverage from interpreter runs. The tests check each game a second way: deskcheck re-parses the printed listing and question and runs them, and validate uses a reference validator that reads only the printed specification.

**Reason.** Section 12 says answers are never hand-computed, and checking the printed text catches mistakes in how items are rendered.

**Rejected.** Comparing each item with the spec objects that built it, which would share the generator's own mistakes.

## D-077 Games: The pseudocode interpreter is deliberately strict

**Decision.** AND and OR evaluate both sides. A FOR loop's variable can't be reused or changed, and it stops existing when the loop ends. Blank lines, tabs, trailing spaces, wrong indentation, ASCII operators (`<-`, `<=`) and unknown all-caps words are syntax errors. Numbers are either whole or floating point (Real).

**Reason.** A generator that relied on short-circuiting or on a loop variable's value after the loop would teach something that depends on the language. The strictness makes the 500-seed tests catch that, and keeps listings in the house style.

**Rejected.** Short-circuit evaluation and loose parsing.

## D-078 Games: Whole-number and floating point answers

**Decision.** A whole-number answer must be typed without a decimal point, and a floating point answer with one; the question says which. Templates that use `/` always give a result that isn't whole and has a terminating decimal, and a test asserts it.

**Reason.** The brief says 7 is not 7.0 unless the question asks for floating point.

**Rejected.** Accepting any numerically equal value.

## D-079 Games: The index base is stated wherever arrays appear

**Decision.** A listing states its index base (through `pseudo.indexBase` and the grid table caption) whenever the listing, its data or a call uses an array. Both bases are used. The spoken digest in `src/terminal/speech.ts` reads the base aloud too.

**Reason.** `docs/PSEUDOCODE.md` says questions involving arrays state the base, and the tests check array questions for it. Stating a base on a listing with no arrays would confuse students.

**Rejected.** Stating the base on every question, even ones without arrays.

## D-080 Games: What counts as a boundary in a test table

**Decision.** For each band, the student tests its lowest value and the value just below it. Hard items also require the lowest and highest valid inputs and the invalid values just outside them. Inputs are compared as a set, in any order. On easy and normal, inputs outside the stated domain re-prompt without counting.

**Reason.** This is the "exact boundary and its neighbour" rule, and each item explains it.

**Rejected.** Requiring a fixed order, or accepting inputs the requirements don't define.

## D-081 Games: deskcheck rounds mix trace and test-table questions

**Decision.** A deskcheck round has 9 trace questions and 1 test table on easy, and 8 and 2 otherwise. A test table is never first.

**Reason.** The terminal has no flag for choosing a round type, and mixing gives practice at both.

**Rejected.** A separate test-table-only mode.

## D-082 Games: triage runtime answers

**Decision.** The student types syntax, logic, or the kind of runtime error directly. Typing "runtime" on its own re-prompts for the kind without counting as an attempt.

**Reason.** One question per case fits the quiz engine, and nothing leaks, because the re-prompt happens whatever the right answer is.

**Rejected.** A separate question for the kind of runtime error.

## D-083 Games: triage technique follow-ups

**Decision.** Each follow-up states what the programmer wants to find out, so exactly one technique fits (for example, pausing at line N means a breakpoint). Syntax cases always get commenting out code, the only one of the three that works before a program can run. In a round the follow-up doesn't reprint the listing, and its instance is `triage:follow-up:...` so it regenerates exactly.

**Reason.** Asking which technique is "most useful" is otherwise open to argument, and the brief asks for defensible answers.

**Rejected.** Open judgement questions.

## D-084 Games: validate asks one question per input

**Decision.** The batch of four inputs is shown as a table that fills in as the student answers, one question per input, followed by a boundary question on the same field. A round covers two fields of different kinds.

**Reason.** Chips submit as soon as they're tapped, so they can't build a multi-word answer. One question per input also gives per-input feedback and scoring.

**Rejected.** One question for the whole batch.

## D-085 Games: Every validate input has one reading

**Decision.** Inputs never use negative numbers in whole-number fields, extra decimal places or plain whole numbers in decimal fields, impossible dates, or whitespace-only values. Length limits on text are checked by the range check, and the question says so.

**Reason.** The brief asks that every item be unambiguous about which single check fires first, and the study design names only three checks.

**Rejected.** Format or length checks as a fourth type.

## D-086 Games: blitz tolerance

**Decision.** Distance is optimal string alignment, so swapping two neighbouring letters counts as 1 edit. Allowed: 1 edit for 4 characters or fewer, 2 for 5 to 14, and floor(n / 5) from 15. An exact match with a different glossary term is always wrong. Input is normalised for case, punctuation, hyphens and a leading article. The rule is written out in `src/games/blitz/match.ts`.

**Reason.** Two edits turn one short acronym into another (XML and HTML), and a real but different term should never count.

**Rejected.** A flat 2 edits for every length, as the brief states literally.

## D-087 Games: blitz attempts are recorded against the glossary card

**Decision.** A blitz attempt is logged with the glossary card's id and KKs, with no instance.

**Reason.** A report then opens the right content item, and mastery is credited to that card's KKs.

**Rejected.** A generated id such as `gen-blitz`.

## D-088 Games: daily keeps the stored set

**Decision.** Once a day has started, the daily game rebuilds its set from the stored record's item ids. A stored MCQ that has since left the content is replaced in place by a generated item, and the student is told. Generated items use normal difficulty for everyone.

**Reason.** The host records results by position, so the set must not shift mid-day.

**Rejected.** Rebuilding from `buildDailySet` on every start.

## D-089 Games: daily loads its generators through the registry

**Decision.** `loadDailyGame` loads the five generator games with `findGame(id).load()` and then builds the game.

**Reason.** `Game.start` is synchronous, so generation can't wait for game modules inside it. This follows track B1's note without statically importing every game.

**Rejected.** Static imports of each game's generate function.

## D-090 Games: Games with one difficulty

**Decision.** blitz and daily set `fixedDifficulty`. The terminal refuses `--easy` and `--hard` for them with a plain message, doesn't print a difficulty line, and no longer offers those flags for `daily` in completion.

**Reason.** The daily set must be the same for everyone, and blitz has one level.

**Rejected.** Ignoring the flags and printing "Hard difficulty" anyway.

## D-091 Games: The daily game's folder is daily-game

**Decision.** The daily game lives in `src/games/daily-game/`, beside the shared `src/games/daily.ts`.

**Reason.** Importing `./daily` resolves to the existing `daily.ts`, so a `daily/` folder would be ambiguous.

**Rejected.** Moving `daily.ts`, which other tracks already import.

## D-092 Games: Registry order

**Decision.** `GAMES` follows the brief's order: deskcheck, sort, search, triage, validate, blitz, daily. `shell.test.ts` now removes only the fake games it adds.

**Reason.** `ls` prints this order, and deskcheck is the flagship.

**Rejected.** Appending the new games after sort and search.

## D-093 Floors enforced everywhere again

**Decision.** Supersedes D-009. With Phase 1 content in (503 cards including 75 glossary cards, 221 MCQs, 104 short answers and one case study, all floors met), branch CI enforces the floors in both the tests and `content:check`, exactly as the deploy does.

**Reason.** The relaxation existed only while content was being authored.

**Rejected.** Keeping the warn mode on branches, which would let a later content change drop a KK below its floor unnoticed until deploy.

## D-094 Content authoring in fragments with a separate review

**Decision.** Content was written as 13 fragment files outside the repository (one per group of KKs, plus the glossary, the PSM and case study 1), checked with `scripts/content-parts.ts check`, reviewed item by item by a second agent, and merged with `scripts/content-parts.ts merge`. Reviewers logged every drop and every held-back topic, and those logs make up `docs/CONTENT_NOTES.md`.

**Reason.** Parallel authors editing the same JSON files would conflict, and Section 8.3 requires a separate review pass.

**Rejected.** One author per outcome writing straight into the content files, which would have been slower and left no second pair of eyes on each item.

## D-095 Phase 1 design critique and Lighthouse

**Decision.** Before Phase 1 closed, a critic took 190 screenshots of every screen at 1280 and 360 px, with real content and seeded progress, and ran Lighthouse and axe. A separate fixer resolved all 29 findings on its own branch; `docs/DESIGN.md` records the details. The fixes that matter most:
- the daily set's ranking now runs through an avalanche finaliser (`mix32`), because plain FNV-1a kept sibling item ids together and a day's eight MCQs came from two or three KKs;
- terminal output reflows on phones, so the share line and the `help` table are no longer cut off;
- scroll padding keeps focused controls clear of the fixed status bar and tab bar (WCAG 2.4.11);
- figure labels and code never render below 14 px;
- the rating buttons explain when the exam cap makes several ratings land on the same day.

After the fixes, axe reports 0 violations and Lighthouse accessibility is 100 on every route tested. Desktop performance is 99 to 100, and mobile performance varies between 92 and 99 with blocking-time noise.

**Reason.** Section 9 asks for a critique against the design principles before Phase 1 closes, and Section 14 sets Lighthouse targets of accessibility 95+ and desktop performance 90+.

**Rejected.** Closing Phase 1 on component tests and the track agents' own screenshots alone. The critic found the daily clustering bug and several phone-only breakages that no test had covered.

## D-096 Exam: Mini paper timing

**Decision.** 30 minutes in all: 3 minutes of reading, then 27 of writing. Reading time is scaled from the full paper (15 of 135 minutes is a ninth, and a ninth of 30 is about 3). The 30-minute warning doesn't apply because writing time is only 27 minutes.

**Reason.** Reading time is an exam skill worth practising daily (planning, reading the insert), and a 30-minute total matches about 25 marks at exam pace.

**Rejected.** No reading time (loses the habit), and a full 15 minutes (half the session).

## D-097 Exam: No pause, no skipping reading time, and submitting only in writing time

**Decision.** The phase comes only from startedAt, submittedAt and the paper's stored timing. Submitting is only possible in writing time. Discarding is the only way out. The timing is stored with each paper, so a new build never changes a paper under way.

**Reason.** It is a simulator: realism of timing is the point, and deriving the phase from timestamps is what makes it survive reloads.

**Rejected.** An early-start button for writing time; pausing.

## D-098 Exam: Automatic submission is stamped at the end of writing time

**Decision.** When the page (or a later reopening) finds writing time over, it stores submittedAt at the end of writing time and marks the paper as submitted automatically. Time used is capped at the time allowed.

**Reason.** The report's time used must be true even if the tab was closed for hours.

**Rejected.** Stamping the moment the tab noticed.

## D-099 Exam: Unanswered questions aren't logged as attempts

**Decision.** Finish marking records every answered item (MCQs 0 or 1, written answers marks earned over marks available). Unanswered items score 0 on the paper and in the report but aren't written to the attempt log. Each attempt's ms is a share of the time used, proportional to its marks. The integration kept this reading.

**Reason.** This follows D-070: an unanswered question says nothing about what the student knows. It also matches "every answer is recorded". The ms sharing keeps time-studied stats equal to the time used.

**Rejected.** Logging unanswered items with a score of 0, which a literal reading of the brief's "every item" would suggest.

## D-100 Exam: How Section A is shared out

**Decision.** An item's bucket is its primary KK's area, or PSM (glossary items count toward their first area). Every bucket with questions gets one slot, then each further slot goes to the bucket furthest below its share by KK count. That gives U3O1 5, U3O2 6, U4O1 4, U4O2 4, PSM 1 for the full paper, and 2/3/2/2/1 for the mini. Within an area, questions are taken one KK at a time in seeded order.

**Reason.** A pure KK-count share gives the PSM 0.38 of a question, which rounds to none, yet the brief wants it included.

**Rejected.** Plain largest-remainder rounding, which drops the PSM.

## D-101 Exam: Near-identical MCQ groups

**Decision.** Two MCQs are near-identical when their stems' content words overlap by 0.6 or more (Jaccard), or when they share a KK and at least 3 of 4 option texts. Groups are joined through chains of such pairs. The rule is relaxed only when the pool can't fill the section otherwise.

**Reason.** The content has no explicit variant groups. In current content this keeps 5 same-options pairs apart (for example the two "which OOP concept" MCQs) without treating distinct questions such as alpha versus beta testing as twins.

**Rejected.** A new schema field for groups (a content contract change outside this track).

## D-102 Exam: Section B has five or six questions, one per area in turn

**Decision.** The seed prefers 5 or 6 questions (50/50). Each question count is tried nearest-preferred first, drawing one question from each area in turn with a completability table. Failing that, any subset (suffix subset-sum table) that makes exactly 20; failing that, the nearest total below 20.

**Reason.** Short answers are worth 2 to 4 marks, so five questions totalling 20 are always five 4-mark items. Allowing six gives a mix of marks, and taking areas in turn guarantees all four areas.

**Rejected.** A greedy pass in plain interleaved order, which sometimes drew from only two areas.

## D-103 Exam: Case study choice and the mini paper's slice

**Decision.** Case studies in id order, seed mod n, skipping the one sat last time when another exists. The mini slice is chosen uniformly by seed among every subset of 2 to 4 questions (kept in insert order) worth 10 to 15 marks. When none fits, the 1 to 4 question slice closest to 12 marks.

**Reason.** Deterministic for a seed, and it varies between papers once more case studies land.

**Rejected.** Contiguous runs only, which limit variety.

## D-104 Exam: Exam views in the URL

**Decision.** `/exam?sit=1` is the paper in progress and `/exam?report=<id>` a report, both built in src/exam/links.ts. `/exam` always shows the start screen with Resume, so a stray visit never starts or resumes a paper by itself. A reload on `?sit=1` goes straight back into the paper. Each view's heading takes focus, and the page scrolls to the top between views.

**Reason.** Reloads return to the same place without touching the shared paths.ts or routes.tsx.

**Rejected.** Keeping the view in component state, or adding helpers to paths.ts.

## D-105 Exam: The store ships only data with the shell

**Decision.** store.ts holds the types, schema, salvage, merge, persistence and replace/reset. `examActions` (start, answer, clearAnswer, toggleFlag, goTo, noteWarned, submit, setTicks, finish, discard) is in actions.ts, which only the lazy exam chunk loads. The timer isn't in the shell at all.

**Reason.** The brief asks that the shell barely grow: +5.5 kB raw instead of +9 kB.

**Rejected.** Actions inside the Zustand store (the pattern the other stores use).

## D-106 Exam: Cross-window merge

**Decision.** History is the union of both windows, one entry per paper id. A paper the other window has marked is removed. If the other window cleared its paper, it is cleared here too. Different papers: the more recently started wins. Same paper: this window's unsaved answers and ticks win, and the earlier submission stands.

**Reason.** Two windows on one profile (the installed app and a tab) must not resurrect finished papers or lose the latest typing.

**Rejected.** Taking the other window's data wholesale (the persist default).

## D-107 Exam: Warnings are remembered with the paper

**Decision.** Warning marks already given are stored with the paper, so a reload doesn't repeat them. After a reload or a sleeping tab, only the most urgent missed warning is spoken, as "Less than N minutes of writing time left." The visible notice always shows the most urgent mark reached.

**Reason.** Assertive announcements must not repeat, or be stale, after a reload.

**Rejected.** Keeping the given warnings in memory only.

## D-108 Exam: Marking view details

**Decision.** Submission resets the position to the first question, so marking starts at Section A question 1. Written answers left blank score 0 and can't be ticked. The finish dialog warns how many answered written responses have no ticks. Report a problem is offered in both the sitting and marking views.

**Reason.** Predictable marking order; every item keeps a Report action.

**Rejected.** Starting marking at whichever question the student had open when they submitted.

## D-109 Exam: The case study panel and marking points are shared with Written

**Decision.** CaseInsert.tsx (CASE_WIDE_QUERY, CaseInsert, CaseStudyLayout, QuestionFigureRefs) and MarkingPoints.tsx (ModelAnswer, MarkingPoints) were moved out of CaseStudyPractice and WrittenQuestion unchanged. Written.module.css `.insert` reads `--case-insert-top`, defaulting to the old 16 px, so the exam's sticky bar can push the panel down. At the merge, the design critique's "Show the case study insert" and "Hide the case study insert" summary moved into CaseStudyLayout, so the exam has it too.

**Reason.** The brief asks to import rather than copy.

**Rejected.** Copying the panel and the checkboxes into src/exam.

## D-110 Games: Figure blocks carry highlight and compact

**Decision.** Extended the TerminalBlock figure kind with optional `highlight` and `compact`, which BlockView passes to FigureView. The speech digest reads out the marked elements from describeFigure.

**Reason.** The brief asks for letter markers on terminal diagrams, and the block had no way to carry them. A screen reader user must be able to answer "which element marked B".

**Rejected.** Putting the markers only in the prompt text, which leaves the diagram unmarked; or a game-specific block kind.

## D-111 Games: Actor-to-actor associations validate

**Decision.** Relaxed UseCaseDiagramSchema's refinement: an association must involve at least one actor, so an actor-to-actor association validates. A use-case-to-use-case association is still rejected.

**Reason.** The brief names actor-to-actor association as an error to render, and figures must pass FigureSchema. The DFD schema already accepts every convention error the dfd game teaches (an unlabelled flow, entity to entity), so schemas check structure and not conventions. The renderer and describeFigure already handled it.

**Rejected.** Dropping that error from usecase, or adding an opt-in flag field to the figure schema.

## D-112 Games: Non-functional requirement types in reqs

**Decision.** Used reliability, usability and portability (the support material's examples), plus efficiency (response time) and maintainability. Security is excluded.

**Reason.** A security statement reads too easily as a function (a login, encryption) or as a legal constraint (privacy law), so it can't be kept unambiguous. Efficiency and maintainability have clear textbook meanings. Easy rounds use only the three support-material types.

**Rejected.** Including security, performance/capacity and accessibility as separate types.

## D-113 Games: psm has no generate()

**Decision.** psm sets needsContent, builds its items from ctx.content.psm and sets `instance`, but implements no Game.generate and isn't marked generator.

**Reason.** Game.generate(seed, difficulty) receives no content, and the brief says psm draws on content/psm.json. The daily set leaves psm out for the same reason (D-147).

**Rejected.** Statically importing psm.json into the game chunk, which would duplicate content outside the loader and skip its validation.

## D-114 Games: One hand-laid dfd layout in four views

**Decision.** One Level 1 DFD layout (three columns: entity, process, store) and one matching context layout. A seed picks one of four views: as laid out, mirrored left to right, flipped top to bottom, or both. Explicit coordinates throughout, with injected flows placed on straight lines between neighbouring elements; the context entity-to-entity label is pinned on the outer side.

**Reason.** Every topology edge and every injected error then has a clean straight path, which the layout tests verify. The views move the faulty element around the page. A second arrangement with processes in a row needed diagonals that crossed the paired flow labels, or a canvas about 1000 units wide.

**Rejected.** A second DFD topology per business, which doubles the hand-written labels, and any auto-layout.

## D-115 Games: Only part of a DFD is shown

**Decision.** Error-round DFDs are captioned "Only part of the diagram is shown." A process loses its inputs or outputs only when every other element keeps a flow and every other process keeps an input and an output.

**Reason.** Some stores are only read or only written in the layout, and removing flows can make that more visible. The caption stops a student treating it as a seventh error, and the injection filter keeps the injected error the only one.

**Rejected.** Adding a store-must-be-read-and-written rule, which the brief doesn't list.

## D-116 Games: dfd noun names and word bank

**Decision.** Noun process names were chosen so their first word can't be read as a verb (Parcels, Delivery dockets, Payment receipts, not Packing slips or Courier bookings). The labelling word bank holds exactly the blanked labels, sorted alphabetically and numbered; the student answers by label or number.

**Reason.** A noun name that can be read as a verb phrase would make the "noun" error arguable. A bank of only the blanks, each pinned by its flows, gives each blank one answer.

**Rejected.** Distractor labels in the word bank, which would need case-by-case proof that they fit no blank.

## D-117 Games: dfd round shape and chips

**Decision.** A round is three error diagrams (letter, then rule, each a different rule and business) plus one labelling diagram with four blanks, placed at a seeded position. Easy draws a context diagram for errors that can appear on one 60% of the time, normal 35% and hard 15%; hard marks five elements instead of four. Rule chips are the numbers 1 to 6.

**Reason.** This gives exactly 10 questions and covers both round types in every round. The rules are printed as a numbered list just above, and six phrase chips took five rows at 360 px.

**Rejected.** A mode flag for round type, which the terminal has no way to pass, and phrase chips.

## D-118 Games: The dfd rule question follows the element question

**Decision.** The element question's feedback names the faulty element but not the rule. In a round, the rule question is a follow-up that doesn't reprint the diagram; standalone, it shows the diagram with only that element marked.

**Reason.** Naming the rule in the first feedback would give away the second question. The follow-up pattern matches triage's (D-083).

**Rejected.** One two-part answer such as `C 2`, which chips can't build and which gives less precise feedback.

## D-119 Games: gantt wording, chart stages and table

**Decision.** Questions and reasons never say slack or float. asciiGantt's Slack header becomes "Spare" and its key ". spare days", with a sentence after the chart explaining the dots. The chart reveals only what has been asked: bars after the duration question, critical marks after the critical path, spare days after later questions. The plan table's columns are Task, Description, Days, After.

**Reason.** U3O2-KK03's verify note leaves open whether slack is named, so the man page mentions it only as an aside. A column headed "Depends on" clipped at 360 px.

**Rejected.** Hiding the spare-days column altogether, or keeping "Depends on" with a clipped table on phones.

## D-120 Games: gantt plan generation and questions

**Decision.** Five project templates for invented organisations. Each is cut to 5 to 9 tasks, keeping the first task, the main coding task, testing and the last task; a dropped task's dependants inherit its dependencies, with implied ones pruned. Durations are re-rolled until there is exactly one critical path of 3 or more tasks, at least two tasks with time to spare, and a length of 45 days or less. "Finishes n days later than planned" is the delay question, and its answer is recomputed rather than assumed. The milestone question is four options: the right event on the right day, the same event on its start day, a task with a duration, and "halfway through" a task.

**Reason.** A single critical path makes "the critical path" one answer, and plans keep a sensible order. Recomputing the shift keeps the answer tied to computeSchedule.

**Rejected.** Random dependency graphs with arbitrary task names, and accepting any of several tied critical paths.

## D-121 Games: gantt and reqs KK tags

**Decision.** gantt tags U3O2-KK03 and adds U4O1-KK12 on the late-finish question. reqs tags each classification with its answer's KK (U3O2-KK05, 06 or 07) plus U3O1-KK02, and the quality follow-up with U3O2-KK05.

**Reason.** Mastery is then credited to the KK the student actually got right or wrong. Explaining how a slip moves the finish fits "assessing the project plan".

**Rejected.** One fixed KK list for every item in a game.

## D-122 Games: usecase item design

**Decision.** Actors are chosen by typing their numbers from a list: every actor, in any order. Every non-actor candidate is mentioned in the scenario: the system itself, data, hardware, or a party with no contact with the system. Spot-the-error marks four elements (five on hard), favouring the same kind as the faulty one, and each scenario states which step always happens and which only sometimes. Arrows follow the content's convention: includes from the base, extends into the base.

**Reason.** Typed actor names can't be matched reliably. Marking elements of the same kind makes students read the scenario, and the direction rule matches the existing content.

**Rejected.** Typing actor names freely, and asking what is wrong with a diagram in free text.

## D-123 Games: P1 registry order and its test

**Decision.** GAMES lists the seven P0 games, then the P1 games in the brief's order (dfd, usecase, reqs, gantt, psm so far). The registry test now checks that P0 prefix, and that the P1 games that exist follow the brief's order. Superseded in part at the merge: with all ten P1 games built, the test now checks the full P1 order exactly.

**Reason.** Other tracks are adding threat, law, naming, types and oop in parallel. A subsequence check lets their entries merge in without rewriting the test.

**Rejected.** Hard-coding the full list in the test, which every parallel track would conflict on.

## D-124 Games: The types game's folder is types-game

**Decision.** The types game lives in src/games/types-game/ (the game id is still `types`), and the registry loads `./types-game`.

**Reason.** src/games/types.ts, the game contract, already answers every `./types` and `../types` import, so a `types/` folder would be ambiguous. This follows D-091 (daily-game).

**Rejected.** src/games/types/ as literally assigned. It would work only with explicit `./types/index` imports, and one plain `./types` import would silently load the contract instead.

## D-125 Games: Shared parsers for lettered answers

**Decision.** Added OPTION_LETTERS (A to H), parseOption and parseLetters to src/games/answers.ts. parseOption accepts a letter, the option's text, or both as feedback prints them (`B. Version control`). parseLetters reads a set such as `A C D`, `a, c, d` or `acd`. Tests are in a new src/games/answers-options.test.ts.

**Reason.** threat, law and oop all need to accept typed-back option text and multi-letter answers, and the existing LETTERS stops at F while the Essential Eight list needs up to H. A new test file avoids touching answers.test.ts, which another track owns.

**Rejected.** Copying the helpers into each game folder, or changing the existing LETTERS and parseChoice exports.

## D-126 Games: Registry test and man-page abbreviations

**Decision.** registry.test.ts uses the same P0-then-P1 ordering test as track G1, word for word. The man-page all-caps check now allows CSV and XML. At the merge the two tracks' flag checks became one list of generator games.

**Reason.** The identical hunk should merge cleanly with G1. CSV and XML are abbreviations the brief says to keep, and students type them as answers in `types`.

**Rejected.** Writing "comma-separated values" and "extensible markup language" throughout the man page.

## D-127 Games: How the law scenarios are built

**Decision.** Rules relied on, at textbook-summary level: the Privacy Act 1988 (Cth) binds Australian Government agencies, private organisations with annual turnover above $3 million, and some smaller businesses such as health service providers, and it does not cover state or local government. The Privacy and Data Protection Act 2014 (Vic) binds the Victorian public sector (departments, councils, government schools) and the contracted service providers its contracts bind, and a private business is not covered just because it is based in Victoria. Health information held in Victoria, by public or private organisations, goes under the Health Records Act 2001 (Vic), not the PDP Act. The Copyright Act 1968 (Cth) protects code, images and text, so reuse needs permission or a licence, and being published online does not make a work free to copy. Every stated turnover sits far from $3 million. Where two Acts genuinely apply (a private Victorian health provider), the question asks for "the Victorian Act" or "the Commonwealth Act" and the feedback names both. "Why" options only use statements that are false for the scenario, plus the one true reason for its Act, all phrased around who holds the information.

**Reason.** Each scenario then has exactly one best answer, and the test re-derives it from the scenario's recorded facts. Keeping turnovers far from the threshold means a small-business law reform would not flip an answer.

**Rejected.** Accepting two answers with an explanation. Asking which Act applies to a small non-health business under $3 million, where arguably none of the four does.

## D-128 Games: The Office macro strategy's name

**Decision.** The option reads "Restrict Microsoft Office macros", matching content card c-u4o2-kk07-005. The man page adds that it is also described as configuring Microsoft Office macro settings.

**Reason.** The name matches the app's own cards, and a student who learned the older name the brief uses is not misled.

**Rejected.** Using only "Configure Microsoft Office macro settings", which would clash with the cards.

## D-129 Games: threat distractors

**Decision.** Each control lists the other controls that could reasonably be argued against its weaknesses (ALSO_HELPS), and some scenarios add their own (alsoHelps). None of these is ever offered as a distractor. Essential Eight distractors are checked so none is another name for one of the eight: no application whitelisting, browser patching, two-factor or daily backups.

**Reason.** This keeps exactly one clearly best answer when several controls partly help.

**Rejected.** Drawing distractors at random from all controls, which would sometimes offer a defensible second answer.

## D-130 Games: naming rules

**Decision.** A prefix from the stated table followed by a capital letter makes an identifier Hungarian notation, even though the rest looks like camel case. Pascal case, kebab case and capitalised snake count as "none of the three", and typing `pascal` or `kebab` for those also counts. A Hungarian name is the lowercase prefix followed by each word capitalised. Rewrites must match exactly and are case-sensitive; only whitespace and wrapping quotes or backticks are stripped. Hungarian variables name their type below hard, and on hard are described by their data only.

**Reason.** strFirstName is both Hungarian and camel-shaped, so a stated priority rule is needed for one answer. Accepting the lookalike's own name rewards correct knowledge.

**Rejected.** Treating prefixed identifiers as camel case. Accepting case-insensitive rewrites.

## D-131 Games: How types and oop treat informal answers

**Decision.** Short type names (int, float, char, bool, text, number) and a bare `array` re-prompt without recording an attempt, with a reminder to name the type in full or say which array. The oop object figure shows name and data type only; a data-type blank states the property's description above the question. Ambiguous type blanks (yearLevel, seatNumber) were removed. oop imports the types-game answer parser.

**Reason.** This teaches the "name data types in full" advice without marking a nearly right answer wrong. The two-column figure matches exam object descriptions and fits 360 px without sideways scrolling.

**Rejected.** Marking short forms as incorrect. Showing a Description column, which scrolled sideways on phones.

## D-132 Games: Access modifiers stay language-neutral

**Decision.** protected means the class and its subclasses, and no protected question names Java. Questions that depend on package access say "The program is written in Java". "default" is also asked language-neutrally as the name for the access a member gets when no modifier is written.

**Reason.** The brief asks for accuracy about protected and default without Java-only rules unless the language is stated. Tests enforce both rules.

**Rejected.** Java semantics everywhere (protected includes the package), which would make the neutral protected scenarios ambiguous.

## D-133 Games: Item ids and round shapes for threat, law, naming, types and oop

**Decision.** Attempt item ids are per kind (gen-threat-match, gen-threat-e8, gen-law-act, gen-law-why, gen-naming-identify, gen-naming-rewrite, gen-types-type/structure/source, gen-oop-principle/object/access), and the scenario goes in `instance`. Rounds of 10:
- threat: 7 weaknesses with different controls and 3 Essential Eight lists, never first and never side by side;
- law: 5 scenarios asked as Act then why, over at least 3 Acts;
- naming: 4 identify and 6 rewrite, with no phrase repeated;
- types: type, structure, source in turn;
- oop: 4 principles, 3 objects, 3 access modifiers, with answers spread.

**Reason.** This matches the existing games' id style, and generated items never count toward content floors. The instance can regenerate any reported item.

**Rejected.** Per-scenario item ids, which would scatter attempt statistics.

## D-134 Stats: The chart window is calendar study days

**Decision.** The history charts cover the last 21 study days on the calendar (4 am rollover), ending today, and a day without data is drawn as a gap.

**Reason.** Gaps only mean something on a calendar axis. It also means accuracy, reviews and time share one x-axis.

**Rejected.** Using the last 21 days on which the student studied, which would hide the days they skipped.

## D-135 Stats: Accuracy is drawn as lines with dots

**Decision.** Each area is a 0 to 100% line with a dot on every day that has answers. A day with no answers breaks the line.

**Reason.** With columns, a day at 0% and a day with no answers would look the same. Dots also show a single isolated day.

**Rejected.** Columns per area.

## D-136 Stats: Accuracy is the mean score

**Decision.** Accuracy is summed score over answers. Card ratings contribute their scores (Again 0, Hard 0.5, Good 0.8, Easy 1), and the chart says so.

**Reason.** That is what DayActivity.areas stores as [n, s] pairs.

**Rejected.** Counting only multiple-choice and game answers, which the stored activity can't separate.

## D-137 Stats: Due forecast buckets

**Decision.** Cards are bucketed by the study day they fall due over 14 days from today. Anything already due counts today and is drawn hatched. Records for cards that have left the content are left out, and cards due after the window are shown as one number.

**Reason.** This agrees with the due count everywhere else, and the hatch pattern separates due-now from due-later without relying on colour.

**Rejected.** Leaving overdue cards out of the forecast.

## D-138 Stats: Charts are drawn at their measured pixel width

**Decision.** A ResizeObserver measures each chart's box and the SVG is drawn at that pixel width. Label widths come from per-character estimates measured in the reading font (digits 9 px, % 13 px). Gridlines use --trench, one step off the page colour; baselines use --steel.

**Reason.** A scaled viewBox would shrink the text below 14 px at 360 px. The design rules forbid tinting tokens, so no opacity on gridlines.

**Rejected.** A viewBox with preserveAspectRatio, or --steel gridlines at reduced opacity.

## D-139 Stats: One empty state for no progress, per-chart ones otherwise

**Decision.** With no activity, no scheduled cards and no mastery, the page shows one empty state pointing to Start today's run. Otherwise each empty chart has its own next step, and its data table is hidden.

**Reason.** Five identical empty charts would be noise for a new student.

**Rejected.** Always rendering all five sections.

## D-140 Stats: Weakest KKs as an HTML list with SVG bars

**Decision.** Each weakest KK is a list row with a link (id and title) that wraps, a bar on a shared 0 to 100% scale, and the value in words with its mastery band.

**Reason.** KK titles have to wrap at 360 px, which SVG text can't do, and each row needs to be a real link to its drill.

**Rejected.** An all-SVG horizontal bar chart, or reusing Meter, which has no shared scale.

## D-141 Daily: A start button, then the stored record decides the question

**Decision.** The screen shows an intro with "Start the daily challenge" (or "Carry on from question N"). Starting calls beginDaily and pins the Melbourne date. The question shown is always the first unanswered one in the stored record, except while this screen is showing feedback for the question just answered.

**Reason.** The screen and the terminal share one record, so an answer in either moves both on. Pinning the date keeps an answer given just after midnight with the set it belongs to.

**Rejected.** Keeping a separate question index on the screen, which would drift from the terminal.

## D-142 Daily: Generated questions use a text field, suggested-answer buttons and Feedback

**Decision.** The prompt is drawn with the terminal's BlockView on a terminal-style panel. Answers go in a labelled field or through the item's chips as buttons. Input the item can't read shows its hint as a field error and isn't recorded. The verdict uses the Feedback primitive, and follow-up blocks such as traces go through BlockView.

**Reason.** Multiple-choice and generated questions then look and announce the same on this screen, and the terminal's rendering is reused.

**Rejected.** Embedding a second terminal view, or rendering the terminal's feedback block, which doesn't announce.

## D-143 Daily: Home links its daily status to the Daily screen

**Decision.** Home's daily challenge status is a link to /daily. The status text moved into a const, and the link has the accessible name `Daily challenge: <status>`.

**Reason.** A visually hidden prefix lost its space in the accessible name, and a bare "Not done yet" is unclear in a list of links.

**Rejected.** A link with no extra context, or a VisuallyHidden prefix.

## D-144 Stats: The end-to-end run uses default motion and a pinned clock

**Decision.** The e2e runs with default motion (Playwright waits for the boot sequence and the drawer slide). The clock is pinned to 2026-10-01 10:00 Melbourne with page.clock.setFixedTime, and the expected export filename is derived from its UTC date. Superseded in part at integration: under reduced motion the drawer now focuses its input (the fix is in TerminalDrawer.module.css), and a separate test runs with reducedMotion `reduce`; the clock is pinned to 8 am Melbourne, still 30 September in UTC, and the export file is expected under the local date, which the app now uses. Every test also fails on a CSP violation (D-149).

**Reason.** First run rejects exam dates in the past, so CI must not depend on the real date. Under reduced motion the drawer failed to focus its input at the time, which would have failed the backtick step for a bug outside this track.

**Rejected.** Forcing reduced motion and dropping the input-focus assertion, which would hide that bug.

## D-145 Stats: The end-to-end run answers sort without knowing the question

**Decision.** Click the first suggested answer when there are chips. Otherwise read the question: an array of the right length, `[1] [2]` for sub-lists, `3` for counting questions. Then assert a Correct or Incorrect verdict.

**Reason.** The spec only needs one counted answer. This works for every sort question kind and doesn't depend on the seed.

**Rejected.** Hard-coding the answer for the pinned seed, which breaks if sort's generator changes.

## D-146 Stats: The end-to-end run has its own port and never reuses a server

**Decision.** The preview runs on E2E_PORT (default 4317) with reuseExistingServer false, and BASE_PATH is `/` so CI's GITHUB_REPOSITORY base doesn't apply.

**Reason.** Several worktrees preview builds on this machine at once. Reusing a server could test another checkout.

**Rejected.** Vite's default port 4173 with server reuse.

## D-147 Daily: The daily set draws on the P1 generator games

**Decision.** `DAILY_GENERATOR_GAMES` now lists the nine P1 games that have `generate` (dfd, usecase, reqs, gantt, threat, law, naming, types and oop) after the five P0 ones. psm has no `generate` (D-113), so it stays out. A day's two generated questions still come from the two games that rank lowest for its date: over 730 days each of the 14 games appears on 86 to 115 days, and never twice on one day. The change applies from the next day that hasn't started; a day already begun keeps its stored item ids. The daily game still loads every listed game through the registry, and a test checks that each one loads and that its daily items rebuild from a stored record. Today's run still hands step 3 to the terminal, and now adds a secondary "Do it on screen instead" link to /daily.

**Reason.** The daily challenge should range across the course, and the P1 games cover Unit 3 Outcome 2 and Unit 4 key knowledge that the P0 generators don't reach. Stored records keep their item ids (D-088), so the change is safe mid-day.

**Rejected.** Keeping the P0 list, which leaves the new games out of the daily set. Weighting the P0 games more heavily, which would favour Unit 3 Outcome 1. Loading only the two games a day needs, which would change how both the terminal and the Daily screen load the set for a small saving, since every game chunk is already precached.

## D-148 Games: The law game and the Essential Eight round go further than the content holdbacks

**Decision.** The law game and threat's Essential Eight round teach, at textbook level, which of four Acts applies to a scenario and why (the Privacy Act 1988 (Cth) with its $3 million turnover threshold, the Privacy and Data Protection Act 2014 (Vic), the Health Records Act 2001 (Vic) and the Copyright Act 1968 (Cth)), and the eight strategies by name. That goes further than the content's holdbacks for U4O2-KK07 and U3O2-KK10, which keep Act scope, the turnover threshold and named frameworks out of the cards, questions and case studies (`docs/CONTENT_NOTES.md`). The games stay as built until they can be checked against the study design and current sources (D-001), including the ACSC's current name for the Office macro strategy (D-128) and any reform of the Privacy Act's small business exemption.

**Reason.** The brief asks for these games by name, and neither can be built without naming the Acts and the strategies. Each law scenario is built to have one best answer and turnovers sit far from the threshold (D-127), so a small business reform would not flip an answer.

**Rejected.** Holding back the law game and the Essential Eight round until the sources are confirmed, which would leave two of the brief's games unbuilt. Loosening the content holdbacks to match the games, which would widen what the study content claims before the source check.

## D-149 Zod is configured wherever a schema is built

**Decision.** `src/lib/zodConfig.ts` exports the configured `z`, and every module that builds or runs a schema imports it from there. ESLint forbids value imports from `'zod'` anywhere else. The end-to-end run now fails on any CSP violation.

**Reason.** Since screens load on demand (D-095), the bundler puts Zod and the stores in chunks that run before `main.tsx`'s own body, so the first object schema was built before jitless mode was on. Zod's eval probe then raised a `script-src` CSP violation on every page load in production. The P1 smoke test found it, and a build of the pre-merge branch shows it too. A module's imports always run before it, so importing the configured `z` holds whatever the code splitting.

**Rejected.** Pinning Zod and its settings into one chunk with the bundler's chunking options, which depends on bundler behaviour that has already changed once. Relaxing the CSP.

## D-150 Final adversarial review before handover

**Decision.** Five independent reviewers each read the whole app through one lens: data integrity, security and CSP, learning logic against the spec (run under several device timezones), accessibility (axe on every route at 1280 and 360 px) and a line-by-line spec audit. Skeptics then tried to refute every finding. Of 40 findings, 26 were confirmed (4 medium, 22 low, none critical or high) and fixed on two branches, each with a test that failed before its fix, including four new Playwright focus checks. The 14 findings the skeptics rejected are either deliberate decisions already recorded here, or latent cases that need several rare events at once.

**Reason.** The app holds weeks of students' progress and runs during the final revision window, so it gets an adversarial pass before handover rather than relying on the tracks' own tests.

**Rejected.** Shipping on the tracks' own checks and the Phase 1 critique alone.

## D-151 Review fixes: Dialog live regions start empty

**Decision.** Every open Dialog mounts <LiveRegions since={seq when it opened}>, so it renders only messages announced after it opened. Its test ids are prefixed 'dialog-'.

**Reason.** The skeptic noted that a role=alert that mounts already holding text can be read out, which would re-read a stale warning. announce() callers don't change.

**Rejected.** Mounting the regions with the store's current text, as the original fix proposed, and per-screen live regions in each exam or drill dialog.

## D-152 Review fixes: Dialog focus fallback queries the heading, then main

**Decision.** querySelector('main h1[tabindex="-1"]') ?? getElementById('main')

**Reason.** A selector list returns the first match in document order, and #main comes before any h1 inside it, so the suggested single selector would always return main.

**Rejected.** document.querySelector('main h1[tabindex="-1"], #main')

## D-153 Review fixes: Sticky bar height through a CSS custom property

**Decision.** useStickyTop sets --sticky-top on <html>, and global.css adds it to scroll-padding-top. The exam heading's scroll-margin drops to 12 px, and useQuestionNav's check adds the page padding.

**Reason.** The rule stays in global.css next to the bottom padding. Keeping the old bar-sized heading margin would have counted the bar twice, because scrollIntoView adds scroll-margin to scroll-padding.

**Rejected.** Writing documentElement.style.scrollPaddingTop directly, and an html:has([data-sticky-bar]) rule.

## D-154 Review fixes: Case study revisit is read once at mount

**Decision.** McqQuestion and WrittenQuestion keep const [revisited] = useState(initialChosen !== null or saved !== null) and use it for moving focus and for Feedback's announce and cue.

**Reason.** CaseStudyPractice passes each new answer straight back as initialChosen or saved in the same render. The existing checks, and the suggested announce={initialChosen === null}, therefore treated every new case study answer as a revisit. Focus after Check answer or Save score was lost on every case study question, not only the last.

**Rejected.** announce={initialChosen === null} cue={initialChosen === null} from the verdict.

## D-155 Review fixes: What the review card's description says

**Decision.** Before the flip, the description is the front plus the 'Recall ...' prompt. After it, the answer, and for a cloze card the filled-in front plus the answer. The aria-label is kept.

**Reason.** A cloze card's answer is the missing words in the front, and the prompt tells a reverse card's direction.

**Rejected.** Describing the flipped card by the answer block only, and announcing the answer on flip.

## D-156 Review fixes: Row headers only for tables with an empty corner

**Decision.** The core rule rewrites a table only when its corner header is empty: that cell becomes a td, and each body row's first cell becomes a th with scope=row.

**Reason.** An empty corner marks the compare-card shape, where rows are aspects. Other tables keep their current semantics.

**Rejected.** Visually hidden 'Aspect' text in the corner, and making every table's first column row headers.

## D-157 Review fixes: Browser-layout checks go in a new e2e spec

**Decision.** e2e/focus.spec.ts covers the date and time ring, Shift+Tab under the sticky exam bar at 1280 and 360 px, and chip scrolling. It pauses the clock so every run sits the same mini paper.

**Reason.** jsdom has no layout or :focus-within on shadow parts. With a running clock the paper changed each run, which made the sticky check flaky.

**Rejected.** CSS-text unit tests for these (only the global.css padding rule has one) and leaving them to the scratch scripts.

## D-158 Review fixes: More menu closes on focusin outside

**Decision.** A document focusin listener checks the event target against the nav. D-013 should be amended to add 'moving keyboard focus outside' to Esc, choosing an item and tapping outside. DESIGN.md already says so; DECISIONS.md was left for the orchestrator.

**Reason.** The skeptic showed that onBlur with relatedTarget null (Safari, where a clicked link doesn't take focus) would close the menu on mousedown and swallow the click.

**Rejected.** nav onBlur using relatedTarget.

## D-159 Review fixes: Report dialog stays open when the exam auto-submits

**Decision.** It is not closed programmatically.

**Reason.** Closing it would throw away a note the student is typing. The in-dialog live region now speaks "Time's up", and closing the dialog lands on the new heading.

**Rejected.** useReportDialog.closeReport() on auto-submit and on the end of a timed drill.

## D-160 Review fixes: The drawer's main fallback runs only on a close

**Decision.** TerminalDrawer tracks wasVisible and falls back to #main only on a visible-to-hidden transition, when focus was inside the drawer or on body.

**Reason.** Without the guard, the effect's first run on mount would pull focus to main when the drawer mounts at idle.

**Rejected.** Falling back to main whenever visible is false.

## D-161 Review fixes: Scroll boxes are groups

**Decision.** role=group for every sideways-scroll box: useScrollableChildren and BlockView's table and pre. charts.tsx's single labelled stats table region was left alone.

**Reason.** This matches D-042's figure boxes. A round prints several listings with the same label, and duplicate region landmarks fail axe's landmark-unique rule.

**Rejected.** Making each label unique, for example 'Pseudocode, question 3'.

## D-162 Review fixes: Files this branch shares with the parallel fixer

**Decision.** Minimal edits, flagged for merge: ReportDialog.test.tsx (one assertion), ExamPaper.tsx (SubmitDialog only), Run.tsx (DailyStep's button only) and Run.test.tsx (one new test).

**Reason.** Findings 1, 13 and 15 need these edits, and the other fixer's indexes 6, 9, 10 and 25 list the same files.

**Rejected.** Leaving those findings partly unfixed to avoid the overlap.

## D-163 Review fixes: Games: blitz rejects a slip closer to another term (amends D-086)

**Decision.** A typed answer within the target's tolerance is still wrong ('other-term') when it is strictly closer by edit distance to a different glossary spelling than to the target's nearest spelling. When the distances are equal, it counts.

**Reason.** D-086 says a real but different term should never count, but only exact spellings were blocked. Plurals and unhyphenated forms of functional/non-functional requirement were marked correct. Strict comparison rejects those without losing single-edit typos of any glossary term.

**Rejected.** Rejecting on a tie (<=), which the reviewer found drops legitimate equidistant typos such as 'mackup'. Also a per-card `rejects` list now, which is a content-schema change for the content track.

## D-164 Review fixes: State: KK renames apply one version at a time, as a simultaneous map

**Decision.** kkRenamer (src/content/schema.ts) groups renames by `since`, applies each version as one map and applies versions in ascending order. StudyDesignSchema rejects a duplicate `from` within a version, a rename past kkMapVersion, and a rename whose composed id is off the map.

**Reason.** With chained steps, a shift listed in ascending order collapsed two KKs into one and a swap could not be expressed. Nothing validated renames.

**Rejected.** Keeping sequential application and documenting 'list shifts in descending order', which still can't express a swap.

## D-165 Review fixes: State: a KK renumbering ships with attempts and exam store version bumps

**Decision.** CONTRACTS.md now requires any kkMapVersion change to bump the attempts and exam store versions, each with a pass-through migrate, since hydrate renames the data. A test in src/state/attempts.test.ts pins {kkMapVersion 1, attempts 1, exam 2} so it fails until both stores are bumped.

**Reason.** A build on the old map open in another window would otherwise adopt new-map data and append old-map ids under the new kkMap. The existing newer-version block is the safe path.

**Rejected.** Special-casing a kkMap newer than the build's map inside mergeAttempts or hydrate, which would duplicate the blocking logic.

## D-166 Review fixes: Exam: store version 2 with kkMap on history summaries

**Decision.** ExamSummary gains an optional kkMap (absent means map 1). summarise() stamps studyDesign.kkMapVersion and hydrate renames old summaries. The exam store moves from v1 to v2 with an identity migrate.

**Reason.** The summary schema is strict. A build without the field would set every new summary aside, quarantine it and then overwrite storage without it. The bump makes such a build block instead.

**Rejected.** Adding the optional field without a bump, or writing kkMap only when it isn't 1, which silently relies on no renumbering ever shipping.

## D-167 Review fixes: Terminal: the daily re-syncs by restarting from the stored record

**Decision.** Before checking an answer, the host compares daily[today].results.length with the session's index. On a mismatch it prints a muted note, discards the answer and restarts the game with startGame, which resumes from the record or shows the stored result.

**Reason.** It reuses the existing resume and finished-day paths, keeps re-answers out of the attempt log, and leaves the session's results always equal to the record, so the share line and score line need no separate path.

**Rejected.** Rebuilding only the share line from the record, which would still ask answered questions again and log extra attempts.

## D-168 Review fixes: State: stored timestamps are capped at 1 January 3000 UTC, and the root route has an error screen

**Decision.** MAX_EPOCH_MS = Date.UTC(3000, 0, 1) bounds srs due/last, exam timestamps and attempt seconds. A root errorElement (RouteError) replaces React Router's stack-trace page.

**Reason.** Edited files with out-of-range dates crashed Exam, Map and Stats on every load. The year 3000 keeps every formatted date at four digits and stays far past the furthest real value (SM-2 caps an interval at 36,500 days).

**Rejected.** Date.UTC(2100, 0, 1) from the original finding, which would refuse legitimate post-exam Easy reviews.

## D-169 Review fixes: State: tab-only state is cleared through a registry in persist.ts

**Decision.** clearTabState() removes this tab's coldboot:v1: sessionStorage keys and runs the callbacks registered with onClearTabState. Reset, import and a reset in another window call it, and the terminal host registers resetTerminal when it loads.

**Reason.** State never imports the terminal. Calling the host from ImportProgress would pull it into the FirstRun shell chunk. The registry also covers a reset made in another window.

**Rejected.** Calling the helpers from Settings.tsx and ImportProgress, which misses cross-window resets and grows the shell.

## D-170 Review fixes: Report: the issue link is capped at 8,000 characters

**Decision.** When the prefilled URL would exceed ISSUE_URL_MAX, only the note in the link is shortened, in whole code points, with a line pointing to Copy report. The copied text keeps the whole note.

**Reason.** GitHub answers 414 a little above 8,100 characters, and long notes in non-Latin scripts reach that well inside the 2,000-character note cap.

**Rejected.** Only showing a hint beside the button, which leaves the button broken.

## D-171 Review fixes: Study: the glossary's practise links go to Review

**Decision.** practisePath(kk) gives drillPath({ kk }), or reviewPath({ kk: 'TERMS' }) for TERMS. Home, the syllabus map and the Stats weakest list use it. The Drill empty state and `drill TERMS` explain that the glossary is practised with flashcards and blitz.

**Reason.** TERMS has cards and blitz but no MCQs by design, so a drill link led to 'No questions ... yet'.

**Rejected.** Adding glossary MCQs, or hiding the TERMS cell and row.

## D-172 Review fixes: Games: terminal MCQ feedback lists every distractor

**Decision.** After any answer, mcqItem gives the explanation, then one 'Why not X' line per distractor, marking the one chosen '(your answer)'.

**Reason.** This matches Section 6.4 and the Drill and Daily screens, so the same item teaches the same way in the terminal. The reviewer checked that the speech digest cap is rarely hit.

**Rejected.** Keeping only the chosen option's line, which the mcq.ts header had documented but DECISIONS never recorded.

## D-173 Games: ux asks about the four user experience characteristics only

**Decision.** `ux` shows a mock-up with exactly one weakness and asks two questions about it: which user experience characteristic is weakest (affordance, interoperability, security or usability, answered by letter or name), then which reason explains why, from three, four or five reasons by difficulty. The wrong reasons are false claims about this screen, drawn from the other characteristics (and on hard one from the same characteristic), about elements the screen has where possible. A round is five mock-ups, each asked twice, and every characteristic is the answer at least once. Design principles are neither answers nor distractors, and the man page says why.

**Reason.** Section 7.3 asks for "the UX characteristic or design principle" that is weakest, but U3O2-KK16's list of design principles is a verify entry, and the content holds back named principles until it is confirmed (`docs/CONTENT_NOTES.md`). The four characteristics are U3O2-KK15's own. Asking why as well as which tests the reasoning that "explain" questions want.

**Rejected.** Using alignment, contrast and consistency as answers or distractors, which would teach a list the study design may not have. One question per mock-up, which rewards spotting the characteristic without the reason.

## D-174 Games: ux mock-ups are hand-laid templates, checked by an independent reader

**Decision.** Nine templates for invented organisations (six phone screens, three desktop windows) are drawn with the `mockup` figure kind. Each can show some of eight weaknesses (two per characteristic), and building one with a weakness changes only the elements that weakness is about. A seed varies the organisation, wording and details. The 500-seed tests read the drawing itself (element types, text and sizes) with a checker written apart from the game: a sound screen has no weakness, and every item's screen has exactly the one it asks about. They also check the layout (inside the window, no overlaps, text that fits, callouts clear of other elements). Phone screens are 288 units wide, so they fit the full-screen terminal at 360 px, which leaves a figure 294 px.

**Reason.** A mock-up with two weaknesses would make a right answer look wrong. Figures never scale below their natural size, so labels stay at least 14 px (`docs/DESIGN.md`), and a phone mock-up has to fit the narrowest place it is drawn. At 320 units every phone mock-up scrolled sideways at 360 px and hid its right edge.

**Rejected.** Generated layouts, which can't promise a single weakness. Letting mock-ups scale below 14 px text on phones.

## D-175 Games: ux feeds the daily challenge and boss doesn't

**Decision.** `ux` has `generate` and joins `DAILY_GENERATOR_GAMES` after the P1 games. A generated ux item is a which question seven times in ten, otherwise a why question, and either kind carries its own mock-up. `boss` has no `generate`, so it never feeds the daily challenge.

**Reason.** Each ux item stands alone on the Daily screen and in the terminal. A boss round is a whole sitting, not one question. Days already begun keep their stored item ids (D-088), so the change is safe mid-day.

**Rejected.** Keeping the daily set to the P0 and P1 games, which leaves the mock-ups out.

## D-176 Games: The boss climb

**Decision.** `boss` gives three lives and 15 questions, one from each generator game in the registry in a seeded order (each game once before any repeats): five easy, five normal and five hard. Each wrong answer costs a life; input that isn't an answer costs nothing. The climb ends after the 15th question or when the last life goes. The case study slice follows either way and costs no lives. The summary gives the questions survived, lives left, correct answers and the case study marks. It is a fixed-difficulty game (`play boss --hard` is refused), and it reads the registry, so a new generator game joins the climb without a change to boss.

**Reason.** Section 7.3 asks for "three lives and an escalating mix drawn from every game, ending in a self-marked three-question case study slice". Fifteen is one question per generator game today, and thirds make the escalation plain. Ending the round at zero lives without the case study would drop the part that matches Section C, worth 60 of the exam's 100 marks.

**Rejected.** A climb with no fixed end, which makes a round's length depend on luck. Drawing blitz, daily and psm into the climb: blitz is timed, daily is the day's shared set, and psm has no `generate` (D-113).

## D-177 Games: The boss case study slice and self-marking

**Decision.** The slice is three short answers from one case study that has at least three (chosen by seed, in id order), worth 9 to 15 marks together where possible (otherwise the three closest to 12), in the case study's order. The whole insert is printed once, then each question with the figures it uses. Each question takes two inputs. The student's answer reveals the model answer and the numbered marking points without recording anything (`AnswerResult.advanced`). Then the points earned are recorded as marks over marks available, capped as on the Written screen (`AnswerResult.selfMarked`, with no Correct or Incorrect verdict and no sound). The points parser takes "1 3", "1, 3", "1 and 3", "points 1 and 3", ranges such as "1-3", "13" when no point number has two digits, "none" or "0", and "all". It refuses "2/3", which looks like a mark.

**Reason.** Section C answers are marked against points, as the Written screen and the exam simulator do. A question can rest on any part of the insert, and no rule for cutting it down was both safe and short. Not recording the reveal keeps one attempt per question, timed from when the question appeared.

**Rejected.** Typing a mark total, which can't be checked against the points. Printing an excerpt of the insert. Marking the typed answer by keywords, which would grade prose the app can't judge.

## D-178 App: Exam-day states on Home and in the boot sequence

**Decision.** `examDayState(now, examAt)` is `study`, then `exam-day` from midnight in Melbourne on the exam's date until it starts, `underway` through reading and writing time (3:00 pm to 5:15 pm for the default exam), and `over` afterwards. On exam day Home replaces Today's run with the start time in Melbourne, the time left and a calm suggestion (a few cards or the mini paper), and the boot sequence gives the hours and minutes left. While the exam is underway Home shows only "The exam is underway. Good luck." with when reading and writing time end, and the boot sequence wishes luck and drops the reviews line. Afterwards Home says "The exam is over. Well done." with export, stats, the syllabus map and a note that the exam caps have lifted, and the boot sequence's reviews line says so too. Every time left is rounded down to the minute, as the status bar's countdown is, so Home and the boot sequence agree. The status bar keeps its exam segments (`[exam underway]`, `[exam finished]`) and its other segments.

**Reason.** Section 13 lists exam-day states for the countdown (underway, finished) under Phase 3. On the morning of the exam a student needs the start time and reassurance, not a new run; during the exam nothing should ask for study; afterwards the progress is still worth keeping. The status bar is a status display rather than a call to action, and Home and the boot sequence are where study is asked for.

**Rejected.** Blanking the rest of the app during the exam, which would hide a student's own records. Rounding the boot sequence's time left up, which disagreed with Home within the same launch.

## D-179 Study: Today's run keeps its place in this tab

**Decision.** Today's run saves its step, the finished steps' outcomes, the review's ratings so far, the drill's questions and answers, when the step began and the daily date in sessionStorage (`coldboot:v1:run`, `src/app/study/runState.ts`), for one study day. Leaving for the Daily screen or anywhere else, or reloading, carries on from the same place: a review with the cards still due, a drill at its first unanswered question. A finished run isn't kept. A saved run is Zod-checked on read and ignored when it is malformed or from another study day. Reset, import and a reset in another window remove it with the tab's other state (D-169), and a mounted run stops saving after such a clear.

**Reason.** "Do it on screen instead" sends the student to the Daily screen, and coming back used to start a new run with a new drill. The place in a run belongs to one sitting in one tab, so it shouldn't follow a progress file or reach another tab.

**Rejected.** localStorage, which would carry a half-finished run into other tabs and past a reset or an import. Keeping the run in memory only, which a reload loses.

## D-180 Phase 3 finished and checked

**Decision.** The Phase 3 branch was finished after its author stopped before the final checks. Every check passed: typecheck, lint, unit tests, content, contrast, installer lint, build and the end-to-end run. A production build was then driven in Chromium with seeded storage and a pinned clock at 1280 and 360 px: Home and the boot sequence at 10:48 am on exam day, in reading time, in writing time and after the exam; a boss round through its case study to the summary; and a ux round. No page scrolled sideways, and there were no console errors or CSP violations. Two things looked wrong and were fixed: ux phone mock-ups scrolled sideways at 360 px (D-174), and the boot sequence and Home gave different times left (D-178). A read-through of the game text also fixed "a" before a vowel in one ux rebuttal and an ambiguous self-marking example in the boss man page. Tests were added for the 3:15 pm boundary in the boot sequence, the boot overlay at pinned exam-day instants, and Today's run being cleared on reset, import and a reset in another window.

**Reason.** Phases 1 and 2 closed with the same checks and a screenshot pass (`docs/DESIGN.md`).

**Rejected.** Merging on the author's own tests alone.

## D-181 Adversarial review of Phase 3

**Decision.** Reviewers read the Phase 3 diff through a correctness lens and an experience lens, and skeptics tried to refute each finding. Eight findings were confirmed (two medium, six low; two were the same exam-day review problem), and each was fixed on `track/p-p2-fix` with a test that failed first (D-182 to D-188).

**Reason.** Phases 1 and 2 had the same adversarial pass before handover (D-150), and the Phase 3 author stopped before its final checks.

**Rejected.** Merging on the author's own tests and the finisher's screenshot pass (D-180) alone.

## D-182 Review fixes: Games: the ux full-card claim names a payment card

**Decision.** On a screen with no payment card, the full-card reason reads "It shows a customer's whole payment card number, ..." and its rebuttal "No payment card number appears on this screen." The wording for a screen that shows a payment card is unchanged.

**Reason.** The library sign-in mock-up shows the whole library card number, which is the member's login. On hard, every library/secret-shown item offered the generic full-card claim, which was true of that drawing, and marked it wrong with a rebuttal the figure contradicted.

**Rejected.** A checker in `ux.test.ts` that flags any run of 12 or more digits as full-card: it would flag the library login. Relabelling the library field, which changes a template that is otherwise sound.

## D-183 Review fixes: Terminal: `report` names the boss case study question once its model answer shows

**Decision.** For an `advanced` answer the host sets `lastAnswered` to that question, still recording no attempt.

**Reason.** The model answer and marking points are the feedback on screen, and `report` reports the last question answered. It was reporting the last climb question instead, so a report on a case study's marking points was filed under the wrong id. D-177's one attempt per question holds.

**Rejected.** Recording the reveal as an attempt.

## D-184 Review fixes: Study: Today's run follows the daily challenge to the new Melbourne date

**Decision.** Resuming a saved run at its daily step keeps the saved Melbourne date only when that day's challenge is finished; otherwise the step moves to today's Melbourne date. `stepAt` is kept.

**Reason.** A saved run lasts one study day (4 am rollover), but the daily challenge rolls over at midnight in Melbourne. A run resumed after that midnight waited on the previous date's record while the terminal and the Daily screen played the new set. Keeping `stepAt` means a daily game that ended in the terminal while the run was left still counts.

**Rejected.** Rebuilding the step through `advance()`, which resets `stepAt`.

## D-185 Review fixes: App: the exam-day warm-up reviews due cards only

**Decision.** `reviewPath({ due: true })` gives `/review?due=1`. That review offers no new cards (a new-card limit of 0 for the preview and for every start, so a restart keeps it), says "Only the cards that are due, with no new cards.", and with nothing due shows "No reviews due" without the note about raising the new-card limit. Home's exam-day "Review a few cards" links there.

**Reason.** The panel says "a light warm-up, not new work", and the ordinary review followed the due cards with the day's whole allowance of new cards (25 by default). A card learnt that morning falls due after the exam.

**Rejected.** `?new=0`, which the second report of the same problem suggested; one flag serves both. Capping the warm-up at ten cards, and making the mini paper the primary action when nothing is due: neither was needed to make the link do what the panel says.

## D-186 Review fixes: Terminal: a block's `speech` replaces its text in the screen reader digest

**Decision.** `text` and `markdown` TerminalBlocks may carry `speech`, which the digest says instead of the text (`''` leaves the block out). Boss speaks the case study insert as "The case study insert is in the terminal output, above the first question." and the model answer as "The model answer is in the terminal output.", and gives the instruction for marking with the "Marking points" heading, before the points. What the terminal shows is unchanged.

**Reason.** The digest is capped at 1,500 characters (`SPEECH_MAX`). The insert alone is over 4,000, so a screen reader never heard the first question, and long model answers cut the marking digest before the points and the instruction. Over 300 seeds of real content the digest now always reaches "Case study question 1 of 3", and the case study's own prompts fit whole. A long feedback on the last climb answer (gantt's chart, read out line by line) can still push the end of that one digest past the cap, as it can in any game; the full text stays in the log.

**Rejected.** Raising `SPEECH_MAX`, which lengthens every digest. Moving the points above the model answer on screen: the eight points of the longest question pass the cap on their own.

## D-187 Review fixes: Terminal: answers in a game take up to 4,000 characters

**Decision.** While a game runs, the terminal input and `submitLine` take `GAME_INPUT_MAX` (4,000) characters; commands keep to `HISTORY_ENTRY_MAX` (500). Boss's instruction line and man page say "up to 4,000 characters".

**Reason.** Boss asks for one developed point per mark on questions worth up to 8 marks, which runs to 900 to 1,500 characters. The input stopped taking keystrokes at 500 with no message, and `submitLine` cut every line to 500 as well. In-game input stays in memory, so the persisted history's limit doesn't apply to it.

**Rejected.** A per-session `inputMax()` on `GameSession`, a contract change for one game. Raising only the input's `maxLength`, which `submitLine` would still have cut.

## D-188 Review fixes: Study: Home continues a run under way

**Decision.** With a run saved in this tab for today's study day, Home lists the finished steps' outcomes, "Next:" the step to carry on with (with the drill's answers or the cards reviewed so far) and "Then:" the rest, and the primary action reads "Continue today's run". The step names live in `RUN_STEPS` in `runState.ts`.

**Reason.** Home previewed a fresh run (new cards, a drill on today's weakest key knowledge) while the button opened the saved one at a different drill. Home ships in the shell, so it reads the names from `runState.ts` rather than from the Run screen's chunk.

**Rejected.** Keeping "Start today's run" for both cases. Section 6.2 names that action for a new run.
