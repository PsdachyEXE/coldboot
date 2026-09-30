import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { VisuallyHidden } from './VisuallyHidden';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';
export type ButtonSize = 'normal' | 'small';

interface StyleProps {
  /**
   * `primary`: cobalt fill with ice text. Use once per view, for the action the view exists for.
   * `secondary` (default): hairline outline. `quiet`: text only, for low-emphasis actions.
   */
  variant?: ButtonVariant;
  /** `normal` is 44 px tall (a comfortable touch target); `small` is 36 px, for dense rows. */
  size?: ButtonSize;
}

function buttonClass({ variant = 'secondary', size = 'normal' }: StyleProps, extra?: string): string {
  return [styles.button, styles[variant], size === 'small' ? styles.small : '', extra ?? ''].filter(Boolean).join(' ');
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {}

/**
 * An action button. Name it after its result ("Start review", "Export progress"), in sentence
 * case, with no trailing arrow. `type` defaults to "button" so it never submits a form by accident.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, type = 'button', ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass({ variant, size }, className)} {...rest} />;
});

export interface ButtonLinkProps extends LinkProps, StyleProps {}

/** A router link that looks like a button. Use it when the action navigates to another screen. */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant, size, className, ...rest },
  ref,
) {
  return <Link ref={ref} className={buttonClass({ variant, size }, className)} {...rest} />;
});

export interface ExternalButtonLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel'>, StyleProps {
  href: string;
  children: ReactNode;
}

/**
 * An external link that looks like a button. It opens in a new tab with `rel="noopener noreferrer"`
 * and tells screen-reader users so.
 */
export const ExternalButtonLink = forwardRef<HTMLAnchorElement, ExternalButtonLinkProps>(function ExternalButtonLink(
  { variant, size, className, children, ...rest },
  ref,
) {
  return (
    <a ref={ref} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant, size }, className)} {...rest}>
      {children}
      <VisuallyHidden>{' (opens in a new tab)'}</VisuallyHidden>
    </a>
  );
});
