/**
 * When the analytics job runs and when its reports go out. All UTC.
 *
 * The cron calls every six hours; each call belongs to a slot ("2026-10-15T12")
 * and a slot succeeds at most once. A late, doubled or retried call lands in
 * the same slot and finds it done.
 */

export const SLOT_HOURS = 6;

export function slotKey(now: Date): string {
  const hour = Math.floor(now.getUTCHours() / SLOT_HOURS) * SLOT_HOURS;
  return `${now.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}`;
}

/** Reports are written by the first successful run at or after 12:00 UTC. */
const REPORT_HOUR = 12;

export function dailyReportKey(now: Date): string | null {
  return now.getUTCHours() >= REPORT_HOUR ? now.toISOString().slice(0, 10) : null;
}

/** ISO week, e.g. "2026-W42", due from Monday 12:00 UTC. */
export function weeklyReportKey(now: Date): string | null {
  const isMonday = now.getUTCDay() === 1;
  if (!isMonday || now.getUTCHours() < REPORT_HOUR) return null;
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
