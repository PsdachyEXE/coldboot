import type { ReactNode } from 'react';
import styles from './Banner.module.css';

export interface BannerProps {
  /** Bold first line saying what's wrong, e.g. "Your progress isn't being saved". */
  title: string;
  /** Detail and how to fix it. */
  children?: ReactNode;
  /** Buttons, e.g. "Reload". */
  actions?: ReactNode;
  /**
   * `alert` interrupts screen readers when the banner appears (use for problems that risk lost
   * work); `status` (default) is announced politely.
   */
  role?: 'alert' | 'status';
  className?: string;
}

/**
 * A persistent warning at the top of the main column. It stays until the problem is gone; there is
 * no close button. Its bold title and left rule mark it as a warning without relying on colour.
 */
export function Banner({ title, children, actions, role = 'status', className }: BannerProps) {
  return (
    <div role={role} className={[styles.banner, className].filter(Boolean).join(' ')}>
      <p className={styles.title}>{title}</p>
      {children ? <div className={styles.body}>{children}</div> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
