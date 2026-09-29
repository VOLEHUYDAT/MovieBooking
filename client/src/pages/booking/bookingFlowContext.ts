import { useOutletContext } from 'react-router';
import type { PromotionEvaluation } from '@shared/services/pricingService';
import type { SeatHold } from '@shared/types/api';
import type { Cinema, Movie, PriceBreakdown, Promotion, Seat, SeatMap, Showtime } from '@shared/types/domain';

export type BookingStep = 'seats' | 'concessions' | 'checkout';

export interface BookingFlowContext {
  movie: Movie;
  cinema: Cinema;
  showtime: Showtime;
  /** Layout with server-reported unavailable seats (booked or held by others). */
  seatMap: SeatMap;
  selectedSeats: Seat[];
  concessionQuantities: Record<string, number>;
  promotion: Promotion | null;
  promotionEvaluation: PromotionEvaluation | null;
  priceBreakdown: PriceBreakdown;
  /** The customer's active server-side hold for this showtime. */
  hold: SeatHold | null;
  /** Remaining hold time in ms, or null when no hold is active. */
  holdRemainingMs: number | null;
  basePath: string;
}

export function useBookingFlow(): BookingFlowContext {
  return useOutletContext<BookingFlowContext>();
}
