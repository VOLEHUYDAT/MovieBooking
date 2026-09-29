import { getConcessionById } from '@shared/data/concessions';
import { generateReadableCode } from '@shared/lib/random';
import type {
  BookedConcession,
  Booking,
  Cinema,
  CustomerInfo,
  Movie,
  PaymentMethod,
  Promotion,
  Seat,
  Showtime,
} from '@shared/types/domain';
import { calculatePriceBreakdown, getSeatPrice } from '@shared/services/pricingService';

export { canCancelBooking, CANCELLATION_WINDOW_HOURS, getBookingTimelineStatus } from '@shared/services/bookingPolicy';
export type { BookingTimelineStatus } from '@shared/services/bookingPolicy';

export interface CreateBookingInput {
  movie: Movie;
  cinema: Cinema;
  showtime: Showtime;
  seats: Seat[];
  concessionQuantities: Record<string, number>;
  customer: CustomerInfo;
  paymentMethod: PaymentMethod;
  promotion: Promotion | null;
}

export function createBooking(input: CreateBookingInput): Booking {
  const { movie, cinema, showtime, seats, concessionQuantities, customer, paymentMethod, promotion } = input;

  const concessions: BookedConcession[] = Object.entries(concessionQuantities).flatMap(([itemId, quantity]) => {
    const item = getConcessionById(itemId);
    return item && quantity > 0 ? [{ id: item.id, name: item.name, quantity, unitPrice: item.price }] : [];
  });

  const pricing = calculatePriceBreakdown({ seats, showtime, concessionQuantities, promotion });

  return {
    id: crypto.randomUUID(),
    code: `LMN${generateReadableCode(7)}`,
    userId: null,
    showtimeId: showtime.id,
    movieId: movie.id,
    cinemaId: cinema.id,
    movieTitle: movie.title,
    cinemaName: cinema.name,
    cinemaAddress: cinema.address,
    auditorium: showtime.auditorium,
    format: showtime.format,
    startsAt: showtime.startsAt,
    endsAt: showtime.endsAt,
    seats: [...seats]
      .sort((a, b) => a.row.localeCompare(b.row) || a.number - b.number)
      .map((seat) => ({ id: seat.id, label: seat.label, type: seat.type, price: getSeatPrice(seat.type, showtime) })),
    concessions,
    customer: {
      fullName: customer.fullName.trim(),
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.replace(/[\s.-]/g, ''),
    },
    paymentMethod,
    promoCode: pricing.discount > 0 && promotion ? promotion.code : null,
    pricing,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    cancelledAt: null,
    cancelledBy: null,
    checkedInAt: null,
    checkedInBy: null,
  };
}

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
