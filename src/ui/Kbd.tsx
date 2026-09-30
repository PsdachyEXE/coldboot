import type { ReactNode } from 'react';
import styles from './Kbd.module.css';

/** A keyboard key, e.g. `<Kbd>Space</Kbd>`. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>;
}
