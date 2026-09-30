/** Name, exam start and new-card limit: the fields first run and Settings share. */
import { useId } from 'react';
import { NAME_MAX, NEW_CARD_LIMIT_MAX } from '../../../state/settings';
import { melbourneWallTimeToIso } from '../../../lib/time';
import { DateField, FieldError, NumberField, TextField, TimeField } from '../../../ui/Field';
import { deviceEquivalent, promptPreview, type StudyErrors, type StudyForm } from './validate';
import styles from './parts.module.css';

interface StudyFieldsProps {
  form: StudyForm;
  errors: StudyErrors;
  onChange(patch: Partial<StudyForm>): void;
}

export function StudyFields({ form, errors, onChange }: StudyFieldsProps) {
  const examHintId = useId();
  const iso = form.examDay && form.examTime ? melbourneWallTimeToIso(form.examDay, form.examTime) : null;
  const local = iso ? deviceEquivalent(iso) : null;
  return (
    <>
      <TextField
        label="Display name"
        hint={`Shown in the terminal prompt. Up to ${NAME_MAX} characters.`}
        value={form.name}
        maxLength={NAME_MAX}
        autoComplete="nickname"
        spellCheck={false}
        error={errors.name}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <p className={styles.preview}>
        <span className={styles.previewLabel}>Your prompt</span>
        <code className={styles.prompt}>{promptPreview(form.name)}</code>
      </p>

      <fieldset className={styles.fieldset} aria-describedby={examHintId}>
        <legend className={styles.legend}>When your exam starts (Melbourne time)</legend>
        <p className={styles.hint} id={examHintId}>
          The 2026 exam starts at 3:00 pm on Friday 13 November, with 15 minutes of reading time first. Change this only if your exam is
          at a different time.
        </p>
        <div className={styles.row}>
          <DateField label="Date" value={form.examDay} error={errors.examDay} onChange={(e) => onChange({ examDay: e.target.value })} />
          <TimeField label="Start time" value={form.examTime} error={errors.examTime} onChange={(e) => onChange({ examTime: e.target.value })} />
        </div>
        {errors.exam ? <FieldError>{errors.exam}</FieldError> : null}
        {local && !errors.exam ? <p className={styles.hint}>On this device's clock that's {local}.</p> : null}
      </fieldset>

      <NumberField
        label="New cards per day"
        hint={`How many new flashcards Review introduces each day, from 1 to ${NEW_CARD_LIMIT_MAX}. Reviews of cards you've already seen don't count.`}
        value={form.newCardLimit}
        min={1}
        max={NEW_CARD_LIMIT_MAX}
        step={1}
        error={errors.newCardLimit}
        onChange={(e) => onChange({ newCardLimit: e.target.value })}
      />
    </>
  );
}
