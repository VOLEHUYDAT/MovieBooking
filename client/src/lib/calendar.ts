import type { Booking } from '@shared/types/domain';

function toIcsTimestamp(isoDate: string): string {
  return new Date(isoDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Builds an iCalendar (.ics) file so the user can add the screening to their calendar. */
export function buildCalendarEvent(booking: Booking): string {
  const seatLabels = booking.seats.map((seat) => seat.label).join(', ');
  const description = `Mã đặt vé: ${booking.code}\nGhế: ${seatLabels}\n${booking.auditorium} · ${booking.format}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lumina Cinema//Movie Booking//VI',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@lumina-cinema`,
    `DTSTAMP:${toIcsTimestamp(booking.createdAt)}`,
    `DTSTART:${toIcsTimestamp(booking.startsAt)}`,
    `DTEND:${toIcsTimestamp(booking.endsAt)}`,
    `SUMMARY:${escapeIcsText(`🎬 ${booking.movieTitle}`)}`,
    `LOCATION:${escapeIcsText(`${booking.cinemaName} - ${booking.cinemaAddress}`)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Phim sắp bắt đầu',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
