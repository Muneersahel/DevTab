export type DueTone = 'overdue' | 'today' | 'upcoming';

export interface DueDescription {
  label: string;
  tone: DueTone;
}

/** Formats a date as a local `YYYY-MM-DD` calendar day. */
export function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True when a `YYYY-MM-DD` due date is today or already past. */
export function isDueByToday(dueAt: string, now: Date): boolean {
  return dueAt <= localYmd(now);
}

/** Short, relative label for a `YYYY-MM-DD` due date. */
export function describeDue(dueAt: string, now: Date): DueDescription {
  const today = localYmd(now);
  if (dueAt < today) return { label: 'overdue', tone: 'overdue' };
  if (dueAt === today) return { label: 'today', tone: 'today' };

  const due = parseLocalDate(dueAt);
  const start = parseLocalDate(today);
  const days = Math.round((due.getTime() - start.getTime()) / 86_400_000);

  if (days === 1) return { label: 'tomorrow', tone: 'upcoming' };
  const format: Intl.DateTimeFormatOptions =
    days < 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' };
  return { label: new Intl.DateTimeFormat(undefined, format).format(due), tone: 'upcoming' };
}

function parseLocalDate(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day);
}
