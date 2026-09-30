/** Registry text for `threat`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const THREAT_ID = 'threat';
export const THREAT_TITLE = 'Security weaknesses and controls';
export const THREAT_GAME_KK: KkId[] = ['U4O2-KK03', 'U4O2-KK04', 'U4O2-KK07'];
export const THREAT_SUMMARY = 'Match weaknesses to security controls, and pick out the Essential Eight';

export const THREAT_MAN = `threat drills the security side of software development: spotting a weakness in how a team works, and choosing the control that fixes it. Everything here is about recognising weaknesses and defending against them.

Weaknesses and controls. A scenario describes a weakness, such as developers sharing one administrator account. Choose the control that best addresses it, by letter. The controls:
  identity and access management: an account for each person, with least privilege;
  a secrets manager, with code review to catch secrets before they are merged;
  separate development, testing and production environments;
  regular backups, tested by restoring them;
  patching and updating tools, libraries and systems;
  multi-factor authentication;
  code review before changes are merged;
  version control;
  encryption of stored data;
  physical security, such as a locked room with logged access.
Several controls help against most weaknesses, so read for the one that fixes this weakness directly. The feedback says why.

The Essential Eight. A list mixes the Australian Cyber Security Centre's eight mitigation strategies with useful security measures that aren't among them, such as firewalls and antivirus software. Type the letter of every Essential Eight strategy, in any order: A C D, a, c, d and acd all work. The eight are application control, patch applications, restrict Microsoft Office macros (also described as configuring Microsoft Office macro settings), user application hardening, restrict administrative privileges, patch operating systems, multi-factor authentication and regular backups.

Example: "Developers reach the code repository from home with only a username and password, and one password was stolen in a phishing email." The best control is multi-factor authentication: a stolen password alone can no longer log in.

A round has 10 questions: seven weaknesses, each needing a different control, and three Essential Eight lists. On a phone, tap a letter below the prompt.

Threat modelling steps aren't in this game yet. Putting the steps in order waits until their names are confirmed against the study design, which couldn't be checked when this game was built.

Difficulty: --easy offers three controls and a list of five, normal offers four controls and a list of six, and --hard offers five controls and a list of eight.

Usage: play threat [--easy|--hard]`;
