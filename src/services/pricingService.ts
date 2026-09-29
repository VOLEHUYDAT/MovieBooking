import { getConcessionById } from '@/data/concessions';
import { isWeekend } from '@/lib/date';
import type { PriceBreakdown, Promotion, ScreenFormat, Seat, SeatType, Showtime } from '@/types/domain';

export const SEAT_BASE_PRICE: Record<SeatType, number> = {
  standard: 75_000,
  vip: 95_000,
  couple: 170_000,
};

export const FORMAT_SURCHARGE: Record<ScreenFormat, number> = {
  '2D': 0,
  '3D': 25_000,
  IMAX: 50_000,
};

export const WEEKEND_SURCHARGE = 10_000;

/** Number of guests a seat accommodates. */
export const SEAT_CAPACITY: Record<SeatType, number> = {
  standard: 1,
  vip: 1,
  couple: 2,
};

type PricedShowtime = Pick<Showtime, 'format' | 'startsAt'>;

export function getSeatPrice(seatType: SeatType, showtime: PricedShowtime): number {
  const perGuestSurcharge =
    FORMAT_SURCHARGE[showtime.format] + (isWeekend(new Date(showtime.startsAt)) ? WEEKEND_SURCHARGE : 0);
  return SEAT_BASE_PRICE[seatType] + perGuestSurcharge * SEAT_CAPACITY[seatType];
}

export function calculateTicketSubtotal(seats: Seat[], showtime: PricedShowtime): number {
  return seats.reduce((sum, seat) => sum + getSeatPrice(seat.type, showtime), 0);
}

export function calculateConcessionSubtotal(quantities: Record<string, number>): number {
  return Object.entries(quantities).reduce((sum, [itemId, quantity]) => {
    const item = getConcessionById(itemId);
    return item ? sum + item.price * quantity : sum;
  }, 0);
}

export type PromotionEvaluation = { isValid: true; discount: number } | { isValid: false; reason: string };

export function evaluatePromotion(
  promotion: Promotion,
  amounts: { ticketSubtotal: number; concessionSubtotal: number },
): PromotionEvaluation {
  const orderSubtotal = amounts.ticketSubtotal + amounts.concessionSubtotal;

  if (promotion.minOrderAmount !== undefined && orderSubtotal < promotion.minOrderAmount) {
    const minimum = new Intl.NumberFormat('vi-VN').format(promotion.minOrderAmount);
    return { isValid: false, reason: `Mã chỉ áp dụng cho đơn từ ${minimum} ₫` };
  }

  let discount: number;
  switch (promotion.kind) {
    case 'percent-order':
      discount = Math.round((orderSubtotal * promotion.value) / 100);
      break;
    case 'fixed-order':
      discount = promotion.value;
      break;
    case 'percent-concessions':
      if (amounts.concessionSubtotal === 0) {
        return { isValid: false, reason: 'Mã chỉ áp dụng khi đơn có bắp nước' };
      }
      discount = Math.round((amounts.concessionSubtotal * promotion.value) / 100);
      break;
  }

  if (promotion.maxDiscount !== undefined) discount = Math.min(discount, promotion.maxDiscount);
  return { isValid: true, discount: Math.min(discount, orderSubtotal) };
}

export function calculatePriceBreakdown(input: {
  seats: Seat[];
  showtime: PricedShowtime;
  concessionQuantities: Record<string, number>;
  promotion: Promotion | null;
}): PriceBreakdown {
  const ticketSubtotal = calculateTicketSubtotal(input.seats, input.showtime);
  const concessionSubtotal = calculateConcessionSubtotal(input.concessionQuantities);
  const evaluation = input.promotion
    ? evaluatePromotion(input.promotion, { ticketSubtotal, concessionSubtotal })
    : null;
  const discount = evaluation?.isValid ? evaluation.discount : 0;

  return {
    ticketSubtotal,
    concessionSubtotal,
    discount,
    total: ticketSubtotal + concessionSubtotal - discount,
  };
}
