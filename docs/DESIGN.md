# Design

The design plan for COLDBOOT, written before the screens were built and reviewed against Section 9 of the build brief. Track A owns this file, `src/ui/**` and the shell. Everything here is implemented in `src/ui/tokens.css`, `src/ui/global.css` and the primitives exported from `src/ui/index.ts`.

## Intent

The users are Year 12 students revising for one exam, often late at night and under stress. The subject is software, so the terminal is the product's natural voice and its one bold element. Everything around it stays quiet: a true-black page, blue text, flat surfaces, and no decoration that competes with the study content.

## Tokens

### Colour

The palette is fixed by the brief. No other colours exist in the product and no token is tinted or mixed to make a new one. The only translucency is the dialog backdrop, a `--void` scrim at 85% that dims the page behind a modal.

| Token | Hex | Use |
|---|---|---|
| `--void` | `#000000` | Page background, status bar, rail |
| `--trench` | `#06122B` | Raised surfaces: panels, inputs, dialogs, the incorrect-answer block, the terminal drawer |
| `--steel` | `#6B80A8` | Muted text, hairline rules, control borders, disabled controls |
| `--cobalt` | `#2450E8` | Primary buttons (with `--ice` text), the focus ring, text selection, checked controls |
| `--phosphor` | `#7FC7FF` | Links, terminal text, the boot sequence, active navigation marker, meter fill |
| `--ice` | `#DCEAFF` | Primary text, the inner halo of the focus ring |
| `--flare` | `#22D3FF` | Correct answers only (always with the ✓ glyph and the word "Correct") |

Every text and background pairing in use has a row in `src/ui/contrast-pairs.json`, and `npm run contrast:check` fails the build if any drops below WCAG AA (4.5:1 for text, 3:1 for large text and meaningful non-text marks).

Two pairings sit close to the line and are handled on purpose:

- `--cobalt` on `--trench` is exactly 3.0:1. The focus ring therefore carries a 2 px `--ice` inner halo (see Focus below), so it stays clearly visible on panels and inputs rather than relying on the minimum.
- `--steel` on `--trench` is 4.67:1. It passes for body text, so muted text and the incorrect block may use it, but it is never used below 14 px.

### Type

| Role | Family | Size / line-height |
|---|---|---|
| Reading text and interface | Atkinson Hyperlegible Next Variable (`--font-read`) | 16 px / 1.5 |
| Small text: hints, tags, tab labels | Atkinson Hyperlegible Next | 14 px / 1.5 |
| `h3` | Atkinson Hyperlegible Next, weight 700 | 20 px / 1.3 |
| `h2` | Atkinson Hyperlegible Next, weight 700 | 25 px / 1.3 |
| `h1` | Atkinson Hyperlegible Next, weight 700 | 31 px / 1.3 (25 px below 720 px wide) |
| Code, pseudocode, terminal, status bar, boot sequence, wordmark | Martian Mono Variable (`--font-mono`) | 14 px (code inside reading text is 0.9 em, never below 14 px) |

The scale is 14, 16, 20, 25 and 31 px (`--step-0` to `--step-4`). Both families are self-hosted through Fontsource packages and are covered by the SIL Open Font License 1.1. Reading columns cap at `--measure` (72ch) and are left-aligned; nothing is centred or justified.

The COLDBOOT wordmark is Martian Mono at weight 700 with 0.08 em tracking. It is the only all-caps text in the product.

### Space, size and layers

| Token | Value | Use |
|---|---|---|
| `--space-1` to `--space-7` | 4, 8, 12, 16, 24, 32, 48 px | Gaps and padding; nothing else is used |
| `--control-h` | 44 px | Minimum height of buttons, inputs and tabs (touch target) |
| `--radius-control` | 2 px | Buttons, inputs, checkboxes, tags, keycaps |
| `--rail-w` | 208 px | Desktop navigation rail |
| `--status-h` | 32 px (28 px below 720 px) | Status bar |
| `--tabbar-h` | 56 px | Bottom tab bar below 720 px |
| `--z-*` | rail 10, bars 20, popover 30, drawer 40, boot 60 | Stacking. Dialogs use the native top layer. |

Panels have no radius. Nothing has a shadow or a gradient.

## Layout

```
Desktop (720 px and wider)
+----------+------------------------------------------------+
| COLDBOOT |  [storage warning banner, when needed]          |
|          |                                                 |
| Home     |  main column, left-aligned                      |
| Review   |  text capped at 72ch; wide blocks (grids,       |
| Drill    |  tables) may use the full column up to 1120 px  |
| Written  |                                                 |
| Exam     |                                                 |
| Map      |                                                 |
| Stats    |                                                 |
| Terminal |                                                 |
|          |                                                 |
| Open     |                                                 |
| terminal |                                                 |
| Settings |                                                 |
| About    |                                                 |
+----------+------------------------------------------------+
| [T-44d 04h] [37 due] [streak 6] [offline ready]            |
+-----------------------------------------------------------+
```

- The rail is fixed to the left edge, 208 px wide, on `--void` with a hairline `--steel` rule on its right. The active item has aria-current="page", bold text and a 2 px `--phosphor` bar on its left edge, so the current page never depends on colour alone.
- The main column scrolls with the page. Padding is 32 px top and 40 px sides on desktop, 16 px at phone width.
- The status bar is fixed along the bottom of every screen, full width, in Martian Mono 14 px, with a hairline rule above it.
- The drop-down terminal (track B) slides over everything from the top.

```
Phone (below 720 px)
+------------------------------+
| COLDBOOT       Open terminal |   header scrolls away with the page
|                              |
| main column, 16 px gutters   |
|                              |
+------------------------------+
| [T-44d 04h] [37 due]         |   status bar, countdown and due only
+------------------------------+
| Home Review Drill Term. More |   tab bar, five tabs
+------------------------------+
```

- **Eight destinations in five tabs.** The tab bar holds Home, Review, Drill and Terminal, the four places a student goes every day, plus More. More opens a menu above the tab bar with Written, Exam, Map, Stats, Settings and About. Five tabs of 72 px fit 360 px with room for "Terminal" at 14 px. More is marked as current (bold, top bar) whenever the current page is one of its items. Esc, choosing an item, tapping outside or moving keyboard focus outside closes it, and Esc returns focus to More.
- Only the countdown and the due count stay in the status bar. The streak and offline segments return at 720 px; the storage warning banner still shows at every width.
- The page never scrolls sideways at 360 px. Wide content (tables, pseudocode) scrolls inside its own box.

During first run the shell shows only the wordmark and the main column: no rail, tabs, status bar or terminal, because every other route redirects to `/welcome` until setup is done.

## Principles

1. **The terminal is the one bold element.** Everything else is flat and quiet: `--void` and `--trench` surfaces, hairline `--steel` rules only where structure needs them, no shadows, no gradients, no grids of identical rounded cards.
2. **One orchestrated motion moment.** The cold-boot sequence at launch. Everywhere else motion only answers a user action, and it is short.
3. **Colour never carries meaning alone.** Correct and incorrect answers carry a glyph and a word. The current page carries a bar and bold weight. Meters print their value as text. The unseen state is a dashed outline and the word "Unseen", never an empty bar that reads as zero.
4. **Words do the work.** Sentence case, plain active verbs. A button's name matches its result ("Export progress" leads to "Progress exported"). Empty states say what to do next. Errors say what happened and how to fix it. Australian spelling.
5. **No shouting.** No all-caps labels (the COLDBOOT wordmark is the only all-caps text), no eyebrow labels above headings, no arrows appended to button text, no middle-dot metadata strings.
6. **Keyboard first.** Everything works from the keyboard, with a visible focus ring on every focusable element and a skip link as the first stop.

## Focus

Every focusable element gets the same ring on `:focus-visible`: a 2 px `--cobalt` outline offset by 2 px, with the offset gap filled by a 2 px `--ice` halo (drawn with a zero-blur `box-shadow` spread, which is a ring and not an elevation shadow). The halo keeps the ring visible on `--trench` panels and on `--cobalt` buttons, where cobalt alone would not be. `main` receives focus after a route change so screen readers start at the new page; it shows no ring because it is not a control.

## Component inventory

All primitives live in `src/ui`, use CSS modules plus the tokens, and are exported from `src/ui/index.ts`.

| Component | Purpose | Notes |
|---|---|---|
| `Button` | Actions | `variant`: `primary` (`--cobalt` with `--ice` text, one per view), `secondary` (hairline outline), `quiet` (text only, `--phosphor`). `size`: `normal` (44 px) or `small` (36 px, 44 px on touch screens). A quiet button's label lines up with the column edge (its padding sits in a negative margin). Disabled: dashed `--steel` border, `--steel` text, not-allowed cursor. Hover underlines the label, on devices that hover; no colour animation. |
| `ButtonLink` | A router link styled as a button | Same variants. Use when the action navigates. |
| `ExternalButtonLink` | An external link styled as a button | Opens in a new tab with `rel="noopener noreferrer"` and says so to screen readers. |
| `TextField`, `TextArea`, `NumberField`, `DateField`, `TimeField` | Text entry | Visible label, optional hint, optional error. Hint and error are linked with aria-describedby; errors set aria-invalid and start with "Error:" for screen readers. `--trench` fill, hairline border, 2 px radius. |
| `Select` | Native select | Same field frame. |
| `Checkbox` | On/off settings | Native input, custom-drawn: `--cobalt` fill and an `--ice` ✓ when checked, so state shows by shape as well as colour. |
| `RadioGroup` | One choice from a few | `fieldset` and `legend`; native radios drawn as rings with a filled centre. |
| `Dialog` | Modal | Native `<dialog>` with `showModal()`, labelled by its heading, Esc closes, focus returns to the element that opened it (or to the page's focusable `h1`, then `main`, if that element has gone). Carries its own live regions, so `announce()` still speaks while it is open. `--trench` surface with a hairline border, no radius. |
| `Panel` | A raised flat surface | `--trench`, no radius, optional hairline border. |
| `Kbd` | A key | Martian Mono 14 px, hairline border, 2 px radius. |
| `Meter` | Mastery or progress | A labelled bar that prints its value in words ("62%", "3 of 10", "Unseen"). `role="meter"` or `role="progressbar"`. The unseen state is a dashed empty track. |
| `Tag` | KK tags | Martian Mono 14 px id in a hairline box, optional title after it. `KkTag` fills the title from the study design. |
| `RadioGroup` errors | A group-level error | `error` shows a `FieldError` under the legend, linked to the fieldset; pass a `value` matching no option to start with nothing chosen. |
| `EmptyState` | Nothing to show | A heading, a sentence saying what to do next, and one action. |
| `Banner` | Persistent warning | `--trench` block with a 4 px `--phosphor` left rule and a bold title, so it reads as a warning without colour. Stays until the problem is gone. |
| `VisuallyHidden` | Screen-reader-only text | |
| `Feedback` | Answer verdict | "✓ Correct" in `--flare`, or "✗ Incorrect" in `--steel` on `--trench` with a 120 ms horizontal nudge. Announces the verdict through the polite live region. |
| `LiveRegions` | The app's two live regions | One polite (`role="status"`), one assertive (`role="alert"`), both visually hidden, fed by `announce()` in `src/ui/announce.ts`. Mounted once in the layout, and again inside each open `Dialog` with `since`, so they speak only messages announced after it opened. |
| `ReportDialog` | Report a content problem (6.11) | Mounted once in the layout, opened with `openReport({ itemId })` from anywhere. |
| `ExternalLink` | A text link to another site | New tab, `rel="noopener noreferrer"`, and a hidden "(opens in a new tab)". |

Shell components in `src/app`: `Layout` (skip link, rail, tab bar and More menu, main column, storage banner, update prompt, onboarding guard, page titles), `StatusBar`, `Boot`.

## Motion inventory

| Motion | Duration | Trigger | Reduced motion |
|---|---|---|---|
| Boot sequence, full | About 1.2 s: lines print one by one over 1 s, then hold 0.2 s | First launch of each study day | Skipped entirely |
| Boot sequence, condensed | 300 ms, four lines | Every other launch | Skipped entirely |
| Card flip | 150 ms (`--dur-flip`) | Flipping a review card (track E) | Instant swap |
| Terminal drawer | 180 ms (`--dur-drawer`) | Opening or closing the drawer (track B) | Instant |
| Incorrect nudge | 120 ms (`--dur-nudge`), 4 px left and right | An incorrect answer | No movement |

Nothing else moves: no hover transitions, no page transitions, no loading spinners (loading states are words). Reduced motion applies when the user picks "Reduce motion" in Settings, or when the device asks for it and the setting is "Match my device". `main.tsx` mirrors the setting onto `html[data-motion]` (`system`, `reduce` or `full`); `global.css` stops every animation and transition when `data-motion="reduce"`, or when the device prefers reduced motion and `data-motion` is not `full`. Components with JavaScript-driven motion also check `useReducedMotion()` or `prefersReducedMotion()`.

Any key, click or tap skips the boot sequence. It is `aria-hidden`, holds nothing focusable, and never makes the page inert, so it never traps focus or blocks a screen reader.

## Status bar

tmux-style bracketed segments in Martian Mono: `[T-44d 04h] [37 due] [streak 6] [offline ready]`, plus `[not saving]` when storage fails. During the exam window it shows `[exam underway]`, and afterwards `[exam finished]`. Each segment's bracketed text is hidden from screen readers and replaced by a spoken label ("44 days and 4 hours until the exam", "37 reviews due"). The bar is not a live region, so the ticking countdown never interrupts anyone.

## Exam day

Home and the boot sequence change on the exam's date (D-178). From midnight in Melbourne until the start, Home's run gives way to a `Panel` headed with the start time ("Exam today at 3:00 pm (Melbourne time)"), the time left as a 20 px bold lead, one calm paragraph and two actions (Review a few cards, which reviews only the cards that are due, and Sit the mini paper); the coverage grid stays below. During reading and writing time Home shows only the heading and a panel saying the exam is underway and when each part ends: no run, due count, coverage or links. Afterwards a panel says the exam is over, with Export progress (primary), stats and the syllabus map. The boot sequence's exam line follows the same states ("today, 4h 12m to go", "underway, good luck", "over, well done"), and drops its reviews line during the exam. Every time left is rounded down to the minute, as the status bar rounds it.

## Review against Section 9

Checked against each point of Section 9 after the plan was written, and again after the screens were built and screenshotted at 1280 px and 360 px.

- **Palette.** Only the seven tokens are used. No green or red anywhere, including focus, errors and the storage warning. Errors use `--ice` text with a bold "Error:" or a phrase, never colour alone.
- **Focus ring (changed).** The brief puts the focus ring in `--cobalt`. Measured against `--trench`, cobalt is exactly 3.0:1, the bare minimum. I kept the cobalt ring and added a 2 px `--ice` halo in the offset gap so the ring is unmistakable on panels, inputs and primary buttons. It is drawn with a zero-blur `box-shadow` spread; that is a ring, not a shadow, and it is the only `box-shadow` in the product.
- **Hover states (changed).** Only seven colours exist, so hover can't lighten or darken a surface. Buttons underline their label on hover, and secondary buttons also switch their border to `--ice`. There are no hover transitions, keeping motion to user actions that matter. Every hover rule sits inside `@media (hover: hover)`, so a tap on a touch screen never leaves a link underlined or a border lit.
- **All caps (noted).** The COLDBOOT wordmark is the only all-caps text. Two unavoidable exceptions are literal strings, not labels: the word RESET that Settings asks the user to type (required by 6.10, shown as a keyed-in code in Martian Mono), and area ids such as U3O1 and KK ids, which are identifiers.
- **Eight destinations on a phone (decided).** Section 9 says the rail becomes a bottom tab bar but doesn't say how eight items fit 360 px. Five tabs (Home, Review, Drill, Terminal, More) with More opening a menu. The rejected alternative was a horizontally scrolling tab bar, which hides items and breaks the no-sideways-scroll rule.
- **First run (decided).** The rail, tabs, status bar and terminal are hidden until setup is done, because every route redirects to `/welcome` until then and a rail of dead links would mislead.
- **Status bar on a phone.** Kept at the bottom above the tab bar, reduced to the countdown and due count as briefed. The phone header with the wordmark and the terminal button scrolls away so the fixed chrome costs 84 px, not 132.
- **Boot sequence.** Built from real data only: the build id, KK counts per area and the map's provisional status, the content status once loaded, reviews due, and the time to the exam with its Melbourne time. Nothing in it is invented (no fake memory checks).
- **Screenshot critique (1280 px and 360 px, production build in Chromium).** Found and fixed:
  - The production CSP (`font-src 'self'`) blocked one Martian Mono subset that Vite had inlined as a `data:` URI. Fonts are now never inlined.
  - The date and time picker icons had been inverted into near-invisibility on the dark fields.
  - The hidden "(opens in a new tab)" text left a visible space before commas after external links.
  - A lone checkbox crowded the legend below it.
  - Boot lines wrapped heavily at 360 px; the phone label column is narrower and the map line is shorter. (Not enough: see the Phase 1 critique below.)
  - Pressing Reload within 200 ms of an update being found activated the new build without reloading the page.
  - No page scrolls sideways at 360 px (checked on Home, Settings, About and Not found); the focus ring shows on the skip link, rail links, inputs and buttons; the update prompt and storage banner sit clear of the status bar and tab bar.

## Phase 1 design critique: what changed and why

A second critique at the close of Phase 1 ran the production build with real content and a seeded profile at 1280 px and 360 px (touch), with axe-core and Lighthouse. Every finding marked wrong or misleading was fixed, and the contained style findings with it. The decisions:

- **Terminal at phone width.** On touch screens only the prompt line is 16 px (that is what stops iOS zooming into the input); the output stays 14 px, so a 360 px phone fits about 35 characters of Martian Mono. Below 720 px a two-column table (help, ls, results by key knowledge) stacks each row, the first cell on its own line and the second indented under it; explicit table roles keep it a table for screen readers. Share lines wrap (`wrap: true` on the `pre` block) instead of scrolling. Any table, listing or preformatted block that still overflows becomes a labelled tab stop while it overflows, measured the way figure canvases are. Like a figure's box it is a `group`, not a `region`: a round can print several listings with the same label, and duplicate region landmarks are an axe violation.
- **Terminal chips on phones.** One row that scrolls sideways, in the drawer and on the route, instead of three rows of a short screen. A `share` chip appears once a share line exists. The welcome line prints command names in bold `--ice` inside muted prose (a `tone: 'muted'` Markdown block). The drawer's close hint uses keycaps. On the Terminal route below 720 px the header drops Open terminal and the route's heading is visually hidden, giving the terminal the room.
- **Focus is never hidden by the fixed bars (WCAG 2.4.11).** `html` has `scroll-padding-bottom` of the status bar plus 16 px, and on phones the tab bar too. A bar stuck to the top of a page (the exam bar, the timed drill's clock) sets `--sticky-top` to its height with `useStickyTop()`, which `html`'s `scroll-padding-top` adds, so Shift+Tab upwards never lands under it. A syllabus map row, whose ring goes round the whole row, scrolls the whole row into view on focus.
- **One block width.** `--block-max` (72ch plus 48 px) sets the width of every panel and control block in a study column: card, options, feedback, model answer, mistake note, notices, banner. Their right edges now line up.
- **Keyboard hints on touch screens.** `.keys` hints and `.keyOnly` keycaps are hidden under `(hover: none) and (pointer: coarse)`; `aria-keyshortcuts` stays. Small print that isn't about keys uses `.hint`.
- **Rating buttons.** On phones, a 2 x 2 grid of single-line 44 px buttons, so all four sit above the fixed bars after the flip. When the exam cap moves a rating's due date, one line under the group says so ("Reviews stop 2 days before the exam, so Hard, Good and Easy all bring this card back on Wednesday 11 November."), since three identical intervals otherwise look like a bug.
- **Today's run on phones.** The three-step list folds into one line under the step heading ("Next: drill, then the daily challenge"), a disclosure that opens to the full list, so the task leads.
- **Syllabus map.** Below 720 px each area is a disclosure button (a triangle that turns when open) with the area holding the weakest key knowledge open; folded areas render no rows, which took the phone page from about 12,600 px to 5,000. The area id sits inline at the start of its heading instead of above it as an eyebrow. In rows the KK id is always on its own line with the title under it, so titles align. "Mastery" is for screen readers only, since the meter prints its value, and counts and last practice share one line ("11 cards, 5 MCQs, 2 short answers. Practised 2 days ago.").
- **Disclosures.** The case study insert on phones and the run's step summary use the native marker, like a figure's Text description; the insert's label says Show or Hide.
- **14 px floor for figures and code.** Figure labels never scale below 14 px (they used to reach 12); a figure wider than its box scrolls inside it with the existing hint. Inline code is `max(0.9em, 14px)` and code inside a listing inherits the listing's 14 px, so steel comments and line numbers never drop below 14 px.
- **Gantt charts in narrow boxes (decided).** When the full layout doesn't fit its box (phones, the case study insert), the chart switches to a compact layout: task ids beside bars sized to fit (8 px a day at least), and the names, durations and dependencies in a table under it. The rejected alternative was leaving the table columns inside the SVG, which on a phone filled the scroll box and hid the bars the question is about.
- **Report dialog.** No reason is chosen at first; sending or copying without one shows "Choose what's wrong, then open the issue or copy the report." on the group and moves focus there. On phones the button row sticks to the bottom of the dialog on `--trench` with a hairline above.
- **Placeholders say what to do next.** Stats points to the syllabus map, Daily runs the challenge in the terminal, and Exam offers a timed Section A drill and the case study.
- **Boot sequence on phones.** Shorter wording ("14 KK points", "503 cards, 338 Qs", "13 Nov, 3:00 pm AEDT") so no line wraps at 360 px.
- **Headings and names.** A written question's command term line is an `h2`, so "Model answer" (`h3`) sits under it in the outline. Coverage cells' accessible names start with their visible label ("PSM, Problem-solving methodology, unseen").
- **Loading (decided).** Home and first run ship with the shell; every other screen is its own chunk, and the terminal drawer (which brings the terminal, the figure renderers and markdown-it) mounts once the shell is idle, with a backtick before then loading it at once. The first load fell from 768 kB to 522 kB of JavaScript (249 to 164 kB gzip). The router updates in a transition under a Suspense boundary that is already showing, so a navigation keeps the current page up until the next screen's chunk arrives instead of flashing a loading state, and the lazy chunks are prefetched when the browser is idle. With the smaller entry chunk the first render beat the web fonts and the swap moved the page, so the build preloads the Latin subsets of both fonts.
- **Not changed.** Review cards keep inline code at 0.9 em of the card text (18 px on a 20 px front): it is above the floor and reads as code. The desktop case study insert is narrow enough that the context diagram now scrolls sideways rather than shrinking below 14 px; that is the intended trade.

## Phase 3 check

The production build was driven at 1280 px and 360 px (touch) with seeded progress and a pinned clock: Home and the boot sequence on exam day before 3 pm, in reading time, in writing time and after the exam, a boss round through its case study and summary, and a ux round. No page scrolled sideways and nothing tripped the CSP or logged an error. Found and fixed:

- **ux phone mock-ups scrolled sideways at 360 px.** They were 320 units wide, and the full-screen terminal at 360 px leaves a figure 294 px; since figures never scale below their natural size, the right edge (the Add button, the third column of keys) sat behind a scroll. Phone mock-ups are now 288 units wide (D-174).
- **The boot sequence and Home disagreed about the time left on exam day** by a minute, one rounding up and the other down. Both now round down, as the status bar does (D-178).

Not changed: in a narrow terminal the progress line of a boss case study question ("Case study question 2 of 3 [##.]") wraps before its bar, as any progress line longer than the row does; and the status bar keeps its due count and streak during the exam, since Home and the boot sequence are where study is asked for.

## Notes for other tracks

- Global styles cap `p`, `li`, `dd`, `dt`, `figcaption` and `blockquote` at 72ch. Terminal output and tables that need the full width should set `max-width: none` on their own elements.
- The terminal drawer should use `z-index: var(--z-drawer)` so it sits over the rail, status bar and tab bar but under the boot overlay. Dialogs use the native top layer.
- `Feedback` announces the verdict and plays the sound cue itself; call `announce()` only for other events.
- `useNow(intervalMs)` in `src/lib/useNow.ts` is the shared clock; `useNarrow()` in `src/ui/useMediaQuery.ts` is true below 720 px.
- A box that may scroll sideways must be reachable by keyboard: use `useScrollable()` (`src/figures/useScrollable.ts`) for elements React renders, or `useScrollableChildren()` (`src/ui/useScrollableChildren.ts`) for HTML injected as a string.
- Wrap new `:hover` rules in `@media (hover: hover)`, and size study panels with `--block-max`.
- `ExternalLink` and `ExternalButtonLink` are the only way to link off-site; `downloadJson` in `src/ui/download.ts` hands the user a file.
