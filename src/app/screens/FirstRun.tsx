/**
 * First run (Section 6.1): display name, exam start and daily new-card limit, or import progress
 * from another device. Everything stays in this browser.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toMelbourneWallTime } from '../../lib/time';
import { useSettings } from '../../state/settings';
import { announce } from '../../ui/announce';
import { Button } from '../../ui/Button';
import { paths } from '../paths';
import { ImportProgress } from './settings/ImportProgress';
import { StudyFields } from './settings/StudyFields';
import { validateStudyForm, type StudyErrors, type StudyForm } from './settings/validate';
import styles from './ShellScreens.module.css';

function initialForm(): StudyForm {
  const s = useSettings.getState();
  const wall = toMelbourneWallTime(s.examAt) ?? { day: '2026-11-13', time: '15:00' };
  return { name: s.name, examDay: wall.day, examTime: wall.time, newCardLimit: String(s.newCardLimit) };
}

export default function FirstRun() {
  const navigate = useNavigate();
  const [form, setForm] = useState<StudyForm>(initialForm);
  const [errors, setErrors] = useState<StudyErrors>({});
  const [importNote, setImportNote] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // After a failed submit, put focus on the first field that needs fixing.
  useEffect(() => {
    if (attempt === 0) return;
    const el = formRef.current;
    const target = el?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? el?.querySelector<HTMLElement>('input[type="date"]');
    target?.focus();
  }, [attempt]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const result = validateStudyForm(form, Date.now());
    if (!result.ok) {
      setErrors(result.errors);
      setAttempt((n) => n + 1);
      const count = Object.keys(result.errors).length;
      announce(count === 1 ? 'One thing needs fixing before you start.' : `${count} things need fixing before you start.`);
      return;
    }
    useSettings.getState().completeOnboarding(result.values);
    navigate(paths.home, { replace: true });
  }

  function imported() {
    if (useSettings.getState().onboarded) {
      navigate(paths.home, { replace: true });
      return;
    }
    // The file was saved before its owner finished setting up: show what it holds and ask for the rest.
    setForm(initialForm());
    setErrors({});
    setImportNote(true);
    announce('Progress imported. Check your details, then select Start.');
  }

  return (
    <div className={styles.page}>
      <h1>Welcome to COLDBOOT</h1>
      <p className={styles.lead}>
        Revision for VCE Applied Computing: Software Development, Units 3 and 4. Set up three things and you're ready to start. Everything
        you enter stays in this browser.
      </p>

      {importNote ? (
        <p className={styles.notice}>
          Progress imported. Check your details, then select Start.
        </p>
      ) : null}

      <form ref={formRef} className={styles.form} onSubmit={submit} noValidate aria-label="Set up COLDBOOT">
        <StudyFields
          form={form}
          errors={errors}
          onChange={(patch) => {
            setForm((f) => ({ ...f, ...patch }));
            setErrors((e) => {
              const next = { ...e };
              for (const k of Object.keys(patch)) delete next[k as keyof StudyErrors];
              if ('examDay' in patch || 'examTime' in patch) delete next.exam;
              return next;
            });
          }}
        />
        <Button type="submit" variant="primary">
          Start
        </Button>
      </form>

      <section className={styles.section} aria-labelledby="returning">
        <h2 id="returning">Used COLDBOOT before?</h2>
        <p>If you exported your progress from another browser or device, import the file here instead of starting fresh.</p>
        <ImportProgress
          confirmLabel="Import this file"
          warning={<p>Importing replaces anything already saved in this browser, including your name and settings.</p>}
          onImported={imported}
        />
      </section>
    </div>
  );
}
