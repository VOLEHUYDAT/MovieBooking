import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Booking, CustomerInfo } from '@/types/domain';

interface BookingHistoryState {
  bookings: Booking[];
  /** Contact details from the latest booking, used to prefill checkout. */
  lastCustomer: CustomerInfo | null;
  addBooking: (booking: Booking) => void;
  cancelBooking: (bookingId: string) => void;
}

export const useBookingHistoryStore = create<BookingHistoryState>()(
  persist(
    (set) => ({
      bookings: [],
      lastCustomer: null,

      addBooking: (booking) =>
        set((state) => ({ bookings: [booking, ...state.bookings], lastCustomer: booking.customer })),

      cancelBooking: (bookingId) =>
        set((state) => ({
          bookings: state.bookings.map((booking) =>
            booking.id === bookingId && booking.status === 'confirmed'
              ? { ...booking, status: 'cancelled', cancelledAt: new Date().toISOString() }
              : booking,
          ),
        })),
    }),
    {
      name: 'lumina.booking-history',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Seat IDs the user already holds (confirmed) for a showtime; shown as occupied on the seat map. */
export function selectBookedSeatIds(bookings: Booking[], showtimeId: string): string[] {
  return bookings
    .filter((booking) => booking.showtimeId === showtimeId && booking.status === 'confirmed')
    .flatMap((booking) => booking.seats.map((seat) => seat.id));
}
