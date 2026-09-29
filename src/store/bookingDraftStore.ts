import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MAX_CONCESSION_QUANTITY } from '@/data/concessions';

/** How long selected seats are held for the user once they leave seat selection. */
export const SEAT_HOLD_DURATION_MS = 10 * 60_000;

interface BookingDraftState {
  showtimeId: string | null;
  selectedSeatIds: string[];
  concessionQuantities: Record<string, number>;
  promoCode: string | null;
  /** Epoch milliseconds when the seat hold expires; null when no hold is active. */
  holdExpiresAt: number | null;
  /** Set once payment succeeds so the booking flow can hand off to the ticket page. */
  completedBookingId: string | null;
}

interface BookingDraftActions {
  /** Starts a draft for the showtime, discarding any draft for a different showtime. */
  startDraft: (showtimeId: string) => void;
  toggleSeat: (seatId: string) => void;
  clearSeats: () => void;
  startHold: () => void;
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
  holdExpiresAt: null,
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
        set((state) => {
          const selectedSeatIds = state.selectedSeatIds.includes(seatId)
            ? state.selectedSeatIds.filter((id) => id !== seatId)
            : [...state.selectedSeatIds, seatId];
          return {
            selectedSeatIds,
            holdExpiresAt: selectedSeatIds.length === 0 ? null : state.holdExpiresAt,
          };
        }),

      clearSeats: () => set({ selectedSeatIds: [], holdExpiresAt: null }),

      startHold: () => {
        const { holdExpiresAt } = get();
        if (holdExpiresAt !== null && holdExpiresAt > Date.now()) return;
        set({ holdExpiresAt: Date.now() + SEAT_HOLD_DURATION_MS });
      },

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
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ showtimeId, selectedSeatIds, concessionQuantities, promoCode, holdExpiresAt, completedBookingId }) => ({
        showtimeId,
        selectedSeatIds,
        concessionQuantities,
        promoCode,
        holdExpiresAt,
        completedBookingId,
      }),
    },
  ),
);
