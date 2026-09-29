import type { ConcessionItem } from '@/types/domain';

export const MAX_CONCESSION_QUANTITY = 10;

export const CONCESSIONS: ConcessionItem[] = [
  {
    id: 'combo-solo',
    name: 'Combo Solo',
    description: '1 bắp ngọt (L) + 1 nước ngọt 32oz',
    price: 89_000,
    category: 'combo',
    icon: 'combo',
  },
  {
    id: 'combo-couple',
    name: 'Combo Couple',
    description: '1 bắp ngọt (L) + 2 nước ngọt 32oz',
    price: 119_000,
    category: 'combo',
    icon: 'combo',
    badge: 'Bán chạy',
  },
  {
    id: 'combo-family',
    name: 'Combo Family',
    description: '2 bắp (L) + 4 nước ngọt 32oz + 1 nachos',
    price: 229_000,
    category: 'combo',
    icon: 'combo',
    badge: 'Tiết kiệm 25%',
  },
  {
    id: 'popcorn-caramel',
    name: 'Bắp Caramel (L)',
    description: 'Bắp rang phủ caramel giòn tan',
    price: 69_000,
    category: 'snack',
    icon: 'popcorn',
  },
  {
    id: 'popcorn-cheese',
    name: 'Bắp Phô Mai (L)',
    description: 'Bắp rang bơ lắc phô mai',
    price: 69_000,
    category: 'snack',
    icon: 'popcorn',
  },
  {
    id: 'nachos-cheese',
    name: 'Nachos sốt phô mai',
    description: 'Bánh nachos giòn kèm sốt phô mai nóng',
    price: 59_000,
    category: 'snack',
    icon: 'snack',
  },
  {
    id: 'soda-32oz',
    name: 'Nước ngọt 32oz',
    description: 'Coca, Sprite hoặc Fanta - chọn tại quầy',
    price: 39_000,
    category: 'drink',
    icon: 'drink',
  },
  {
    id: 'mineral-water',
    name: 'Nước suối 500ml',
    description: 'Nước khoáng tinh khiết',
    price: 20_000,
    category: 'drink',
    icon: 'water',
  },
];

const concessionsById = new Map(CONCESSIONS.map((item) => [item.id, item]));

export function getConcessionById(itemId: string): ConcessionItem | undefined {
  return concessionsById.get(itemId);
}
