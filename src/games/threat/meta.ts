/** Registry text for `threat`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const THREAT_ID = 'threat';
export const THREAT_TITLE = 'Security weaknesses and controls';
export const THREAT_GAME_KK: KkId[] = ['U4O2-KK03', 'U4O2-KK04', 'U4O2-KK07'];
export const THREAT_SUMMARY = 'Match vulnerabilities and risks to security controls, and pick out the Essential Eight';

export const THREAT_MAN = `threat drills the security side of software development: spotting a weakness in how a team works, choosing the security control that addresses it, and knowing the Essential Eight. Everything here is about recognising weaknesses and defending against them.

Weaknesses and controls. A scenario describes a weakness, such as developers sharing one administrator account. Choose the control that best addresses it, by letter or by name. The answers are the six security controls in the key knowledge (U4O2-KK04):
  version control and code repositories;
  robust identity and access management;
  encryption;
  code review;
  regular updates and patches to software;
  separated development, testing and production environments.
Several controls can help against most weaknesses, so read for the one that fixes this weakness directly. The feedback says why, and names the vulnerability or risk from the study design's list (U4O2-KK03) that the weakness shows, where it shows one: use of application programming interfaces (APIs), malware, unpatched software, poor identity and access management practices, man-in-the-middle attacks, insider threats, cyber security incidents, risks present from software acquired by third parties, ineffective code review practices, and combined development, testing and production environments.

Multi-factor authentication and backups aren't in the list of controls: they are Essential Eight strategies. A password-only login is a weakness in identity and access management, which includes strong authentication. Version control keeps the code's history so a team can roll back to a working version; it isn't a backup.

Controls aren't strategies. The study design's strategies for improving the security of development practices (U4O2-KK10) are onboarding or induction and developer training focused on secure development, and developing risk management plans that identify risks, weigh their impact and likelihood, and propose controls. When a question asks for a strategy, a control such as encryption or code review doesn't answer it.

Matching a weakness to a control is the middle of the three threat modelling principles (U4O2-KK05): defining security requirements, identifying and mitigating threats, and confirming threats have been mitigated.

The Essential Eight. A list mixes the eight mitigation strategies with security measures that aren't among them, including some of the study design's own controls and strategies. Type the letter of every Essential Eight strategy, in any order: A C D, a, c, d and acd all work. The eight are patch applications, patch operating systems, multi-factor authentication, restrict administrative privileges, application control, restrict Microsoft Office macros, user application hardening and regular backups.

Example: "Developers reach the code repository from home with only a username and password, and one password was stolen in a phishing email." The best control is robust identity and access management: with strong authentication, such as multi-factor authentication, a stolen password alone can no longer log in.

A round has 10 questions: seven weaknesses, covering all six controls, and three Essential Eight lists. On a phone, tap a letter below the prompt.

Difficulty: --easy offers three controls and a list of five, normal offers four controls and a list of six, and --hard offers five controls and a list of eight.

Usage: play threat [--easy|--hard]`;
