import { QRCodeSVG } from 'qrcode.react';
import { getMovieById } from '@shared/data/movies';
import { getPaymentMethodLabel } from '@shared/data/paymentMethods';
import { cn } from '@/lib/cn';
import { formatCurrency, formatFullDate, formatShortDate, formatTime } from '@/lib/format';
import type { BookingTimelineStatus } from '@shared/services/bookingPolicy';
import type { Booking } from '@shared/types/domain';
import { AgeRatingBadge } from '../ui/Badges';
import { MoviePoster } from '../movie/MoviePoster';
import { TicketStatusBadge } from './TicketStatusBadge';

interface TicketCardProps {
  booking: Booking;
  status: BookingTimelineStatus;
}

function buildQrPayload(booking: Booking): string {
  return ['LUMINA', booking.code, booking.showtimeId, booking.seats.map((seat) => seat.label).join('-')].join('|');
}

export function TicketCard({ booking, status }: TicketCardProps) {
  const movie = getMovieById(booking.movieId);
  const isCancelled = status === 'cancelled';

  const infoItems = [
    { label: 'Ngày chiếu', value: formatFullDate(booking.startsAt) },
    { label: 'Giờ chiếu', value: `${formatTime(booking.startsAt)} - ${formatTime(booking.endsAt)}` },
    { label: 'Phòng chiếu', value: `${booking.auditorium} · ${booking.format}` },
    { label: `Ghế (${booking.seats.length})`, value: booking.seats.map((seat) => seat.label).join(', ') },
  ];

  return (
    <article className="overflow-hidden rounded-3xl border border-line-strong bg-surface shadow-2xl print:border-black print:shadow-none">
      <header className="relative isolate overflow-hidden">
        {movie && <MoviePoster movie={movie} variant="art" className="absolute inset-0 -z-10 size-full opacity-70 blur-sm" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-surface via-surface/70 to-surface/10" />
        <div className="flex items-end gap-4 p-5 pt-12 sm:p-6 sm:pt-16">
          {movie && <MoviePoster movie={movie} variant="art" className="aspect-[2/3] w-16 shrink-0 rounded-lg ring-1 ring-white/20 sm:w-20" />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {movie && <AgeRatingBadge rating={movie.ageRating} className="h-5 min-w-7 text-[10px]" />}
              <TicketStatusBadge status={status} />
            </div>
            <h2 className="mt-2 text-xl leading-tight font-black sm:text-2xl">{booking.movieTitle}</h2>
            <p className="mt-1 text-sm text-ink-muted">{booking.cinemaName}</p>
          </div>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 pt-2 pb-6 sm:px-6">
        {infoItems.map((item) => (
          <div key={item.label} className={cn(item.label.startsWith('Ngày') && 'col-span-2')}>
            <dt className="text-[11px] font-semibold tracking-wide text-ink-subtle uppercase">{item.label}</dt>
            <dd className="mt-0.5 font-bold">{item.value}</dd>
          </div>
        ))}
        <div className="col-span-2">
          <dt className="text-[11px] font-semibold tracking-wide text-ink-subtle uppercase">Địa chỉ</dt>
          <dd className="mt-0.5 text-sm text-ink-muted">{booking.cinemaAddress}</dd>
        </div>
      </dl>

      <div className="relative flex items-center" aria-hidden>
        <span className="-ml-3 size-6 shrink-0 rounded-full bg-canvas ring-1 ring-line-strong" />
        <span className="h-px flex-1 border-t-2 border-dashed border-line-strong" />
        <span className="-mr-3 size-6 shrink-0 rounded-full bg-canvas ring-1 ring-line-strong" />
      </div>

      <div className="flex flex-col items-center px-5 py-6 sm:px-6">
        <div className="relative">
          <div className={cn('rounded-2xl bg-white p-3', isCancelled && 'opacity-30 grayscale')}>
            <QRCodeSVG value={buildQrPayload(booking)} size={168} level="M" marginSize={0} title={`Mã vé ${booking.code}`} />
          </div>
          {isCancelled && (
            <span className="absolute inset-0 m-auto grid h-12 w-40 -rotate-12 place-items-center rounded-lg border-4 border-red-500 text-xl font-black tracking-widest text-red-500">
              ĐÃ HỦY
            </span>
          )}
        </div>
        <p className="mt-4 text-xs text-ink-subtle">Mã đặt vé</p>
        <p className="font-mono text-2xl font-black tracking-[0.2em]">{booking.code}</p>
        {booking.checkedInAt ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            Đã soát vé lúc {formatTime(booking.checkedInAt)} · {formatShortDate(booking.checkedInAt)}
          </p>
        ) : (
          !isCancelled && <p className="mt-2 text-center text-xs text-ink-muted">Xuất trình mã QR tại quầy soát vé để vào phòng chiếu</p>
        )}
      </div>

      <div className="space-y-4 border-t border-line bg-white/[0.02] px-5 py-5 text-sm sm:px-6">
        <div className="grid gap-1 sm:grid-cols-2">
          <p className="text-ink-muted">
            Khách hàng: <span className="font-semibold text-ink">{booking.customer.fullName}</span>
          </p>
          <p className="text-ink-muted sm:text-right">
            Thanh toán: <span className="font-semibold text-ink">{getPaymentMethodLabel(booking.paymentMethod)}</span>
          </p>
          <p className="text-ink-muted">{booking.customer.phone}</p>
          <p className="truncate text-ink-muted sm:text-right">{booking.customer.email}</p>
        </div>

        <div className="space-y-1.5 border-t border-dashed border-line-strong pt-4">
          {booking.seats.map((seat) => (
            <div key={seat.id} className="flex justify-between gap-4">
              <span className="text-ink-muted">Ghế {seat.label}</span>
              <span className="tabular-nums">{formatCurrency(seat.price)}</span>
            </div>
          ))}
          {booking.concessions.map((item) => (
            <div key={item.id} className="flex justify-between gap-4">
              <span className="text-ink-muted">
                {item.quantity} × {item.name}
              </span>
              <span className="tabular-nums">{formatCurrency(item.quantity * item.unitPrice)}</span>
            </div>
          ))}
          {booking.pricing.discount > 0 && (
            <div className="flex justify-between gap-4 text-emerald-400">
              <span>Khuyến mãi {booking.promoCode}</span>
              <span className="tabular-nums">−{formatCurrency(booking.pricing.discount)}</span>
            </div>
          )}
          <div className="flex items-end justify-between gap-4 border-t border-line pt-3">
            <span className="font-semibold">{isCancelled ? 'Đã hoàn tiền' : 'Tổng thanh toán'}</span>
            <span className="text-xl font-black text-gradient-brand tabular-nums">{formatCurrency(booking.pricing.total)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
