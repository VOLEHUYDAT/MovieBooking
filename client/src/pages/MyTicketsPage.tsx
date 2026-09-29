import { CalendarDays, ChevronRight, Clock, MapPin, Ticket } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { MoviePoster } from '@/components/movie/MoviePoster';
import { TicketStatusBadge } from '@/components/ticket/TicketStatusBadge';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getMovieById } from '@shared/data/movies';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/cn';
import { formatCurrency, formatFullDate, formatTime } from '@/lib/format';
import { getBookingTimelineStatus, type BookingTimelineStatus } from '@/services/bookingService';
import { useBookingHistoryStore } from '@/store/bookingHistoryStore';
import type { Booking } from '@shared/types/domain';

const TABS: { value: BookingTimelineStatus; label: string; emptyTitle: string; emptyDescription: string }[] = [
  {
    value: 'upcoming',
    label: 'Sắp chiếu',
    emptyTitle: 'Bạn chưa có vé nào sắp chiếu',
    emptyDescription: 'Khám phá các bộ phim đang hot và đặt vé chỉ trong vài bước.',
  },
  {
    value: 'watched',
    label: 'Đã xem',
    emptyTitle: 'Chưa có lịch sử xem phim',
    emptyDescription: 'Những bộ phim bạn đã xem sẽ xuất hiện tại đây.',
  },
  {
    value: 'cancelled',
    label: 'Đã hủy',
    emptyTitle: 'Không có vé đã hủy',
    emptyDescription: 'Những vé bạn đã hủy sẽ được lưu tại đây.',
  },
];

function TicketListItem({ booking, status }: { booking: Booking; status: BookingTimelineStatus }) {
  const movie = getMovieById(booking.movieId);

  return (
    <Link
      to={`/tickets/${booking.id}`}
      className="group flex animate-fade-in gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-raised"
    >
      {movie && <MoviePoster movie={movie} variant="art" className="aspect-[2/3] w-16 shrink-0 rounded-lg sm:w-20" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold transition-colors group-hover:text-brand">{booking.movieTitle}</h2>
          <TicketStatusBadge status={status} />
        </div>
        <div className="mt-2 grid gap-1 text-sm text-ink-muted">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" aria-hidden /> {formatFullDate(booking.startsAt)}
          </p>
          <p className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" aria-hidden /> {formatTime(booking.startsAt)} · {booking.auditorium} ·{' '}
            {booking.format}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" aria-hidden /> <span className="truncate">{booking.cinemaName}</span>
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line-strong pt-3 text-sm">
          <span>
            Ghế <strong>{booking.seats.map((seat) => seat.label).join(', ')}</strong>
          </span>
          <span className="font-mono text-xs text-ink-subtle">{booking.code}</span>
          <span className="font-bold tabular-nums">{formatCurrency(booking.pricing.total)}</span>
        </div>
      </div>
      <ChevronRight className="hidden size-5 self-center text-ink-subtle transition-transform group-hover:translate-x-1 sm:block" aria-hidden />
    </Link>
  );
}

export function MyTicketsPage() {
  useDocumentTitle('Vé của tôi');
  const bookings = useBookingHistoryStore((state) => state.bookings);
  const now = useNow();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.find((tab) => tab.value === searchParams.get('status')) ?? TABS[0]!;

  const groupedBookings = useMemo(() => {
    const groups: Record<BookingTimelineStatus, Booking[]> = { upcoming: [], watched: [], cancelled: [] };
    for (const booking of bookings) groups[getBookingTimelineStatus(booking, now)].push(booking);
    groups.upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    groups.watched.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    groups.cancelled.sort((a, b) => (b.cancelledAt ?? '').localeCompare(a.cancelledAt ?? ''));
    return groups;
  }, [bookings, now]);

  const visibleBookings = groupedBookings[activeTab.value];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black tracking-tight">Vé của tôi</h1>
      <p className="mt-2 text-ink-muted">Quản lý vé đã đặt, xem mã QR và hủy vé khi cần.</p>

      <div role="tablist" aria-label="Lọc vé" className="mt-6 flex gap-1 rounded-xl bg-surface p-1 ring-1 ring-line">
        {TABS.map((tab) => {
          const isActive = tab.value === activeTab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSearchParams(tab.value === 'upcoming' ? {} : { status: tab.value }, { replace: true })}
              className={cn(
                'flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all',
                isActive ? 'bg-surface-hover text-ink shadow' : 'text-ink-muted hover:text-ink',
              )}
            >
              {tab.label}
              <span className={cn('rounded-full px-1.5 text-xs', isActive ? 'bg-brand text-white' : 'bg-white/8')}>
                {groupedBookings[tab.value].length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-4" role="tabpanel" aria-label={activeTab.label}>
        {visibleBookings.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title={activeTab.emptyTitle}
            description={activeTab.emptyDescription}
            action={activeTab.value === 'upcoming' && <ButtonLink to="/">Đặt vé ngay</ButtonLink>}
          />
        ) : (
          visibleBookings.map((booking) => (
            <TicketListItem key={booking.id} booking={booking} status={activeTab.value} />
          ))
        )}
      </div>
    </div>
  );
}
