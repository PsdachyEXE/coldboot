# COLDBOOT

COLDBOOT is a free revision app for VCE Applied Computing: Software Development, Units 3 and 4. It's built for students sitting the exam on Friday 13 November 2026.

**Open it at https://psdachyexe.github.io/coldboot/**

It runs in the browser and works offline after your first visit. When a new version is published, it tells you an update is ready and reloads when you say so. Use it as a normal website or install it as an app.

## What's in it

- **Today's run.** The main button on Home takes you through today's flashcards, a 10-question drill on your weakest key knowledge and the daily challenge. If you leave part-way, Home offers to continue the run in the same tab.
- **Review.** Flashcards with spaced repetition. Cards come back just before you'd forget them, and the schedule tightens as the exam gets closer.
- **Drill.** Section A multiple-choice questions by key knowledge point, by area of study, from your weakest points or at random, with an optional timed round at exam pace. After each one you see the right answer, why it's right, and why each other option is wrong.
- **Written.** Section B short answers, and Section C questions on four case studies with the insert beside the questions. Type your answer, then mark it yourself against the marking points.
- **Exam.** A full practice paper: 15 minutes of reading time, then 2 hours for Sections A, B and C. The timer survives a reload. Section A marks itself, you mark B and C against the marking points, and the report breaks your score down by section and by key knowledge. A 30-minute mini paper fits a shorter session.
- **Daily challenge.** Ten questions, the same for everyone on the day, with a share line. Play it on the Daily screen or in the terminal.
- **Map and Stats.** Every item is tagged to the key knowledge of the study design. The syllabus map shows which points you're strong on, which are weak and which you haven't started. Stats charts your accuracy, reviews, cards coming due and time studied.
- **The terminal.** Press the backtick key (`` ` ``) or the Open terminal button to drop it down over any screen. It runs short games on the skills the exam tests: type `ls` to list them, `man <game>` to see how one works and `play <game>` to start one.

The games, by build priority:

- **P0:** `deskcheck` (trace pseudocode and build testing tables), `sort` (selection sort and quick sort), `search` (linear and binary search), `triage` (error types and debugging), `validate` (validation checks and boundary values), `blitz` (glossary terms against a 60-second clock) and `daily` (the daily challenge).
- **P1:** `dfd` (data flow diagram conventions), `usecase` (use case diagrams), `reqs` (requirements, constraints and scope), `gantt` (critical path and delays), `threat` (security weaknesses and controls), `law` (which Act applies), `naming` (naming conventions), `types` (data types, structures and sources), `oop` (classes, objects and access modifiers) and `psm` (the problem-solving methodology).
- **P2:** `boss` (three lives and 15 questions mixed from the other games, getting harder, then a case study you mark yourself) and `ux` (the weakest user experience characteristic in a mock-up).

Everything works from the keyboard. The status bar along the bottom counts down to the exam, and on exam day Home swaps Today's run for the start time and a light warm-up.

## Install

### Windows

Open PowerShell (press Start, type `PowerShell` and press Enter). Paste this line and press Enter:

```powershell
irm https://raw.githubusercontent.com/PsdachyEXE/coldboot/v1.0.0/install.ps1 | iex
```

You don't need admin rights. The installer:

- downloads the COLDBOOT icon into `%LOCALAPPDATA%\COLDBOOT`;
- adds a COLDBOOT shortcut to your Desktop and Start menu that opens the app in its own Microsoft Edge window, or Google Chrome if Edge isn't installed;
- opens COLDBOOT.

With neither Edge nor Chrome, it adds shortcuts that open COLDBOOT in your default browser instead, and tells you how to install it as an app from there. If a school or workplace has locked PowerShell down, the installer says so and stops without changing anything; install COLDBOOT from Edge or Chrome instead, the same way as on macOS below.

The shortcuts point at the website, so new questions and fixes arrive without reinstalling. If a shortcut goes missing or stops working, run the same command again to repair it.

To read the script before you run it, open https://raw.githubusercontent.com/PsdachyEXE/coldboot/v1.0.0/install.ps1 in your browser.

To uninstall, run:

```powershell
irm https://raw.githubusercontent.com/PsdachyEXE/coldboot/v1.0.0/uninstall.ps1 | iex
```

This removes the shortcuts and the `COLDBOOT` folder. It doesn't touch your study progress, which lives in the browser. If you also installed COLDBOOT from the browser menu, remove that copy at `edge://apps` in Edge or `chrome://apps` in Chrome.

### macOS, Linux and ChromeOS

Open https://psdachyexe.github.io/coldboot/ in Chrome or Edge, then install it as an app from the install icon in the address bar or from the browser menu.

In Safari on macOS Sonoma or later, open the page and choose File, then Add to Dock.

### Phones and tablets

Open https://psdachyexe.github.io/coldboot/ and add it to your home screen. On an iPhone or iPad, tap Share in Safari, then Add to Home Screen. On Android, open the browser menu and choose Add to Home screen (or Install app).

## Your progress

COLDBOOT has no accounts, analytics or trackers, and it only ever loads its own files. Your display name, settings and study progress (review schedule, answers, streak and practice papers) are saved in this browser's local storage, on this device only. Your place in Today's run and an unfinished answer on the Written screen are kept for the current tab only.

- **One browser profile, one set of progress.** The Windows shortcuts open COLDBOOT in the browser's Default profile, so the app window and ordinary Edge or Chrome tabs in that profile see the same progress. An app installed from the browser shares progress with the profile you installed it from. A different browser, another profile or a private window starts from scratch.
- **Back it up.** In Settings, choose Export progress to download a backup file. Do it every so often, and always before clearing your browser data: clearing the data for psdachyexe.github.io deletes your progress.
- **Move it.** On another device or browser, choose Import progress in Settings (or on the welcome screen) and pick your backup file. It replaces whatever progress is already there.
- **Start again.** Reset progress in Settings deletes your progress in this browser. You'll be asked to type RESET to confirm.

## Report a content problem

A wrong card teaches a wrong answer, so please report anything that looks off. Every card and question has a Report action: press R on a flashcard or a multiple-choice question, or type `report` in the terminal after answering a question there. It fills in the item's ID for you; choose a reason and add a note.

- **Open GitHub issue** files the report on the [issue tracker](https://github.com/PsdachyEXE/coldboot/issues).
- **Copy report** copies the same text, so you can send it to whoever shared COLDBOOT with you if you don't have a GitHub account.

## Scope

COLDBOOT covers the key knowledge of the VCE Applied Computing Study Design (accredited from 2025) for Software Development Units 3 and 4, the study design's glossary (Terms used in this study) and the problem-solving methodology. It doesn't cover anything else.

- Development models such as agile, waterfall and spiral are left out. They were part of the previous study design and still fill a lot of revision material, but they aren't key knowledge in the 2025 study design, which mentions agile only as one way to apply the problem-solving methodology.
- Exam tips such as naming data types exactly as the study design does come from the VCAA's 2025 examination report. A few others are a Victorian school's teacher advice, not VCAA rules. Your own teacher's advice comes first.
- The About screen in the app has the full scope note.

## Not affiliated with the VCAA

COLDBOOT is not affiliated with or endorsed by the Victorian Curriculum and Assessment Authority (VCAA). Every question is original and written in the style of VCAA exams; none is copied from the study design, past exams or examiners' reports. For the official word, see the VCAA's [Applied Computing study page](https://www.vcaa.vic.edu.au/curriculum/vce-curriculum/vce-study-designs/applied-computing/applied-computing) and its [Software Development exam page](https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/applied-computing-software-development).

## Status

- **Checked against the study design in October 2026.** COLDBOOT was first built from a reconstruction, because the VCAA's documents couldn't be downloaded. In October 2026 the key knowledge map, the glossary and every card, question and case study were checked against the 2025 study design and the VCAA's support material: the 2026 outcome-specific requirements, the 2025 examination and its report, the sample questions and the planning and teaching pages (D-198 onwards in `docs/DECISIONS.md`). The key knowledge numbering matched, so nothing was renumbered. Titles and summaries are COLDBOOT's own short wording, so check the study design for the exact text, and topics the sources don't settle are still held back (`docs/CONTENT_NOTES.md`).
- **The install commands need the `v1.0.0` tag.** The site deploys from `main`, and `v1.0.0` is tagged after the first green deploy. Until that tag exists, the Windows install and uninstall commands above won't work (D-002).

## Licence

No licence has been chosen yet, so the code and study content are all rights reserved by default, and `package.json` says `UNLICENSED`. Third-party packages keep their own licences; the two fonts, for example, are used under the SIL Open Font License 1.1.

## Development

You need Node.js 22.22 or later.

```sh
npm ci          # install the exact dependencies in package-lock.json
npm run dev     # start the dev server at http://localhost:5173
npm run check   # typecheck, lint, unit tests, content check, contrast check and installer lint
npm run build   # production build in dist/
npm run preview # serve the production build locally
npm run e2e     # Playwright end-to-end tests (run `npx playwright install chromium` once first)
```

`npm run e2e` builds the app itself and drives it in Chromium. Study content is JSON in `content/`, and `content/README.md` explains how to write it. `docs/` holds the design plan, the contracts between parts of the app, a log of every decision, the content left out and why, notes on the exam, and the pseudocode house style.

Pushes to `main` deploy to GitHub Pages through `.github/workflows/deploy.yml`. It runs the checks in `npm run check` and the build before deploying, then tests both installer scripts on Windows, under Windows PowerShell 5.1 and PowerShell 7, against the live site. Other branches and pull requests run `.github/workflows/ci.yml`: the same checks and build, the end-to-end tests, and static checks of both installer scripts on Windows.

### Changing the installer

The install and uninstall commands are pinned to the `v1.0.0` tag, so a change on `main` never reaches anyone's PowerShell by surprise. The app still updates on every deploy, because the shortcuts point at the site. If `install.ps1` or `uninstall.ps1` changes, tag a new release, then update the commands in this README, the uninstall command that `install.ps1` prints, and the commands in both scripts' header comments.

Both scripts must stay ASCII, keep all their code inside `& { ... }`, and never call `exit`, which would close the user's PowerShell window when run through `iex`. `npm run installer:lint` checks these rules and a few more.
