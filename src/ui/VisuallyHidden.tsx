import type { ElementType, ReactNode } from 'react';
import styles from './VisuallyHidden.module.css';

interface VisuallyHiddenProps {
  children: ReactNode;
  /** Element to render (default `span`). */
  as?: ElementType;
  id?: string;
}

/** Text for screen readers only. It stays in the accessibility tree but takes no space on screen. */
export function VisuallyHidden({ children, as: Tag = 'span', id }: VisuallyHiddenProps) {
  return (
    <Tag className={styles.hidden} id={id}>
      {children}
    </Tag>
  );
}
