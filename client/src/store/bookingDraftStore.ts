import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MAX_CONCESSION_QUANTITY } from '@shared/data/concessions';
import type { SeatHold } from '@shared/types/api';

interface BookingDraftState {
  showtimeId: string | null;
  selectedSeatIds: string[];
  concessionQuantities: Record<string, number>;
  promoCode: string | null;
  /** Server-issued seat hold; the server is the source of truth for its expiry. */
  hold: SeatHold | null;
  /** Set once payment succeeds so the booking flow can hand off to the ticket page. */
  completedBookingId: string | null;
}

interface BookingDraftActions {
  /** Starts a draft for the showtime, discarding any draft for a different showtime. */
  startDraft: (showtimeId: string) => void;
  toggleSeat: (seatId: string) => void;
  setSelectedSeats: (seatIds: string[]) => void;
  clearSeats: () => void;
  setHold: (hold: SeatHold | null) => void;
  setConcessionQuantity: (itemId: string, quantity: number) => void;
  setPromoCode: (code: string | null) => void;
  completeDraft: (bookingId: string) => void;
  resetDraft: () => void;
}

const initialState: BookingDraftState = {
  showtimeId: null,
  selectedSeatIds: [],
  concessionQuantities: {},
  promoCode: null,
  hold: null,
  completedBookingId: null,
};

export const useBookingDraftStore = create<BookingDraftState & BookingDraftActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      startDraft: (showtimeId) => {
        const { showtimeId: currentShowtimeId, completedBookingId } = get();
        if (currentShowtimeId === showtimeId && completedBookingId === null) return;
        set({ ...initialState, showtimeId });
      },

      toggleSeat: (seatId) =>
        set((state) => ({
          selectedSeatIds: state.selectedSeatIds.includes(seatId)
            ? state.selectedSeatIds.filter((id) => id !== seatId)
            : [...state.selectedSeatIds, seatId],
        })),

      setSelectedSeats: (selectedSeatIds) => set({ selectedSeatIds }),

      clearSeats: () => set({ selectedSeatIds: [], hold: null }),

      setHold: (hold) => set({ hold }),

      setConcessionQuantity: (itemId, quantity) =>
        set((state) => {
          const nextQuantity = Math.max(0, Math.min(MAX_CONCESSION_QUANTITY, Math.floor(quantity)));
          const concessionQuantities = { ...state.concessionQuantities };
          if (nextQuantity === 0) delete concessionQuantities[itemId];
          else concessionQuantities[itemId] = nextQuantity;
          return { concessionQuantities };
        }),

      setPromoCode: (promoCode) => set({ promoCode }),

      completeDraft: (bookingId) => set({ ...initialState, completedBookingId: bookingId }),

      resetDraft: () => set(initialState),
    }),
    {
      name: 'lumina.booking-draft',
      version: 2,
      storage: createJSONStorage(() => sessionStorage),
      // `completedBookingId` is an in-memory hand-off signal only; persisting it could
      // redirect a later visit to an old ticket.
      partialize: ({ showtimeId, selectedSeatIds, concessionQuantities, promoCode, hold }) => ({
        showtimeId,
        selectedSeatIds,
        concessionQuantities,
        promoCode,
        hold,
      }),
      // Drafts from the pre-API version (v1) held seats client-side only; start fresh.
      migrate: () => ({ ...initialState }),
    },
  ),
);
