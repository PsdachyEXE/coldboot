# Contracts and ownership

The locked interfaces every part of COLDBOOT builds against, and who owns which files. Any change to a contract updates every consumer in the same commit.

## Contract files

| Contract | File | Notes |
|---|---|---|
| Content schemas (Zod) and types | `src/content/schema.ts` | `Card`, `Mcq`, `ShortAnswer`, `Figure`, `CaseStudy`, `StudyDesign`, `PsmFile`, floors |
| KK map | `content/study-design.json`, `src/content/studyDesign.ts` | ids `U3O1-KK01`…, plus `TERMS` and `PSM`; `status` is `provisional` until checked against the study design |
| Content loading and index | `src/content/loader.ts` | per-outcome dynamic imports; `loadAllContent()` returns a `ContentIndex` (with `caseByKk` and `cardIds`); failed loads are retried, never cached |
| Shared content store | `src/content/store.ts` | `useContentIndex()` loads once for every screen; prunes SRS records for cards that left the content |
| Markdown | `src/content/markdown.ts`, `src/ui/Markdown.tsx` | markdown-it, HTML off; ```` ```pseudo ```` fences get numbered, highlighted listings |
| Content checker | `src/content/check.ts`, `scripts/content-check.ts`, `tests/content.test.ts` | |
| Command terms | `src/content/commandTerms.ts` | |
| Terminal output blocks | `src/terminal/blocks.ts` | `TerminalBlock` union; plain data |
| Games | `src/games/types.ts` | `Game`, `GameSession`, `GameContext`, `AnswerResult`, `GameSummary`, `GameMeta`, `QuizItem`, `CheckResult`; `markdown` on `AnswerResult`/`CheckResult` marks feedback from bundled content |
| Quiz engine | `src/games/engine.ts`, `src/games/answers.ts`, `src/games/mcq.ts` | `createQuizSession` over a `QuizItem` list or a seeded generator (round of 10, timed rounds, `exposeItemIds`); lenient answer parsers; `mcqItem` for content MCQs |
| Game registry | `src/games/registry.ts` | `GAMES` (what `ls`, `man`, `play` and completion see), `findGame`, `DRILL_GAME` |
| Terminal session and host | `src/terminal/session.ts`, `src/terminal/host.ts` | `useTerminalSession`: one session for the drawer and the route; the host starts games, records answers, runs the daily protocol and ends timed games |
| Daily challenge set | `src/games/daily.ts` | `buildDailySet(date, mcqPool)` (8 MCQs by rendezvous hash + 2 generated), `dailyShareText` |
| PRNG | `src/games/prng.ts` | `mulberry32`, `hashString`, `dailySeed`, `pick`, `shuffle`, `sample` |
| Time | `src/lib/time.ts` | study day (4 am rollover), Melbourne date, countdown, exam phases |
| Text matching | `src/lib/text.ts` | `normaliseAnswer`, `editDistance`, `nearest`, `parseList`, `parseNumberList` |
| Report links | `src/lib/report.ts`, `src/ui/report.ts` | prefilled GitHub issue URL; `openReport({ itemId })` opens the shared dialog |
| Stores | `src/state/settings.ts`, `srs.ts`, `attempts.ts`, `session.ts` | Zustand; persisted as `coldboot:v1:<name>` envelopes |
| Persistence | `src/state/storage.ts`, `src/state/persist.ts` | guarded localStorage, debounced writes, migrations, per-record salvage with quarantine, newer-build blocking, cross-window merge, `useStorageHealth`, and the `persistedStores` registry that export, import and reset iterate. A new persisted store (e.g. the exam autosave) only needs `persistStore(...)` |
| Recording answers | `src/state/record.ts` | `recordAttempt(attempt, { review })` is the only way to log an answer |
| Export and import | `src/state/exportImport.ts` | format 1: one `{ v, data }` envelope per store (older store versions migrate on import); 5 MB cap; Zod-validated; all-or-nothing |
| Mastery | `src/srs/mastery.ts` | `computeMastery(attempts, now)`; unseen KKs are absent, never 0 |
| SM-2 and queue | `src/srs/sm2.ts`, `src/srs/queue.ts` | signatures locked; implemented by track E |
| Routes | `src/app/paths.ts`, `src/app/routes.tsx` | hash router; `drillPath`, `writtenPath` (including `cs` for Section C practice), `reviewPath`, `examPath` |
| Announcements | `src/ui/announce.ts` | `announce(message)` feeds the ARIA live region |
| Motion | `src/ui/motion.ts` | `useReducedMotion()`, `prefersReducedMotion()` |
| Sound | `src/ui/sound.ts` | `playCue('correct' \| 'incorrect' \| 'complete')` |
| Terminal drawer state | `src/terminal/useTerminal.ts` | `useTerminal`: `open`, `toggle`, `setOpen`, `run(command)` (opens the drawer and runs a command), `takePending`, `lastGameEnd`, `reportGameEnd` |
| Figures | `src/figures/index.ts` | `<FigureView figure={f} />` |
| Design tokens | `src/ui/tokens.css`, `src/ui/contrast-pairs.json` | every new text/background pairing gets a row in contrast-pairs |

## Ownership (Phase 1 tracks)

| Track | Owns |
|---|---|
| Orchestrator | Source download and `reference/SOURCE_DIGEST.md`, reconciling Section 4 (`content/study-design.json` status, `verify`, `held`, renames), `docs/EXAM_INSIGHTS.md`, the Section 8.3 content review pass, the design critique, Lighthouse, merging tracks, `docs/DECISIONS.md` |
| A. Shell and design system | `src/app/Layout.tsx`, `src/app/StatusBar*`, `src/app/Boot*`, `src/app/screens/{FirstRun,Settings,About,NotFound}.tsx`, `src/ui/**` (except the contract files above, which it may extend), `src/main.tsx`, PWA registration and update prompt, `docs/DESIGN.md`, tests for `src/state/**` |
| B. Terminal and games | `src/terminal/**`, `src/games/**` (engine, registry, one folder per game), tests for `prng` and `text` |
| C. Unit 3 content, Terms, PSM | `content/u3o1/**`, `content/u3o2/**`, `content/terms.json`, `content/psm.json`, and the `glossary` array in `content/study-design.json` |
| D. Unit 4 content, case study, figures | `content/u4o1/**`, `content/u4o2/**`, `content/case-studies/**`, `src/figures/**` |
| E. SRS and study screens | `src/srs/**`, `src/app/screens/{Home,Run,Review,Drill,Written,SyllabusMap}.tsx` and their parts, tests for `time` and `mastery` |
| F. Distribution | `install.ps1`, `uninstall.ps1`, installer CI job in `.github/workflows/deploy.yml`, `README.md` |

Shared files (`package.json`, `src/app/routes.tsx`, `src/app/paths.ts`, contract files): change only when the task needs it, keep the change minimal, and say so in the commit message.

## Rules the contracts rely on

- **Figures.** MCQs and short answers may carry `figures` (up to two). Every renderer (Review, Drill, Written, the exam, terminal games) shows them above the stem or prompt with `<FigureView>` or a `figure` block. Case study questions point at the insert's figures with `figureRefs`.
- **Reverse cards** keep one SRS record and alternate direction with `reps` (forward when even). `QueueEntry.direction` carries it. No suffixed SRS keys.
- **Ids are permanent once shipped.** Dropped items are logged in `docs/CONTENT_NOTES.md`, never reused. Prefixes: `c-` cards, `m-` MCQs, `s-` short answers, `t-` glossary cards, `psm-c-`/`psm-m-`/`psm-s-` PSM items, `cs-NN-qNN` case study questions. Pattern: `c-u3o1-kk04-003`.
- **Held KKs.** A KK whose items depend on an unconfirmed "verify" entry can be marked `held` in `study-design.json` (with a reason, mirrored in `CONTENT_NOTES.md`); its floor shortfall then warns instead of failing.
- **Glossary.** `study-design.json` lists the glossary terms (labels only); `terms.json` has exactly one reverse card per entry.
- **Daily challenge.** The set comes only from `buildDailySet`. The host calls `beginDaily(date, session.itemIds)` once, then `recordDaily(date, index, correct, now)` per answer; only the first attempt at each index counts, and the share line is built from the stored record.
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
```
