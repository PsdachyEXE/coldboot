/** Placeholder until the Stats screen (P1) lands: it points to where mastery already shows. */
import { ButtonLink } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { paths } from '../paths';

export default function Stats() {
  return (
    <section>
      <h1>Stats</h1>
      <EmptyState
        title="Charts arrive in a later version"
        action={
          <ButtonLink variant="primary" to={paths.map}>
            Open the syllabus map
          </ButtonLink>
        }
      >
        <p>Your mastery for every key knowledge point is on the syllabus map, with when you last practised each one.</p>
      </EmptyState>
    </section>
  );
}
