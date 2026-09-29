import { useOutletContext } from 'react-router';
import type { PromotionEvaluation } from '@/services/pricingService';
import type { Cinema, Movie, PriceBreakdown, Promotion, Seat, SeatMap, Showtime } from '@/types/domain';

export type BookingStep = 'seats' | 'concessions' | 'checkout';

export interface BookingFlowContext {
  movie: Movie;
  cinema: Cinema;
  showtime: Showtime;
  seatMap: SeatMap;
  selectedSeats: Seat[];
  concessionQuantities: Record<string, number>;
  promotion: Promotion | null;
  promotionEvaluation: PromotionEvaluation | null;
  priceBreakdown: PriceBreakdown;
  /** Remaining seat hold time in ms, or null when no hold is active. */
  holdRemainingMs: number | null;
  basePath: string;
}

export function useBookingFlow(): BookingFlowContext {
  return useOutletContext<BookingFlowContext>();
}
