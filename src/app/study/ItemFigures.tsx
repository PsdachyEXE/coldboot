/** An item's figures, shown above its stem or prompt. */
import type { Figure } from '../../content/schema';
import { FigureView } from '../../figures';
import styles from './study.module.css';

export function ItemFigures({ figures }: { figures?: readonly Figure[] }) {
  if (!figures?.length) return null;
  return (
    <div className={styles.figures}>
      {figures.map((f) => (
        <div key={f.id} className={styles.figure}>
          <FigureView figure={f} />
        </div>
      ))}
    </div>
  );
}
