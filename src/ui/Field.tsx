/**
 * Form fields. Every field has a visible label, an optional hint and an optional error. Hints and
 * errors are linked to the control with aria-describedby; an error also sets aria-invalid.
 *
 * Write errors that say what happened and how to fix it: "Enter a whole number from 1 to 200."
 */
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { VisuallyHidden } from './VisuallyHidden';
import styles from './Field.module.css';

export type FieldWidth = 'full' | 'medium' | 'short';

interface FieldBaseProps {
  /** Visible label text. */
  label: ReactNode;
  /** Help shown under the label, read with the control. */
  hint?: ReactNode;
  /** Validation message. When set, the control is marked invalid. */
  error?: string | null;
  /** Control width: `full` (up to 28rem, default), `medium` (16rem) or `short` (10rem). */
  width?: FieldWidth;
}

function useFieldIds(id: string | undefined, hint: ReactNode, error: string | null | undefined) {
  const auto = useId();
  const controlId = id ?? `f${auto}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return { controlId, hintId, errorId, describedBy };
}

function widthClass(width: FieldWidth | undefined): string {
  return width === 'short' ? styles.short : width === 'medium' ? styles.medium : '';
}

function FieldFrame(props: {
  controlId: string;
  hintId?: string;
  errorId?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={props.controlId}>
        {props.label}
      </label>
      {props.hint ? (
        <p className={styles.hint} id={props.hintId}>
          {props.hint}
        </p>
      ) : null}
      {props.children}
      {props.error ? <FieldError id={props.errorId}>{props.error}</FieldError> : null}
    </div>
  );
}

/** A validation message. Used by every field; export it for errors that belong to a group of fields. */
export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p className={styles.error} id={id}>
      <VisuallyHidden>Error:</VisuallyHidden> {children}
    </p>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'width'>, FieldBaseProps {
  type?: 'text' | 'email' | 'search' | 'url' | 'password' | 'tel';
}

/** A single-line text input. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, width, id, className, type = 'text', ...rest },
  ref,
) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldFrame {...ids} label={label} hint={hint} error={error}>
      <input
        ref={ref}
        id={ids.controlId}
        type={type}
        className={[styles.input, widthClass(width), className].filter(Boolean).join(' ')}
        aria-describedby={ids.describedBy}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </FieldFrame>
  );
});

export interface NumberFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'width'>, FieldBaseProps {}

/**
 * A number input. Keep its value as a string in state so the user can clear it while typing, and
 * validate on submit. Set `min`, `max` and `step`; say the range in the hint.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { label, hint, error, width = 'short', id, className, ...rest },
  ref,
) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldFrame {...ids} label={label} hint={hint} error={error}>
      <input
        ref={ref}
        id={ids.controlId}
        type="number"
        inputMode="numeric"
        className={[styles.input, widthClass(width), className].filter(Boolean).join(' ')}
        aria-describedby={ids.describedBy}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </FieldFrame>
  );
});

export type DateFieldProps = NumberFieldProps;

/** A native date input. Its value is `YYYY-MM-DD`. */
export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  { label, hint, error, width = 'medium', id, className, ...rest },
  ref,
) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldFrame {...ids} label={label} hint={hint} error={error}>
      <input
        ref={ref}
        id={ids.controlId}
        type="date"
        className={[styles.input, widthClass(width), className].filter(Boolean).join(' ')}
        aria-describedby={ids.describedBy}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </FieldFrame>
  );
});

export type TimeFieldProps = NumberFieldProps;

/** A native time input. Its value is `HH:MM` (24-hour), whatever the display format. */
export const TimeField = forwardRef<HTMLInputElement, TimeFieldProps>(function TimeField(
  { label, hint, error, width = 'medium', id, className, ...rest },
  ref,
) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldFrame {...ids} label={label} hint={hint} error={error}>
      <input
        ref={ref}
        id={ids.controlId}
        type="time"
        className={[styles.input, widthClass(width), className].filter(Boolean).join(' ')}
        aria-describedby={ids.describedBy}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </FieldFrame>
  );
});

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'width'>, FieldBaseProps {}

/** A multi-line text input, e.g. a written answer or a report note. */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, width, id, className, rows = 4, ...rest },
  ref,
) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldFrame {...ids} label={label} hint={hint} error={error}>
      <textarea
        ref={ref}
        id={ids.controlId}
        rows={rows}
        className={[styles.input, styles.textarea, widthClass(width), className].filter(Boolean).join(' ')}
        aria-describedby={ids.describedBy}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </FieldFrame>
  );
});

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'width'>, FieldBaseProps {
  options: readonly SelectOption[];
}

/** A native select. Prefer `RadioGroup` for five or fewer options that fit on screen. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, width = 'medium', id, className, options, ...rest },
  ref,
) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldFrame {...ids} label={label} hint={hint} error={error}>
      <select
        ref={ref}
        id={ids.controlId}
        className={[styles.input, styles.select, widthClass(width), className].filter(Boolean).join(' ')}
        aria-describedby={ids.describedBy}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  hint?: ReactNode;
}

/** An on/off setting. The checked state shows as a filled box with a ✓, not by colour alone. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, hint, id, className, ...rest }, ref) {
  const ids = useFieldIds(id, hint, null);
  return (
    <div className={[styles.choice, styles.checkboxField, className].filter(Boolean).join(' ')}>
      <input
        ref={ref}
        id={ids.controlId}
        type="checkbox"
        className={styles.checkbox}
        aria-describedby={ids.describedBy}
        {...rest}
      />
      <div className={styles.choiceText}>
        <label htmlFor={ids.controlId} className={styles.choiceLabel}>
          {label}
        </label>
        {hint ? (
          <p className={styles.hint} id={ids.hintId}>
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
});

export interface RadioOption<T extends string = string> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
}

export interface RadioGroupProps<T extends string> {
  /** The question, shown as the fieldset legend. */
  legend: ReactNode;
  /** Shared `name` for the radios; must be unique on the page. */
  name: string;
  value: T;
  onChange(value: T): void;
  options: readonly RadioOption<T>[];
  hint?: ReactNode;
  className?: string;
}

/** One choice from a few options, as a fieldset of native radio buttons. */
export function RadioGroup<T extends string>({ legend, name, value, onChange, options, hint, className }: RadioGroupProps<T>) {
  const base = useId();
  const hintId = hint ? `r${base}-hint` : undefined;
  return (
    <fieldset className={[styles.fieldset, className].filter(Boolean).join(' ')} aria-describedby={hintId}>
      <legend className={styles.legend}>{legend}</legend>
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {options.map((o) => {
        const id = `r${base}-${o.value}`;
        const optHint = o.hint ? `${id}-hint` : undefined;
        return (
          <div className={styles.choice} key={o.value}>
            <input
              id={id}
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className={styles.radio}
              aria-describedby={optHint}
            />
            <div className={styles.choiceText}>
              <label htmlFor={id} className={styles.choiceLabel}>
                {o.label}
              </label>
              {o.hint ? (
                <p className={styles.hint} id={optHint}>
                  {o.hint}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
