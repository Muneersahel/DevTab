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

export interface ParsedTaskInput {
  title: string;
  /** `YYYY-MM-DD`, or null when the text doesn't end with a date word. */
  dueAt: string | null;
  /** The trailing date word(s) as typed, e.g. "tomorrow" or "Fri". */
  dateText: string | null;
}

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

// Only a date word at the very end counts, so "Fix friday deploy bug" stays a
// plain title.
const TRAILING_DATE =
  /^(.*\S)\s+(today|tomorrow|next week|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)$/i;

/**
 * Splits quick-capture text like "Ship release notes tomorrow" into a title and
 * a due date. Weekdays mean the next such day (never today); "next week" means
 * next Monday.
 */
export function parseTaskInput(text: string, now: Date): ParsedTaskInput {
  const trimmed = text.trim();
  const match = TRAILING_DATE.exec(trimmed);
  if (!match) return { title: trimmed, dueAt: null, dateText: null };

  const word = match[2].toLowerCase();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (word === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  } else if (word === 'next week') {
    date.setDate(date.getDate() + ((8 - date.getDay()) % 7 || 7));
  } else if (word !== 'today') {
    const days = (WEEKDAY_INDEX[word.slice(0, 3)] - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + days);
  }

  return { title: match[1], dueAt: localYmd(date), dateText: match[2] };
}

/** Absolute label for a `YYYY-MM-DD` date, e.g. "Tue 3 Nov". */
export function formatDueDate(dueAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(parseLocalDate(dueAt));
}
