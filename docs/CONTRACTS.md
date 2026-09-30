# Contracts and ownership

The locked interfaces every part of COLDBOOT builds against, and who owns which files. Any change to a contract updates every consumer in the same commit.

## Contract files

| Contract | File | Notes |
|---|---|---|
| Content schemas (Zod) and types | `src/content/schema.ts` | `Card`, `Mcq`, `ShortAnswer`, `Figure`, `CaseStudy`, `StudyDesign`, `PsmFile`, floors. Figure schemas check structure, not conventions: an unlabelled DFD flow and a use case association between two actors both validate, so games can teach those errors |
| KK map | `content/study-design.json`, `src/content/studyDesign.ts` | ids `U3O1-KK01`…, plus `TERMS` and `PSM`; `status` is `provisional` until checked against the study design; `kkMapVersion` and `renames`, applied by `kkRenamer` in `src/content/schema.ts` (see KK renumbering below) |
| Content loading and index | `src/content/loader.ts` | per-outcome dynamic imports; `loadAllContent()` returns a `ContentIndex` (with `caseByKk` and `cardIds`); failed loads are retried, never cached |
| Shared content store | `src/content/store.ts` | `useContentIndex()` loads once for every screen; prunes SRS records for cards that left the content |
| Markdown | `src/content/markdown.ts`, `src/ui/Markdown.tsx` | markdown-it, HTML off; ```` ```pseudo ```` fences get numbered, highlighted listings; a table whose corner header is empty (a comparison) gets row headers (`th scope="row"`) and a plain corner cell |
| Content checker | `src/content/check.ts`, `scripts/content-check.ts`, `tests/content.test.ts` | |
| Command terms | `src/content/commandTerms.ts` | |
| Terminal output blocks | `src/terminal/blocks.ts` | `TerminalBlock` union; plain data. A `figure` block may carry `highlight` and `compact`, passed to `FigureView`; the speech digest reads out marked elements |
| Games | `src/games/types.ts` | `Game`, `GameSession`, `GameContext`, `AnswerResult`, `GameSummary`, `GameMeta`, `QuizItem`, `CheckResult`; `markdown` on `AnswerResult`/`CheckResult` marks feedback from bundled content; `GameSession.unavailable` holds blocks explaining why a game can't run (the host prints them and starts nothing); `GameMeta.fixedDifficulty` marks a one-level game (blitz, daily, boss); `AnswerResult.advanced` (with `counted: false`) moves a game on without marking anything, and `AnswerResult.selfMarked` records a score the student gave themselves without a Correct or Incorrect verdict (boss's case study) |
| Quiz engine | `src/games/engine.ts`, `src/games/answers.ts`, `src/games/mcq.ts` | `createQuizSession` over a `QuizItem` list or a seeded generator (round of 10, timed rounds, `exposeItemIds`, `resumeScores` to resume a list after items answered in an earlier sitting, `intro` blocks shown once above the first prompt); `unavailableSession(gameId, blocks)`; lenient answer parsers, including `parseOption` (a lettered option by letter, text or both) and `parseLetters` (a set of letters, A to H); `mcqItem` for content MCQs |
| Game registry | `src/games/registry.ts` | `GAMES` (what `ls`, `man`, `play` and completion see; the seven P0 games in the brief's order: deskcheck, sort, search, triage, validate, blitz, daily; then the ten P1 games in the brief's order: dfd, usecase, reqs, gantt, threat, law, naming, types, oop, psm; then the two P2 games in the brief's order: boss, ux; the types game's folder is `types-game/`; boss loads every generator game through the registry and has no `generate`, so it never feeds the daily challenge), `findGame`, `DRILL_GAME` |
| Terminal session and host | `src/terminal/session.ts`, `src/terminal/host.ts` | `useTerminalSession`: one session for the drawer and the route; the host starts games, records answers, runs the daily protocol and ends timed games. It prints an unavailable session's blocks under the title instead of starting it, and `play` refuses `--easy` and `--hard` for a fixed-difficulty game. For an `advanced` answer it records nothing and prints the follow-up and the next prompt; for a `selfMarked` one it records the score and prints only the follow-up, with no verdict and no sound |
| Daily challenge set | `src/games/daily.ts`, `src/games/daily-game/` | `buildDailySet(date, mcqPool)` (8 MCQs by rendezvous hash + 2 generated from `DAILY_GENERATOR_GAMES`: the five P0 generators, the nine P1 ones (psm excepted) and the P2 game ux), `dailyShareText`; the `daily` game (`loadDailyGame`) plays the set, with generated items as `gen-daily-<game>:<seed>` at normal difficulty |
| Daily screen | `src/app/daily/` | `/daily` plays `dailyRefs` / `dailyItem` with `loadGenerators` (through `useGenerators`) and keeps the same record as the terminal: `beginDaily` on start, `recordDaily` after `recordAttempt` per counted answer |
| Stats aggregations | `src/app/stats/aggregate.ts` | pure: `lastDays`, `accuracyByArea`, `reviewsPerDay`, `timePerDay`, `totalTime`, `dueForecast` (by study day, cards due now counted today), `weakestKks` (seen KKs only, unseen counted apart), `niceTicks` |
| PRNG | `src/games/prng.ts` | `mulberry32`, `hashString`, `dailySeed`, `pick`, `shuffle`, `sample` |
| Time | `src/lib/time.ts` | study day (4 am rollover), `localDate` (the device's calendar date, no rollover), Melbourne date, countdown, exam phases, `examDayState` (study, exam-day on the exam's Melbourne date, underway, over: what Home and the boot sequence say), `formatMelbourneClock`, `formatTimeLeft` |
| Clock hook | `src/lib/useNow.ts` | `useNow(intervalMs)` returns epoch ms, refreshed every interval and when the page becomes visible again; the status bar uses 15 s |
| Text matching | `src/lib/text.ts` | `normaliseAnswer`, `editDistance`, `nearest`, `parseList`, `parseNumberList` |
| Report links | `src/lib/report.ts`, `src/ui/report.ts` | prefilled GitHub issue URL, at most `ISSUE_URL_MAX` characters (a note too long for the link is shortened there; the copied report keeps it whole); `openReport({ itemId })` opens the shared dialog |
| Stores | `src/state/settings.ts`, `srs.ts`, `attempts.ts`, `session.ts` | Zustand; persisted as `coldboot:v1:<name>` envelopes |
| Persistence | `src/state/storage.ts`, `src/state/persist.ts` | guarded localStorage, debounced writes, migrations, per-record salvage with quarantine, newer-build blocking, cross-window merge, `useStorageHealth`, and the `persistedStores` registry that export, import and reset iterate. A new persisted store (e.g. the exam autosave) only needs `persistStore(...)`. Reset, import and a reset in another window also run `clearTabState()`: it removes this tab's `coldboot:v1:` sessionStorage keys (written drafts) and calls what registered with `onClearTabState` (the terminal host resets the terminal session) |
| Recording answers | `src/state/record.ts` | `recordAttempt(attempt, { review })` is the only way to log an answer |
| Export and import | `src/state/exportImport.ts` | format 1: one `{ v, data }` envelope per store (older store versions migrate on import); 5 MB cap; Zod-validated; all-or-nothing; `exportFilename` uses the device's local date |
| Mastery | `src/srs/mastery.ts` | `computeMastery(attempts, now)`; unseen KKs are absent, never 0 |
| SM-2 and queue | `src/srs/sm2.ts`, `src/srs/queue.ts` | `schedule`, `buildQueue` and `orderNewCards` signatures locked. `schedule` applies the final-week cap (`FINAL_WEEK_DAYS`, `FINAL_WEEK_MAX_INTERVAL`) and the exam-day clamp (`EXAM_CAP_DAYS_BEFORE`), keeps `due` at the start of a study day and stores the interval actually scheduled; also `RATINGS`, `nextEase`, `newCardState`, `capDueDay`, `MAX_EASE`, `MAX_INTERVAL_DAYS`, `directionFor(card, reps)` and `nextDueAfter(srs, now, known?)` |
| Study hooks | `src/srs/hooks.ts` | `useMastery()` (memoised on the attempt log, roll-up and KK map, refreshed every `MASTERY_TICK_MS`), `masteryNow()`, `useExamAt()`, `useDueSummary(now)` |
| Routes | `src/app/paths.ts`, `src/app/routes.tsx` | hash router; `drillPath`, `writtenPath` (including `cs` for Section C practice), `reviewPath`, `examPath`; `practisePath(kk)` is where a KK link practises it (a drill, or Review for `TERMS`, which has no MCQs) |
| Announcements | `src/ui/announce.ts` | `announce(message, priority)` feeds the ARIA live regions that `<LiveRegions>` renders in the shell; `politeSeq` and `assertiveSeq` let a repeated message speak again in its own region. A native modal makes those regions inert, so every open `Dialog` mounts its own pair (`<LiveRegions since>`), which speaks only what is announced after it opened |
| Motion | `src/ui/motion.ts` | `useReducedMotion()`, `prefersReducedMotion()` |
| Sound | `src/ui/sound.ts` | `playCue('correct' \| 'incorrect' \| 'complete')`: WebAudio tones only when `settings.sound` is on; never throws; `CUES` holds the tones |
| Terminal drawer state | `src/terminal/useTerminal.ts` | `useTerminal`: `open`, `toggle`, `setOpen`, `run(command)` (opens the drawer and runs a command), `takePending`, `lastGameEnd`, `reportGameEnd` |
| Figures | `src/figures/index.ts` | `<FigureView figure={f} highlight? compact? />`; also `computeSchedule`/`trySchedule` (critical path method), `asciiGantt`, `describeFigure` (text descriptions) |
| Design tokens | `src/ui/tokens.css`, `src/ui/contrast-pairs.json` | colours, type steps, spacing `--space-1`…`--space-7`, shell geometry (`--control-h`, `--rail-w`, `--status-h`, `--tabbar-h`, `--content-max`) and stacking (`--z-rail`, `--z-bars`, `--z-popover`, `--z-drawer`, `--z-boot`); every new text/background pairing gets a row in contrast-pairs |
| UI primitives | `src/ui/index.ts`, `src/ui/global.css` | the shared components (buttons, fields, `Dialog`, `Panel`, `Meter`, `Tag`/`KkTag`, `EmptyState`, `Banner`, `Feedback`, `ReportDialog`, `useNarrow`, …) listed in `docs/DESIGN.md`; `global.css` sets page type, the focus ring and reduced motion, and caps reading elements at 72ch (wide terminal or table output sets `max-width: none`) |
| Shell | `src/app/Layout.tsx`, `src/app/pwa.ts` | Layout mounts `<TerminalDrawer />` inside the router once first run is done, plus `<LiveRegions />` and `<ReportDialog />`; it sets `--terminal-route-offset` for the full-screen terminal. `usePwa` wraps the service worker (`needRefresh`, `reload`, `checkForUpdate`) |
| Zod settings | `src/lib/zodConfig.ts` | exports the configured `z`: every module that builds or runs a schema imports it from here (ESLint forbids value imports from `'zod'`), so jitless mode is on before any schema exists, whatever the code splitting, and Zod never probes `new Function` under the production CSP. `main.tsx` also imports it first |
| Exam simulator | `src/exam/store.ts`, `src/exam/actions.ts`, `src/exam/timer.ts`, `src/exam/paper.ts`, `src/exam/links.ts` | `useExam` is persisted as `coldboot:v1:exam` (the paper in progress and summaries of the last 20 marked papers) and registers through `exportImport.ts`, so it ships with the shell as data, schema, salvage and merge only; `examActions` (start, answer, submit, setTicks, finish, discard, ...) loads with the exam route. The exam store is optional in progress files. `timerState(stamps, config, now)` derives idle, reading, writing and submitted from absolute timestamps. `assemblePaper(content, mode, seed)` is pure and seeded. Views: `/exam`, `/exam?mini=1`, `/exam?sit=1`, `/exam?report=<id>` |
| Case study panel and self-marking | `src/app/study/CaseInsert.tsx`, `src/app/study/MarkingPoints.tsx` | `CaseStudyLayout`, `CaseInsert`, `QuestionFigureRefs` (a page with its own sticky bar sets `--case-insert-top`); `ModelAnswer`, `MarkingPoints`. Shared by Written and the exam |

## Ownership (Phase 1 tracks)

| Track | Owns |
|---|---|
| Orchestrator | Source download and `reference/SOURCE_DIGEST.md`, reconciling Section 4 (`content/study-design.json` status, `verify`, `held`, renames), `docs/EXAM_INSIGHTS.md`, the Section 8.3 content review pass, the design critique, Lighthouse, merging tracks, `docs/DECISIONS.md` |
| A. Shell and design system | `src/app/Layout.tsx`, `src/app/StatusBar*`, `src/app/Boot*`, `src/app/screens/{FirstRun,Settings,About,NotFound}.tsx`, `src/ui/**` (except the contract files above, which it may extend), `src/main.tsx`, PWA registration and update prompt, `docs/DESIGN.md`, tests for `src/state/**` |
| B. Terminal and games | `src/terminal/**`, `src/games/**` (engine, registry, one folder per game), tests for `prng` and `text` |
| C. Unit 3 content, Terms, PSM | `content/u3o1/**`, `content/u3o2/**`, `content/terms.json`, `content/psm.json`, and the `glossary` array in `content/study-design.json` |
| D. Unit 4 content, case study, figures | `content/u4o1/**`, `content/u4o2/**`, `content/case-studies/**`, `src/figures/**` |
| E. SRS and study screens | `src/srs/**`, `src/app/screens/{Home,Run,Review,Drill,Written,SyllabusMap}.tsx` and their parts in `src/app/study/`, tests for `time` and `mastery` |
| F. Distribution | `install.ps1`, `uninstall.ps1`, installer CI job in `.github/workflows/deploy.yml`, `README.md` |

## Ownership (Phase 2, P1 tracks)

| Track | Owns |
|---|---|
| X. Exam simulator | `src/exam/**`, and the shared `src/app/study/CaseInsert.tsx` and `MarkingPoints.tsx` it moved out of Written |
| G1. Games | `src/games/{dfd,usecase,reqs,gantt,psm}/`, figure block `highlight` and `compact` in `src/terminal/blocks.ts` |
| G2. Games | `src/games/{threat,law,naming,types-game,oop}/`, `parseOption` and `parseLetters` in `src/games/answers.ts` |
| S. Stats, Daily and e2e | `src/app/stats/**`, `src/app/daily/**`, `src/app/screens/{Stats,Daily}.tsx`, `e2e/**`, `playwright.config.ts`, the e2e job in `.github/workflows/ci.yml` |
| Orchestrator | merging, case study 2 (`content/case-studies/cs-02.json`), `DAILY_GENERATOR_GAMES`, `docs/DECISIONS.md` |

Shared files (`package.json`, `src/app/routes.tsx`, `src/app/paths.ts`, contract files): change only when the task needs it, keep the change minimal, and say so in the commit message.

## Rules the contracts rely on

- **Figures.** MCQs and short answers may carry `figures` (up to two). Every renderer (Review, Drill, Written, the exam, terminal games) shows them above the stem or prompt with `<FigureView>` or a `figure` block. Case study questions point at the insert's figures with `figureRefs`.
- **Reverse cards** keep one SRS record and alternate direction with `reps` (forward when even). `QueueEntry.direction` carries it. No suffixed SRS keys.
- **Ids are permanent once shipped.** Dropped items are logged in `docs/CONTENT_NOTES.md`, never reused. Prefixes: `c-` cards, `m-` MCQs, `s-` short answers, `t-` glossary cards, `psm-c-`/`psm-m-`/`psm-s-` PSM items, `cs-NN-qNN` case study questions. Pattern: `c-u3o1-kk04-003`.
- **Held KKs.** A KK whose items depend on an unconfirmed "verify" entry can be marked `held` in `study-design.json` (with a reason, mirrored in `CONTENT_NOTES.md`); its floor shortfall then warns instead of failing.
- **Glossary.** `study-design.json` lists the glossary terms (labels only); `terms.json` has exactly one reverse card per entry.
- **KK renumbering.** A renumbering bumps `kkMapVersion` in `study-design.json` and lists each change in `renames`, with `since` set to the new version. All the renames of one version apply at once, so a shift or a swap works in any order, and versions apply in order; the content check rejects a KK renamed twice in one version and a rename whose id ends up off the map. The attempt log (`kkMap` on the store) and exam history (`kkMap` on each summary, absent meaning 1) are renamed on hydrate and before a cross-window merge. Shipping a renumbering also needs an attempts store version bump and an exam store version bump, each with a `migrate` that passes the data through (hydrate renames it), so a build on the old map open in another window blocks through the newer-version path instead of saving old ids under the new `kkMap`. A test in `src/state/attempts.test.ts` pins the three versions together, so it fails until both stores are bumped.
- **Daily challenge.** The set comes only from `buildDailySet`. The host calls `beginDaily(date, session.itemIds)` once, then `recordDaily(date, index, correct, now)` per answer; only the first attempt at each index counts, and the share line is built from the stored record. The Daily screen follows the same protocol, so either can start the day and the other carries on. Before checking an answer, the host compares the stored record with its own position; when the other side has moved on, it restarts the game from the record instead of counting the answer. Once a day has begun, the game rebuilds its set from the stored item ids, resumes at the first unanswered question, and replaces an MCQ that has left the content with a generated item in the same place.
- **Generated items** set `instance` (e.g. `deskcheck:seed=1234:i=4:hard`) so a report can regenerate them. Content reports carry `__BUILD_ID__`.
- **Markdown flags.** `choices` and `feedback` blocks may set `markdown: true` only for strings from bundled content.

## Conventions

- Australian spelling in all text (organisation, behaviour, colour, licence as a noun); "program" for software.
- Copy: sentence case, plain active verbs. A button's name matches its result ("Start review" leads to "Review complete"). Empty states say what to do next. Errors say what happened and how to fix it.
- No all-caps labels (the COLDBOOT wordmark is the only all-caps text), no eyebrow labels, no arrows appended to button text, no middle-dot metadata strings.
- Colour never carries meaning alone. Correct: `--flare`, ✓ glyph and the word "Correct". Incorrect: `--steel` on `--trench`, ✗ glyph, the word "Incorrect" and a 120 ms horizontal nudge. No green or red anywhere.
- Every answer is recorded through `recordAttempt`. Scores: card ratings Again 0, Hard 0.5, Good 0.8, Easy 1; MCQs and game items 0 or 1; short answers marks earned over marks available.
- Generated attempt item ids match `/^[a-z0-9][a-z0-9._:-]{0,119}$/`, e.g. `gen-sort-selection`, and never count toward content floors.
- Imported or user-typed strings are rendered as React text only, never through Markdown or `dangerouslySetInnerHTML`.
- Storage keys always go through `src/state/storage.ts` (prefix `coldboot:v1:`).
- CSS: custom properties from `src/ui/tokens.css` and CSS modules (`*.module.css`). No UI kit, no Tailwind, no shadows, no gradients. Controls get a 2 px radius; panels get none.
- Tests live beside the code (`*.test.ts(x)`); Vitest runs in jsdom. Run `COLDBOOT_SKIP_FLOORS=1 npm test` while content is incomplete.
- Commits: conventional commit messages (`feat(terminal): ...`, `test(srs): ...`, `content(u3o1): ...`).

## Checks

```
npm run typecheck
npm run lint
COLDBOOT_SKIP_FLOORS=1 npm test
npm run content:check -- --floors=warn
npm run contrast:check
npm run installer:lint
npm run build
npm run e2e        # Playwright: builds, previews and drives Chromium (e2e/, playwright.config.ts)
```
