/**
 * Settings and data (Section 6.10): name, exam start, new-card limit, sound, motion, export,
 * import, reset, and the app version with an update check.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toMelbourneWallTime } from '../../lib/time';
import { buildExport, exportFilename, resetAllProgress } from '../../state/exportImport';
import { useSettings, type MotionPreference } from '../../state/settings';
import { announce } from '../../ui/announce';
import { Button } from '../../ui/Button';
import { downloadJson } from '../../ui/download';
import { Checkbox, RadioGroup, TextField } from '../../ui/Field';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { paths } from '../paths';
import { usePwa, type UpdateCheck } from '../pwa';
import { ImportProgress } from './settings/ImportProgress';
import { StudyFields } from './settings/StudyFields';
import { validateStudyForm, type StudyErrors, type StudyForm } from './settings/validate';
import styles from './ShellScreens.module.css';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';
const BUILD_TIME = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '';

export const RESET_WORD = 'RESET';

function formFromSettings(): StudyForm {
  const s = useSettings.getState();
  const wall = toMelbourneWallTime(s.examAt) ?? { day: '2026-11-13', time: '15:00' };
  return { name: s.name, examDay: wall.day, examTime: wall.time, newCardLimit: String(s.newCardLimit) };
}

export default function Settings() {
  // Remount the study form after an import so it shows the imported values.
  const [formKey, setFormKey] = useState(0);
  return (
    <div className={styles.page}>
      <h1>Settings</h1>
      <section aria-labelledby="study-settings">
        <h2 id="study-settings">Study settings</h2>
        <StudySettingsForm key={formKey} />
      </section>
      <SoundAndMotion />
      <YourProgress onImported={() => setFormKey((k) => k + 1)} />
      <Version />
    </div>
  );
}

function StudySettingsForm() {
  const [form, setForm] = useState<StudyForm>(formFromSettings);
  const [errors, setErrors] = useState<StudyErrors>({});
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (attempt === 0) return;
    const el = formRef.current;
    (el?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? el?.querySelector<HTMLElement>('input[type="date"]'))?.focus();
  }, [attempt]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const settings = useSettings.getState();
    const result = validateStudyForm(form, Date.now(), settings.examAt);
    if (!result.ok) {
      setErrors(result.errors);
      setSaved(false);
      setAttempt((n) => n + 1);
      return;
    }
    settings.setName(result.values.name);
    settings.setExamAt(result.values.examAt);
    settings.setNewCardLimit(result.values.newCardLimit);
    setForm((f) => ({ ...f, name: result.values.name }));
    setErrors({});
    setSaved(true);
    announce('Changes saved.');
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={submit} noValidate aria-labelledby="study-settings">
      <StudyFields
        form={form}
        errors={errors}
        onChange={(patch) => {
          setSaved(false);
          setForm((f) => ({ ...f, ...patch }));
          setErrors((e) => {
            const next = { ...e };
            for (const k of Object.keys(patch)) delete next[k as keyof StudyErrors];
            if ('examDay' in patch || 'examTime' in patch) delete next.exam;
            return next;
          });
        }}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="primary">
          Save changes
        </Button>
        {saved ? <p className={styles.status}>Changes saved.</p> : null}
      </div>
    </form>
  );
}

function SoundAndMotion() {
  const sound = useSettings((s) => s.sound);
  const motion = useSettings((s) => s.motion);
  const deviceReduces = useMediaQuery('(prefers-reduced-motion: reduce)');
  return (
    <section className={styles.section} aria-labelledby="sound-motion">
      <h2 id="sound-motion">Sound and motion</h2>
      <p>These apply straight away.</p>
      <Checkbox
        label="Play sounds"
        hint="Short tones for correct and incorrect answers and at the end of a session."
        checked={sound}
        onChange={(e) => useSettings.getState().setSound(e.target.checked)}
      />
      <RadioGroup<MotionPreference>
        legend="Motion"
        name="motion"
        value={motion}
        onChange={(m) => useSettings.getState().setMotion(m)}
        options={[
          {
            value: 'system',
            label: 'Match this device',
            hint: deviceReduces ? 'This device asks for reduced motion.' : 'This device allows full motion.',
          },
          { value: 'reduce', label: 'Reduce motion', hint: 'No boot sequence, card flips or answer nudges.' },
          { value: 'full', label: 'Full motion', hint: 'Keep the boot sequence and animations even if this device asks for less.' },
        ]}
      />
    </section>
  );
}

function YourProgress({ onImported }: { onImported(): void }) {
  const navigate = useNavigate();
  const [exported, setExported] = useState<string | null>(null);
  const [exportFailed, setExportFailed] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  function exportProgress() {
    const now = Date.now();
    const name = exportFilename(now);
    const ok = downloadJson(name, buildExport(now));
    setExportFailed(!ok);
    setExported(ok ? name : null);
    if (ok) announce(`Progress exported as ${name}.`);
  }

  function reset() {
    if (confirmText !== RESET_WORD) return;
    resetAllProgress();
    announce('Progress reset.');
    navigate(paths.welcome, { replace: true });
  }

  return (
    <section className={styles.section} aria-labelledby="your-progress">
      <h2 id="your-progress">Your progress</h2>
      <p>
        Your progress is stored only in this browser. Export it regularly: the file lets you move to another device, and it's your backup if
        the browser clears its storage.
      </p>

      <div className={styles.subsection}>
        <h3>Export progress</h3>
        <p>Saves a file with your settings, review schedule, attempts and streak.</p>
        <Button onClick={exportProgress}>Export progress</Button>
        {exported ? (
          <p className={styles.status}>
            Progress exported as {exported}. Keep it somewhere safe, such as your school drive.
          </p>
        ) : null}
        {exportFailed ? (
          <p role="alert" className={styles.status}>
            Your browser blocked the download. Allow downloads for this site, then try again.
          </p>
        ) : null}
      </div>

      <div className={styles.subsection}>
        <h3>Import progress</h3>
        <p>Replaces the progress in this browser with a file you exported earlier.</p>
        <ImportProgress
          confirmLabel="Replace my progress"
          warning={<p>This replaces all progress in this browser, including your name and settings. It can't be undone.</p>}
          onImported={onImported}
        />
      </div>

      <div className={styles.subsection}>
        <h3>Reset progress</h3>
        <p>
          Deletes your name, settings, review schedule, attempts and streak from this browser and returns you to the welcome screen. Export
          first if you might want them back.
        </p>
        <TextField
          label={
            <>
              Type <span className={styles.confirmCode}>{RESET_WORD}</span> to confirm
            </>
          }
          width="medium"
          value={confirmText}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          onChange={(e) => setConfirmText(e.target.value)}
        />
        <Button onClick={reset} disabled={confirmText !== RESET_WORD}>
          Reset progress
        </Button>
      </div>
    </section>
  );
}

const CHECK_MESSAGES: Record<Exclude<UpdateCheck, 'ready'>, string> = {
  latest: "You're on the latest version.",
  unavailable: "This browser can't check for updates here. Reload the page to get the latest version.",
  error: "Couldn't check for updates. Check your connection, then try again.",
};

function Version() {
  const [check, setCheck] = useState<UpdateCheck | 'checking' | null>(null);
  const updateWaiting = usePwa((s) => s.updateWaiting);
  const built = BUILD_TIME ? new Date(BUILD_TIME) : null;

  async function checkForUpdates() {
    setCheck('checking');
    const result = await usePwa.getState().checkForUpdate();
    setCheck(result);
    announce(result === 'ready' ? 'Update ready. Reload now?' : CHECK_MESSAGES[result]);
  }

  const ready = check === 'ready' || (check !== 'checking' && updateWaiting);

  return (
    <section className={styles.section} aria-labelledby="version">
      <h2 id="version">Version</h2>
      <dl className={styles.facts}>
        <dt>Version</dt>
        <dd>{APP_VERSION}</dd>
        <dt>Build</dt>
        <dd>
          <code>{BUILD_ID}</code>
        </dd>
        {built && Number.isFinite(built.getTime()) ? (
          <>
            <dt>Built</dt>
            <dd>{built.toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' })}</dd>
          </>
        ) : null}
      </dl>
      <div className={styles.actions}>
        <Button onClick={() => void checkForUpdates()} disabled={check === 'checking'}>
          Check for updates
        </Button>
        {ready ? (
          <Button variant="primary" onClick={() => void usePwa.getState().reload()}>
            Reload
          </Button>
        ) : null}
      </div>
      {check === 'checking' ? <p className={styles.status}>Checking for updates</p> : null}
      {ready ? <p className={styles.status}>Update ready. Reload now?</p> : null}
      {check && check !== 'checking' && check !== 'ready' && !ready ? <p className={styles.status}>{CHECK_MESSAGES[check]}</p> : null}
    </section>
  );
}
