/** Plain-English labels for the Stats charts: days, durations and percentages. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parts(day: string): { y: number; m: number; d: number; weekday: number } {
  const [y, m, d] = day.split('-').map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** An axis label: "30 Sep". */
export function shortDay(day: string): string {
  const { m, d } = parts(day);
  return `${d} ${MONTHS[m - 1]}`;
}

/** A table row label: "Wednesday 30 September". */
export function longDay(day: string): string {
  const { m, d, weekday } = parts(day);
  return `${WEEKDAYS[weekday]} ${d} ${MONTHS_LONG[m - 1]}`;
}

/** Time studied: "None", "under a minute", "25 min", "2 h 5 min". */
export function formatStudyTime(ms: number): string {
  if (!(ms > 0)) return 'None';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return 'under a minute';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Whole minutes, for the time chart's scale. */
export function toMinutes(ms: number): number {
  return Math.round(ms / 6_000) / 10;
}

/** "72%". */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
