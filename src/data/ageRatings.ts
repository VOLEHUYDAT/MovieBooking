import type { AgeRating } from '@/types/domain';

export const AGE_RATING_DESCRIPTIONS: Record<AgeRating, string> = {
  P: 'Phổ biến cho mọi độ tuổi',
  K: 'Dưới 13 tuổi cần xem cùng cha mẹ hoặc người giám hộ',
  T13: 'Dành cho khán giả từ đủ 13 tuổi trở lên',
  T16: 'Dành cho khán giả từ đủ 16 tuổi trở lên',
  T18: 'Dành cho khán giả từ đủ 18 tuổi trở lên',
};
