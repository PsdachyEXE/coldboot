import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** What is empty, said plainly: "No reviews due". */
  title: string;
  /** One or two sentences saying what to do next. */
  children: ReactNode;
  /** The next step, usually one `Button` or `ButtonLink`. */
  action?: ReactNode;
  /** Heading level for the title (default 2). */
  headingLevel?: 2 | 3;
}

/** Shown when a list or screen has nothing in it. Always says what to do next. */
export function EmptyState({ title, children, action, headingLevel = 2 }: EmptyStateProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <div className={styles.empty}>
      <Heading className={styles.title}>{title}</Heading>
      <div className={styles.text}>{children}</div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
