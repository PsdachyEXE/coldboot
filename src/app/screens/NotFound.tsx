/** Shown for any address the app doesn't know. */
import { ButtonLink } from '../../ui/Button';
import { paths } from '../paths';
import styles from './ShellScreens.module.css';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <h1>Page not found</h1>
      <p>There's no page at this address. The link may be out of date or mistyped.</p>
      <ButtonLink to={paths.home} variant="primary">
        Go to Home
      </ButtonLink>
    </div>
  );
}
