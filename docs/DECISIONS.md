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
