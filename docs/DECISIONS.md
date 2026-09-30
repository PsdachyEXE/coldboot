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
