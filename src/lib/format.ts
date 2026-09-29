import { daysBetween, parseDateKey } from './date';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const timeFormatter = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
const fullDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const shortDateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dayMonthFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' });
const weekdayFormatter = new Intl.DateTimeFormat('vi-VN', { weekday: 'short' });

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatTime(isoDate: string): string {
  return timeFormatter.format(new Date(isoDate));
}

export function formatFullDate(isoDate: string): string {
  const formatted = fullDateFormatter.format(new Date(isoDate));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatShortDate(isoOrDateKey: string): string {
  const date = parseDateKey(isoOrDateKey) ?? new Date(isoOrDateKey);
  return shortDateFormatter.format(date);
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} phút`;
  return minutes === 0 ? `${hours} giờ` : `${hours} giờ ${minutes} phút`;
}

export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export interface DateChipLabel {
  weekday: string;
  dayMonth: string;
}

/** Labels for the horizontal date picker ("Hôm nay", "Ngày mai", "T4"...). */
export function getDateChipLabel(dateKey: string, today: Date = new Date()): DateChipLabel {
  const date = parseDateKey(dateKey) ?? today;
  const offset = daysBetween(today, date);
  const weekday = offset === 0 ? 'Hôm nay' : offset === 1 ? 'Ngày mai' : weekdayFormatter.format(date);
  return { weekday, dayMonth: dayMonthFormatter.format(date) };
}
