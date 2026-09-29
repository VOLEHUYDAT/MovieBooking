const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local calendar date key in yyyy-MM-dd format. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a yyyy-MM-dd key as a local date at midnight. Returns null when invalid. */
export function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return toDateKey(date) === dateKey ? date : null;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MS_PER_MINUTE);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Date key relative to today, used to keep the demo catalog fresh. */
export function dateKeyFromToday(offsetDays: number): string {
  return toDateKey(addDays(new Date(), offsetDays));
}

export function getUpcomingDateKeys(count: number, from: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => toDateKey(addDays(from, index)));
}
