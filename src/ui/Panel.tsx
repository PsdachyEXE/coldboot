import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Panel.module.css';

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  /** Element to render: `section` for a titled block, `aside` for side content (default `div`). */
  as?: 'div' | 'section' | 'aside' | 'article';
  /** Adds a hairline --steel border. Use it only where structure needs it. */
  bordered?: boolean;
  /** `compact` halves the padding, for dense lists. */
  padding?: 'normal' | 'compact';
  children: ReactNode;
}

/** A flat raised surface: --trench, no radius, no shadow. */
export function Panel({ as: Tag = 'div', bordered = false, padding = 'normal', className, children, ...rest }: PanelProps) {
  const cls = [styles.panel, bordered ? styles.bordered : '', padding === 'compact' ? styles.compact : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}
