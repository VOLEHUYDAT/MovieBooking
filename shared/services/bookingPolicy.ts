import type { Booking } from '../types/domain';

/** Seats are held for this long once the customer leaves seat selection. */
export const SEAT_HOLD_DURATION_MS = 10 * 60_000;
/** Customers can cancel online until this many hours before the screening. */
export const CANCELLATION_WINDOW_HOURS = 2;
/** Staff can check a ticket in from this many minutes before the screening until it ends. */
export const CHECK_IN_OPENS_MINUTES = 120;

export type BookingTimelineStatus = 'upcoming' | 'watched' | 'cancelled';

type BookingTiming = Pick<Booking, 'status' | 'startsAt' | 'endsAt' | 'checkedInAt'>;

export function getBookingTimelineStatus(booking: BookingTiming, now: Date = new Date()): BookingTimelineStatus {
  if (booking.status === 'cancelled') return 'cancelled';
  return new Date(booking.endsAt).getTime() < now.getTime() ? 'watched' : 'upcoming';
}

/**
 * Customers may cancel until the cancellation window; admins may cancel until the screening starts.
 * Checked-in tickets can never be cancelled.
 */
export function canCancelBooking(booking: BookingTiming, now: Date = new Date(), options: { isAdmin?: boolean } = {}) {
  if (booking.status !== 'confirmed' || booking.checkedInAt !== null) return false;
  const startsAt = new Date(booking.startsAt).getTime();
  const deadline = options.isAdmin ? startsAt : startsAt - CANCELLATION_WINDOW_HOURS * 3_600_000;
  return now.getTime() < deadline;
}

export type CheckInEligibility = { canCheckIn: true } | { canCheckIn: false; reason: string };

export function getCheckInEligibility(booking: BookingTiming, now: Date = new Date()): CheckInEligibility {
  if (booking.status === 'cancelled') return { canCheckIn: false, reason: 'Vé đã bị hủy' };
  if (booking.checkedInAt !== null) return { canCheckIn: false, reason: 'Vé đã được soát trước đó' };
  if (now.getTime() > new Date(booking.endsAt).getTime()) return { canCheckIn: false, reason: 'Suất chiếu đã kết thúc' };
  const opensAt = new Date(booking.startsAt).getTime() - CHECK_IN_OPENS_MINUTES * 60_000;
  if (now.getTime() < opensAt) {
    return { canCheckIn: false, reason: `Chỉ soát vé từ ${CHECK_IN_OPENS_MINUTES / 60} tiếng trước giờ chiếu` };
  }
  return { canCheckIn: true };
}
