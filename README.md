# COLDBOOT

COLDBOOT is a free revision app for VCE Applied Computing: Software Development, Units 3 and 4. It's built for students sitting the exam on Friday 13 November 2026.

**Open it at https://psdachyexe.github.io/coldboot/**

It runs in the browser, works offline after your first visit, and updates itself when a new version is published. Use it as a normal website or install it as an app.

## What's in it

- **Flashcards with spaced repetition.** Cards come back just before you'd forget them, and the schedule tightens as the exam gets closer.
- **Section A drills.** Multiple-choice questions in the exam's style. After each one you see the right answer, why it's right, and why each other option is wrong.
- **Written practice for Sections B and C.** Type your answer to a short-answer or case study question, then mark it yourself against the marking points.
- **A drop-down terminal.** Press the backtick key (`` ` ``) on any screen to open it. It runs short games on the skills the exam tests, such as desk checking pseudocode, sorting and searching, triaging errors and validating input, plus a daily challenge that's the same for everyone on the day.
- **A syllabus map.** Every item is tagged to the key knowledge of the study design, so you can see which points you're strong on, which are weak and which you haven't started.

Everything works from the keyboard, and the status bar along the bottom counts down to the exam.

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

With neither Edge nor Chrome, it adds shortcuts that open COLDBOOT in your default browser instead, and tells you how to install it as an app from there.

The shortcuts point at the website, so new questions and fixes arrive without reinstalling. If a shortcut goes missing or stops working, run the same command again to repair it.

To read the script before you run it, open https://raw.githubusercontent.com/PsdachyEXE/coldboot/v1.0.0/install.ps1 in your browser.

To uninstall, run:

```powershell
irm https://raw.githubusercontent.com/PsdachyEXE/coldboot/v1.0.0/uninstall.ps1 | iex
```

This removes the shortcuts and the `COLDBOOT` folder. It doesn't touch your study progress, which lives in the browser.

### macOS, Linux and ChromeOS

Open https://psdachyexe.github.io/coldboot/ in Chrome or Edge, then install it as an app from the install icon in the address bar or from the browser menu.

In Safari on macOS Sonoma or later, open the page and choose File, then Add to Dock.

### Phones and tablets

Open https://psdachyexe.github.io/coldboot/ and add it to your home screen. On an iPhone or iPad, tap Share in Safari, then Add to Home Screen. On Android, open the browser menu and choose Add to Home screen (or Install app).

## Your progress

COLDBOOT has no accounts and sends nothing anywhere. Your display name, settings and study progress are saved in this browser's local storage, on this device only.

- **One browser profile, one set of progress.** The Windows shortcuts open COLDBOOT in the browser's Default profile, so the app window and ordinary Edge or Chrome tabs in that profile see the same progress. An app installed from the browser shares progress with the profile you installed it from. A different browser, another profile or a private window starts from scratch.
- **Back it up.** In Settings, choose Export progress to download a backup file. Do it every so often, and always before clearing your browser data: clearing the data for psdachyexe.github.io deletes your progress.
- **Move it.** On another device or browser, choose Import progress in Settings and pick your backup file. It replaces whatever progress is already there.
- **Start again.** Reset progress in Settings deletes your progress in this browser. You'll be asked to type RESET to confirm.

## Report a content problem

A wrong card teaches a wrong answer, so please report anything that looks off. Every card and question has a Report action (on a flashcard, press R). It fills in the item's ID for you; choose a reason and add a note.

- **Open GitHub issue** files the report on the [issue tracker](https://github.com/PsdachyEXE/coldboot/issues).
- **Copy report** copies the same text, so you can send it to whoever shared COLDBOOT with you if you don't have a GitHub account.

## Scope

COLDBOOT covers the key knowledge of the VCE Applied Computing Study Design (accredited from 2025) for Software Development Units 3 and 4, the study design's glossary (Terms used in this study) and the problem-solving methodology. It doesn't cover anything else.

- Development models such as agile, waterfall and spiral are left out. They were part of the previous study design and still fill a lot of revision material, but they weren't found in the 2025 key knowledge.
- Exam tips, such as naming data types in full, are a Victorian school's teacher advice, not VCAA rules. Your own teacher's advice comes first.
- The About screen in the app has the full scope note, including anything still waiting to be checked against the study design.

## Not affiliated with the VCAA

COLDBOOT is not affiliated with or endorsed by the Victorian Curriculum and Assessment Authority (VCAA). Every question is original and written in the style of VCAA exams; none is copied from the study design, past exams or examiners' reports. For the official word, see the VCAA's [Applied Computing study page](https://www.vcaa.vic.edu.au/curriculum/vce-curriculum/vce-study-designs/applied-computing/applied-computing) and its [Software Development exam page](https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/applied-computing-software-development).

## Development

You need Node.js 22.22 or later.

```sh
npm ci          # install the exact dependencies in package-lock.json
npm run dev     # start the dev server at http://localhost:5173
npm run check   # typecheck, lint, unit tests, content check, contrast check and installer lint
npm run build   # production build in dist/
npm run e2e     # Playwright end-to-end tests (run `npx playwright install chromium` once first)
```

`npm run preview` serves the production build locally. Study content is JSON in `content/`, and `content/README.md` explains how to write it. `docs/` holds the design plan, the contracts between parts of the app and a log of every decision.

Pushes to `main` deploy to GitHub Pages through `.github/workflows/deploy.yml`. It runs every check before deploying, then tests both installer scripts on Windows, under Windows PowerShell 5.1 and PowerShell 7, against the live site.

### Changing the installer

The install and uninstall commands are pinned to the `v1.0.0` tag, so a change on `main` never reaches anyone's PowerShell by surprise. The app still updates on every deploy, because the shortcuts point at the site. If `install.ps1` or `uninstall.ps1` changes, tag a new release, then update the commands in this README and the uninstall command that `install.ps1` prints.

Both scripts must stay ASCII, keep all their code inside `& { ... }`, and never call `exit`, which would close the user's PowerShell window when run through `iex`. `npm run installer:lint` checks these rules and a few more.
