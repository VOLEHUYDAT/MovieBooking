import { CalendarDays, MapPin, Tag } from 'lucide-react';
import { getConcessionById } from '@/data/concessions';
import { formatCurrency, formatFullDate, formatTime } from '@/lib/format';
import type { BookingFlowContext } from '@/pages/booking/bookingFlowContext';
import { AgeRatingBadge, FormatBadge } from '../ui/Badges';
import { MoviePoster } from '../movie/MoviePoster';
import { HoldTimer } from './HoldTimer';

type BookingSummaryProps = Pick<
  BookingFlowContext,
  'movie' | 'cinema' | 'showtime' | 'selectedSeats' | 'concessionQuantities' | 'priceBreakdown' | 'promotion' | 'holdRemainingMs'
>;

export function BookingSummary({
  movie,
  cinema,
  showtime,
  selectedSeats,
  concessionQuantities,
  priceBreakdown,
  promotion,
  holdRemainingMs,
}: BookingSummaryProps) {
  const concessionLines = Object.entries(concessionQuantities).flatMap(([itemId, quantity]) => {
    const item = getConcessionById(itemId);
    return item ? [{ item, quantity }] : [];
  });

  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <MoviePoster movie={movie} variant="art" className="aspect-[2/3] w-16 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="line-clamp-2 leading-snug font-bold">{movie.title}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <AgeRatingBadge rating={movie.ageRating} className="h-5 min-w-7 text-[10px]" />
            <FormatBadge format={showtime.format} className="h-5 text-[10px]" />
          </div>
        </div>
      </div>

      <dl className="space-y-2.5 text-sm">
        <div className="flex gap-2.5">
          <dt className="sr-only">Rạp</dt>
          <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
          <dd>
            <span className="font-semibold">{cinema.name}</span>
            <span className="text-ink-muted"> · {showtime.auditorium}</span>
          </dd>
        </div>
        <div className="flex gap-2.5">
          <dt className="sr-only">Suất chiếu</dt>
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
          <dd>
            <span className="font-semibold">{formatTime(showtime.startsAt)}</span>
            <span className="text-ink-muted"> · {formatFullDate(showtime.startsAt)}</span>
          </dd>
        </div>
      </dl>

      {holdRemainingMs !== null && <HoldTimer remainingMs={holdRemainingMs} className="w-full justify-center" />}

      <div className="space-y-3 border-t border-dashed border-line-strong pt-4 text-sm">
        <div>
          <div className="flex justify-between gap-4">
            <span className="text-ink-muted">Ghế ({selectedSeats.length})</span>
            <span className="font-semibold tabular-nums">{formatCurrency(priceBreakdown.ticketSubtotal)}</span>
          </div>
          {selectedSeats.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedSeats.map((seat) => (
                <span key={seat.id} className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
                  {seat.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-ink-subtle">Chưa chọn ghế</p>
          )}
        </div>

        {concessionLines.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-ink-muted">Bắp nước</p>
            {concessionLines.map(({ item, quantity }) => (
              <div key={item.id} className="flex justify-between gap-4 text-xs">
                <span className="text-ink-muted">
                  {quantity} × {item.name}
                </span>
                <span className="tabular-nums">{formatCurrency(item.price * quantity)}</span>
              </div>
            ))}
          </div>
        )}

        {priceBreakdown.discount > 0 && promotion && (
          <div className="flex justify-between gap-4 text-emerald-400">
            <span className="inline-flex items-center gap-1.5">
              <Tag className="size-3.5" aria-hidden /> {promotion.code}
            </span>
            <span className="font-semibold tabular-nums">−{formatCurrency(priceBreakdown.discount)}</span>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-4 border-t border-line-strong pt-4">
        <span className="text-sm text-ink-muted">Tổng cộng</span>
        <span className="text-2xl font-black text-gradient-brand tabular-nums">{formatCurrency(priceBreakdown.total)}</span>
      </div>
    </div>
  );
}
