/** Registry text for `law`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const LAW_ID = 'law';
export const LAW_TITLE = 'Privacy, health records and copyright law';
/** The Health Records Act questions count towards TERMS: neither KK names that Act (items.ts). */
export const LAW_GAME_KK: KkId[] = ['U4O2-KK07', 'U3O2-KK10', 'TERMS'];
export const LAW_SUMMARY = 'Decide which Act applies to a scenario, and why';

export const LAW_MAN = `law drills which Act applies to a scenario, and why. Three things decide it: the jurisdiction (Commonwealth or Victoria), who the Act binds, and the kind of data involved.

  Privacy Act 1988 (Cwlth): Australian Government agencies, and private organisations with an annual turnover above $3 million, plus some smaller businesses such as health service providers. It doesn't generally cover state or local government.
  Privacy and Data Protection Act 2014: Victoria's Act for its public sector, such as departments, councils and government schools, and the contracted service providers its contracts bind. A private business isn't covered just because it is based in Victoria, and health information is left to the Health Records Act.
  Health Records Act 2001 (Vic): health information held by Victorian organisations, public and private alike.
  Copyright Act 1968 (Cwlth): code, images and text are copyright works, so copying, changing or reusing them generally needs the owner's permission or a licence. Being published online doesn't make them free to copy, and buying a licence allows only what the licence says.

The key knowledge for both units (U3O2-KK10 and U4O2-KK07) names the Copyright Act, the Privacy Act and the Privacy and Data Protection Act, with the principles below. Unit 4's list also has the Essential Eight and the Information Security Manual's Guidelines for Software Development. Neither list names the Health Records Act: it is one of the Acts under legal requirements in the glossary (Terms used in this study), so the questions it answers count towards TERMS.

Australian Privacy Principles (APPs), from the Privacy Act. Unit 3 lists 1, 3, 6, 8, 9 and 11; Unit 4 lists the same without 3.
  1 Open and transparent management of personal information
  3 Collection of solicited personal information (Unit 3 only)
  6 Use or disclosure of personal information
  8 Cross-border disclosure of personal information
  9 Adoption, use or disclosure of government related identifiers
  11 Security of personal information
Information Privacy Principles (IPPs), from the Privacy and Data Protection Act. Unit 3 lists 1, 2, 4, 5, 7, 9 and 10; Unit 4 lists the same without 7 and 10.
  1 Collection
  2 Use and disclosure
  4 Data security
  5 Openness
  7 Unique identifiers (Unit 3 only)
  9 Transborder data flows
  10 Sensitive information (Unit 3 only)

Each scenario has two questions. First, which Act applies: type a letter from A to D, or the Act's name, such as health records act. Then, why it applies: choose the reason that is true for this scenario. The other reasons are false for it. The feedback for a Privacy Act or Privacy and Data Protection Act scenario also names a principle at stake, one that both units list.

Sometimes two Acts apply. A small private clinic in Victoria that keeps health records is covered by the Health Records Act and, as a health service provider, by the Privacy Act. Those questions ask for the Victorian Act or the Commonwealth Act, so only one answer fits, and the feedback names both.

Example: "A Victorian local council's app records each resident's name, phone number and address. Which Act governs how the council handles this personal information?" Type B, the Privacy and Data Protection Act 2014: a council is part of the Victorian public sector.

A round has 10 questions: five scenarios, each asking which Act and then why. On a phone, tap a letter below the prompt.

This game summarises who each Act applies to at the level of a textbook. It isn't legal advice.

Difficulty: --easy leaves out the trickiest scenarios, such as contractors and the Commonwealth questions about small health providers, and offers three reasons to choose from; normal uses every scenario with four reasons; and --hard leaves out the plainest scenarios.

Usage: play law [--easy|--hard]`;
