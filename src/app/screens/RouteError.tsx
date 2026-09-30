/**
 * Shown in place of the whole app when a screen throws while rendering, instead of the router's
 * default page with a stack trace. It sits outside the shell, so it brings its own main landmark
 * and padding, and it only links to screens that don't depend on the fault.
 */
import { ButtonLink } from '../../ui/Button';
import { paths } from '../paths';
import styles from './ShellScreens.module.css';

export default function RouteError() {
  return (
    <main className={styles.errorPage}>
      <div className={styles.page}>
        <h1>This screen couldn't be shown</h1>
        <p>COLDBOOT hit a fault while drawing it. Your progress is still saved in this browser.</p>
        <p>
          Reload the app to try again. If the fault comes back, go to Settings and export your progress, then reset it or import an earlier
          export.
        </p>
        <div className={styles.actions}>
          <ButtonLink to={paths.settings} variant="primary">
            Go to Settings
          </ButtonLink>
          <ButtonLink to={paths.home}>Go to Home</ButtonLink>
        </div>
      </div>
    </main>
  );
}
