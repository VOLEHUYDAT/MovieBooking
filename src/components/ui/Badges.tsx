import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AgeRating, ScreenFormat } from '@/types/domain';

const AGE_RATING_STYLES: Record<AgeRating, string> = {
  P: 'bg-emerald-500 text-white',
  K: 'bg-sky-500 text-white',
  T13: 'bg-amber-400 text-black',
  T16: 'bg-orange-500 text-white',
  T18: 'bg-red-600 text-white',
};

export const AGE_RATING_DESCRIPTIONS: Record<AgeRating, string> = {
  P: 'Phổ biến cho mọi độ tuổi',
  K: 'Dưới 13 tuổi cần xem cùng cha mẹ hoặc người giám hộ',
  T13: 'Dành cho khán giả từ đủ 13 tuổi trở lên',
  T16: 'Dành cho khán giả từ đủ 16 tuổi trở lên',
  T18: 'Dành cho khán giả từ đủ 18 tuổi trở lên',
};

export function AgeRatingBadge({ rating, className }: { rating: AgeRating; className?: string }) {
  return (
    <span
      title={AGE_RATING_DESCRIPTIONS[rating]}
      className={cn(
        'inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-extrabold tracking-wide',
        AGE_RATING_STYLES[rating],
        className,
      )}
    >
      {rating}
    </span>
  );
}

const FORMAT_STYLES: Record<ScreenFormat, string> = {
  '2D': 'bg-white/8 text-ink-muted ring-line-strong',
  '3D': 'bg-sky-500/12 text-sky-300 ring-sky-400/30',
  IMAX: 'bg-amber-500/12 text-amber-300 ring-amber-400/30',
};

export function FormatBadge({ format, className }: { format: ScreenFormat; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md px-2 text-[11px] font-bold tracking-wider ring-1',
        FORMAT_STYLES[format],
        className,
      )}
    >
      {format}
    </span>
  );
}

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-bold text-amber-300', className)}>
      <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
      {score.toFixed(1)}
      <span className="sr-only">điểm trên 10</span>
    </span>
  );
}
