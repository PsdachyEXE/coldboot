/** Registry text for `law`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const LAW_ID = 'law';
export const LAW_TITLE = 'Privacy, health records and copyright law';
export const LAW_GAME_KK: KkId[] = ['U4O2-KK07', 'U3O2-KK10'];
export const LAW_SUMMARY = 'Decide which Act applies to a scenario, and why';

export const LAW_MAN = `law drills which Act applies to a scenario, and why. Three things decide it: the jurisdiction (Commonwealth or Victoria), who the Act binds, and the kind of data involved.

  Privacy Act 1988 (Cth), with the Australian Privacy Principles: Australian Government agencies, and private organisations with an annual turnover above $3 million, plus some smaller businesses such as health service providers. It doesn't cover state or local government.
  Privacy and Data Protection Act 2014 (Vic): the Victorian public sector, such as departments, councils and government schools, and the contracted service providers its contracts bind. A private business isn't covered just because it is based in Victoria.
  Health Records Act 2001 (Vic): health information held by Victorian organisations, public and private alike.
  Copyright Act 1968 (Cth): code, images and text are copyright works, so reusing them needs the owner's permission or a licence. Being published online doesn't make them free to copy.

Each scenario has two questions. First, which Act applies: type a letter from A to D, or the Act's name, such as health records act. Then, why it applies: choose the reason that is true for this scenario. The other reasons are false for it.

Sometimes two Acts apply. A small private clinic in Victoria that keeps health records is covered by the Health Records Act and, as a health service provider, by the Privacy Act. Those questions ask for the Victorian Act or the Commonwealth Act, so only one answer fits, and the feedback names both.

Example: "A Victorian local council's app records each resident's name, phone number and address. Which Act governs how the council handles this personal information?" Type B, the Privacy and Data Protection Act 2014 (Vic): a council is part of the Victorian public sector.

A round has 10 questions: five scenarios, each asking which Act and then why. On a phone, tap a letter below the prompt.

This game summarises the Acts at the level of a textbook. It isn't legal advice, and the exact set of Acts in the study design is still to be confirmed.

Difficulty: --easy leaves out contractors and the Commonwealth questions about small health providers, and offers three reasons to choose from; normal uses every scenario with four reasons; and --hard leaves out the plainest scenarios.

Usage: play law [--easy|--hard]`;
