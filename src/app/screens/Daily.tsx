/** Placeholder until the Daily challenge screen (P1) lands: the challenge itself runs in the terminal. */
import { melbourneDate } from '../../lib/time';
import { useNow } from '../../lib/useNow';
import { useSession } from '../../state/session';
import { useTerminal } from '../../terminal/useTerminal';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';

export default function Daily() {
  const now = useNow(60_000);
  const record = useSession((s) => s.daily[melbourneDate(now)]);
  const answered = record?.results.length ?? 0;
  const label = record?.completedAt ? "Show today's result" : answered > 0 ? 'Continue the daily challenge' : 'Start the daily challenge';
  return (
    <section>
      <h1>Daily challenge</h1>
      <EmptyState
        title="Play today's challenge in the terminal"
        action={
          <Button variant="primary" onClick={() => useTerminal.getState().run('daily')}>
            {label}
          </Button>
        }
      >
        <p>
          Ten questions, the same for everyone today. Only your first attempt counts.{' '}
          {record?.completedAt
            ? "You've finished today's: the terminal shows your result and the share line."
            : answered > 0
              ? `You've answered ${answered} of ${record?.itemIds.length}.`
              : 'The terminal opens over this page.'}
        </p>
      </EmptyState>
    </section>
  );
}
