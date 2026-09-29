import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, CircleX, ExternalLink, ScanLine, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { getCheckInEligibility } from '@shared/services/bookingPolicy';
import type { Booking } from '@shared/types/domain';
import { queryKeys, staffApi } from '@/api/endpoints';
import { getErrorMessage } from '@/api/httpClient';
import { Button } from '@/components/ui/Button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/cn';
import { formatFullDate, formatTime } from '@/lib/format';

const RECENT_LIMIT = 8;

function BookingSummaryCard({ booking, now }: { booking: Booking; now: Date }) {
  const eligibility = getCheckInEligibility(booking, now);
  const isCheckedIn = booking.checkedInAt !== null;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl p-4 text-sm font-semibold ring-1',
          isCheckedIn
            ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
            : eligibility.canCheckIn
              ? 'bg-sky-500/10 text-sky-200 ring-sky-500/30'
              : 'bg-red-500/10 text-red-300 ring-red-500/30',
        )}
        role="status"
      >
        {isCheckedIn || eligibility.canCheckIn ? <CircleCheck className="size-5 shrink-0" /> : <CircleX className="size-5 shrink-0" />}
        {isCheckedIn
          ? `Đã soát vé lúc ${formatTime(booking.checkedInAt!)}`
          : eligibility.canCheckIn
            ? 'Vé hợp lệ — sẵn sàng cho vào phòng chiếu'
            : eligibility.reason}
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div className="col-span-2">
          <dt className="text-xs text-ink-subtle uppercase">Phim</dt>
          <dd className="text-lg font-bold">{booking.movieTitle}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-subtle uppercase">Suất chiếu</dt>
          <dd className="font-semibold">
            {formatTime(booking.startsAt)} · {formatFullDate(booking.startsAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-subtle uppercase">Rạp / Phòng</dt>
          <dd className="font-semibold">
            {booking.cinemaName} · {booking.auditorium}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-subtle uppercase">Ghế ({booking.seats.length})</dt>
          <dd className="text-2xl font-black text-brand">{booking.seats.map((seat) => seat.label).join(', ')}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-subtle uppercase">Khách hàng</dt>
          <dd className="font-semibold">{booking.customer.fullName}</dd>
          <dd className="text-xs text-ink-muted">{booking.customer.phone}</dd>
        </div>
        {booking.concessions.length > 0 && (
          <div className="col-span-2">
            <dt className="text-xs text-ink-subtle uppercase">Bắp nước (nhận tại quầy)</dt>
            <dd className="font-semibold">{booking.concessions.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function CheckInPage() {
  useDocumentTitle('Soát vé');
  const now = useNow(30_000);
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [recent, setRecent] = useState<Booking[]>([]);

  const lookup = useMutation({
    mutationFn: (value: string) => staffApi.lookup(value),
    onSuccess: ({ booking: found }) => setBooking(found),
    onError: (error) => {
      setBooking(null);
      toast.error(getErrorMessage(error));
    },
  });

  const checkIn = useMutation({
    mutationFn: (bookingId: string) => staffApi.checkIn(bookingId),
    onSuccess: ({ booking: updated }) => {
      setBooking(updated);
      setRecent((current) => [updated, ...current.filter((item) => item.id !== updated.id)].slice(0, RECENT_LIMIT));
      queryClient.setQueryData(queryKeys.booking(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success(`Đã soát vé ${updated.code} · Ghế ${updated.seats.map((seat) => seat.label).join(', ')}`);
      setCode('');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const handleLookup = (event: FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) {
      toast.error('Vui lòng nhập mã đặt vé hợp lệ');
      return;
    }
    lookup.mutate(normalized);
  };

  const eligibility = booking ? getCheckInEligibility(booking, now) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight">
        <ScanLine className="size-8 text-brand" aria-hidden /> Soát vé
      </h1>
      <p className="mt-2 text-ink-muted">Nhập mã đặt vé (in dưới mã QR) để kiểm tra và xác nhận khách vào phòng chiếu.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0 rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-label="Kiểm tra vé">
          <form onSubmit={handleLookup} className="flex gap-2">
            <label htmlFor="booking-code" className="sr-only">
              Mã đặt vé
            </label>
            <input
              id="booking-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="VD: LMNK8ZRC8X"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="h-12 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface-raised px-4 font-mono text-lg tracking-widest uppercase placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-ink-subtle focus:border-brand focus:outline-none"
            />
            <Button type="submit" size="lg" isLoading={lookup.isPending}>
              {!lookup.isPending && <Search className="size-4.5" aria-hidden />} Kiểm tra
            </Button>
          </form>

          {booking ? (
            <div className="mt-6 animate-fade-in border-t border-line pt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="font-mono text-xl font-black tracking-[0.2em]">{booking.code}</p>
                <Link to={`/tickets/${booking.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
                  Xem vé đầy đủ <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </div>
              <BookingSummaryCard booking={booking} now={now} />
              {eligibility?.canCheckIn && (
                <Button size="lg" fullWidth className="mt-6" isLoading={checkIn.isPending} onClick={() => checkIn.mutate(booking.id)}>
                  {!checkIn.isPending && <CircleCheck className="size-5" aria-hidden />} Xác nhận soát vé
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-line-strong py-14 text-center text-sm text-ink-subtle">
              <ScanLine className="mb-3 size-10 opacity-40" aria-hidden />
              Chưa có vé nào được kiểm tra
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-line bg-surface p-5" aria-label="Vừa soát">
          <h2 className="font-bold">Vừa soát trong phiên</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-ink-subtle">Danh sách vé đã soát sẽ hiển thị tại đây.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {recent.map((item) => (
                <li key={item.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold">{item.code}</span>
                    <span className="text-xs text-emerald-300">{formatTime(item.checkedInAt!)}</span>
                  </div>
                  <p className="truncate text-xs text-ink-muted">
                    {item.movieTitle} · Ghế {item.seats.map((seat) => seat.label).join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
