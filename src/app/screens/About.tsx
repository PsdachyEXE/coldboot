/** About: what COLDBOOT is, the VCAA credit and disclaimer, scope, privacy, reporting and credits. */
import { REPO_URL } from '../../lib/report';
import { ExternalLink } from '../../ui/ExternalLink';
import styles from './ShellScreens.module.css';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

export const VCAA_STUDY_URL = 'https://www.vcaa.vic.edu.au/curriculum/vce-curriculum/vce-study-designs/applied-computing/applied-computing';
export const VCAA_EXAM_URL =
  'https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/applied-computing-software-development';

export default function About() {
  return (
    <div className={styles.page}>
      <h1>About COLDBOOT</h1>
      <p className={styles.lead}>
        COLDBOOT is a free revision app for VCE Applied Computing: Software Development, Units 3 and 4, built for students sitting the exam
        on Friday 13 November 2026.
      </p>
      <p>
        It schedules flashcards with spaced repetition, drills you on exam-style multiple-choice and written questions, and runs short
        terminal games on the skills the exam tests, such as desk checking, sorting and searching. Every item is tagged to the key knowledge
        of the study design, so you can see exactly which points you're weak on.
      </p>

      <section className={styles.section} aria-labelledby="vcaa">
        <h2 id="vcaa">The VCAA and the study design</h2>
        <p>
          The study design, the exam and its reports are published by the Victorian Curriculum and Assessment Authority (VCAA).{' '}
          <strong>COLDBOOT is not affiliated with or endorsed by the VCAA.</strong> Every question in it is original, written in the style of
          VCAA exams; none is copied from the study design, past exams or examiners' reports.
        </p>
        <p>For the official word, go to the VCAA:</p>
        <ul className={styles.links}>
          <li>
            <ExternalLink href={VCAA_STUDY_URL}>VCE Applied Computing study page</ExternalLink>, with the study design
          </li>
          <li>
            <ExternalLink href={VCAA_EXAM_URL}>Applied Computing: Software Development exam page</ExternalLink>, with the exam specifications,
            past exams and examiners' reports
          </li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="scope">
        <h2 id="scope">Scope</h2>
        <ul>
          <li>
            <strong>The key knowledge map is provisional.</strong> The study design couldn't be checked when this version was built, so the key
            knowledge titles and numbering follow a reconstruction from the VCAA's support pages and the 2025 exam. They will be corrected against the study design, and items may be
            renumbered or added when that happens.
          </li>
          <li>
            <strong>Development models (agile, waterfall, spiral) are left out.</strong> They were part of the previous study design and still
            fill a lot of revision material, but the build brief couldn't find them in the 2025 key knowledge. They stay out until that is
            confirmed.
          </li>
          <li>
            <strong>Exam tips are advice, not rules.</strong> Tips such as naming data types in full come from a Victorian school's teacher
            advice, not from the VCAA. Your teacher's advice comes first.
          </li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="privacy">
        <h2 id="privacy">Privacy</h2>
        <p>
          COLDBOOT stores only a display name and your study progress, in this browser on this device. There are no accounts, analytics or
          trackers, and the app makes no network requests except to load its own files. Your progress leaves this browser only if you export
          it.
        </p>
        <p>Clearing this site's data in your browser deletes your progress, so export a backup from Settings from time to time.</p>
      </section>

      <section className={styles.section} aria-labelledby="report">
        <h2 id="report">Report a content problem</h2>
        <p>
          If a card or question looks wrong, unclear or outside the study design, use its Report action (or press R while reviewing). The form
          names the item for you. Choose Open GitHub issue to file it on GitHub, or Copy report to send the text to whoever shared COLDBOOT
          with you if you don't have a GitHub account.
        </p>
        <p>
          Reports go to the <ExternalLink href={`${REPO_URL}/issues`}>COLDBOOT issue tracker on GitHub</ExternalLink>.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="fonts">
        <h2 id="fonts">Fonts</h2>
        <p>
          Reading text is set in Atkinson Hyperlegible Next, designed for legibility by the Braille Institute of America. Code, the terminal
          and the status bar use Martian Mono by Evil Martians. Both fonts are used under the SIL Open Font License 1.1.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="about-version">
        <h2 id="about-version">Version</h2>
        <p>
          Version {APP_VERSION}, build <code>{BUILD_ID}</code>.
        </p>
      </section>
    </div>
  );
}
