import type { Promotion } from '../types/domain';

export const PROMOTIONS: Promotion[] = [
  {
    code: 'LUMINA10',
    title: 'Giảm 10% đơn hàng',
    description: 'Giảm 10% tổng đơn, tối đa 50.000 ₫',
    kind: 'percent-order',
    value: 10,
    maxDiscount: 50_000,
  },
  {
    code: 'HELLO50K',
    title: 'Giảm 50.000 ₫',
    description: 'Áp dụng cho đơn từ 200.000 ₫',
    kind: 'fixed-order',
    value: 50_000,
    minOrderAmount: 200_000,
  },
  {
    code: 'COMBO30',
    title: 'Giảm 30% bắp nước',
    description: 'Giảm 30% tổng tiền bắp nước',
    kind: 'percent-concessions',
    value: 30,
  },
];

export function findPromotion(code: string): Promotion | undefined {
  const normalizedCode = code.trim().toUpperCase();
  return PROMOTIONS.find((promotion) => promotion.code === normalizedCode);
}
