import { describe, expect, it } from 'vitest';
import { findPromotion } from '../data/promotions';
import { calculatePriceBreakdown, evaluatePromotion, getSeatPrice } from './pricingService';
import { getSeatById } from './seatMapService';

// 2026-10-06 is a Tuesday, 2026-10-03 is a Saturday (local time).
const weekday2D = { format: '2D' as const, startsAt: new Date(2026, 9, 6, 19, 0).toISOString() };
const weekendImax = { format: 'IMAX' as const, startsAt: new Date(2026, 9, 3, 19, 0).toISOString() };

describe('getSeatPrice', () => {
  it('uses the base price for a weekday 2D screening', () => {
    expect(getSeatPrice('standard', weekday2D)).toBe(75_000);
    expect(getSeatPrice('vip', weekday2D)).toBe(95_000);
    expect(getSeatPrice('couple', weekday2D)).toBe(170_000);
  });

  it('applies format and weekend surcharges per guest', () => {
    expect(getSeatPrice('vip', weekendImax)).toBe(95_000 + 50_000 + 10_000);
    expect(getSeatPrice('couple', weekendImax)).toBe(170_000 + (50_000 + 10_000) * 2);
  });
});

describe('evaluatePromotion', () => {
  const lumina10 = findPromotion('lumina10')!;
  const hello50k = findPromotion('HELLO50K')!;
  const combo30 = findPromotion(' combo30 ')!;

  it('caps percentage discounts at the maximum amount', () => {
    expect(evaluatePromotion(lumina10, { ticketSubtotal: 200_000, concessionSubtotal: 0 })).toEqual({
      isValid: true,
      discount: 20_000,
    });
    expect(evaluatePromotion(lumina10, { ticketSubtotal: 900_000, concessionSubtotal: 0 })).toEqual({
      isValid: true,
      discount: 50_000,
    });
  });

  it('enforces the minimum order amount', () => {
    expect(evaluatePromotion(hello50k, { ticketSubtotal: 150_000, concessionSubtotal: 0 }).isValid).toBe(false);
    expect(evaluatePromotion(hello50k, { ticketSubtotal: 150_000, concessionSubtotal: 50_000 })).toEqual({
      isValid: true,
      discount: 50_000,
    });
  });

  it('requires concessions for concession-only promotions', () => {
    expect(evaluatePromotion(combo30, { ticketSubtotal: 300_000, concessionSubtotal: 0 }).isValid).toBe(false);
    expect(evaluatePromotion(combo30, { ticketSubtotal: 300_000, concessionSubtotal: 100_000 })).toEqual({
      isValid: true,
      discount: 30_000,
    });
  });
});

describe('calculatePriceBreakdown', () => {
  it('sums tickets and concessions and subtracts the discount', () => {
    const seats = [getSeatById('D5')!, getSeatById('D6')!];
    const breakdown = calculatePriceBreakdown({
      seats,
      showtime: weekday2D,
      concessionQuantities: { 'combo-couple': 1, 'mineral-water': 2 },
      promotion: findPromotion('LUMINA10')!,
    });

    expect(breakdown).toEqual({
      ticketSubtotal: 190_000,
      concessionSubtotal: 159_000,
      discount: 34_900,
      total: 314_100,
    });
  });

  it('ignores a promotion that no longer applies', () => {
    const breakdown = calculatePriceBreakdown({
      seats: [getSeatById('A1')!],
      showtime: weekday2D,
      concessionQuantities: {},
      promotion: findPromotion('HELLO50K')!,
    });
    expect(breakdown.discount).toBe(0);
    expect(breakdown.total).toBe(75_000);
  });
});
