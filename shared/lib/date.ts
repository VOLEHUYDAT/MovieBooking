/**
 * Calendar helpers pinned to the cinemas' time zone (Asia/Ho_Chi_Minh, UTC+7, no DST).
 * Client and server must agree on what "19:00 on 2026-10-03" means regardless of where the code
 * runs (a browser abroad, or an API server in UTC), so all date keys and schedule times are
 * computed in cinema time rather than the host's local time.
 */
export const CINEMA_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const CINEMA_UTC_OFFSET_MS = 7 * 60 * MS_PER_MINUTE;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Shifts an instant so its UTC fields read as cinema wall-clock time. */
function toCinemaWallClock(date: Date): Date {
  return new Date(date.getTime() + CINEMA_UTC_OFFSET_MS);
}

/** Cinema-local calendar date key (yyyy-MM-dd) for an instant. */
export function toDateKey(date: Date): string {
  const wallClock = toCinemaWallClock(date);
  return `${wallClock.getUTCFullYear()}-${pad(wallClock.getUTCMonth() + 1)}-${pad(wallClock.getUTCDate())}`;
}

/** Parses a yyyy-MM-dd key as cinema-local midnight. Returns null when invalid. */
export function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)) - CINEMA_UTC_OFFSET_MS);
  return toDateKey(date) === dateKey ? date : null;
}

/** Instant for a cinema-local date and wall-clock time. */
export function cinemaDateTime(dateKey: string, hours: number, minutes: number): Date | null {
  const midnight = parseDateKey(dateKey);
  return midnight ? new Date(midnight.getTime() + (hours * 60 + minutes) * MS_PER_MINUTE) : null;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Whole cinema-calendar days from `from` to `to`. */
export function daysBetween(from: Date, to: Date): number {
  const fromMidnight = parseDateKey(toDateKey(from))!;
  const toMidnight = parseDateKey(toDateKey(to))!;
  return Math.round((toMidnight.getTime() - fromMidnight.getTime()) / MS_PER_DAY);
}

export function isWeekend(date: Date): boolean {
  const day = toCinemaWallClock(date).getUTCDay();
  return day === 0 || day === 6;
}

/** Date key relative to today, used to keep the demo catalog fresh. */
export function dateKeyFromToday(offsetDays: number): string {
  return toDateKey(addDays(new Date(), offsetDays));
}

export function getUpcomingDateKeys(count: number, from: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => toDateKey(addDays(from, index)));
}
