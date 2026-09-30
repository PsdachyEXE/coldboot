/** Wording for the Daily screen. */
import { plural } from '../study/format';

/** "5 hours and 12 minutes", "12 minutes", "less than a minute" (rounded up, so it never says 0). */
export function formatNextSet(ms: number): string {
  if (ms < 60_000) return 'less than a minute';
  const minutes = Math.ceil(ms / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return plural(m, 'minute');
  return m ? `${plural(h, 'hour')} and ${plural(m, 'minute')}` : plural(h, 'hour');
}
