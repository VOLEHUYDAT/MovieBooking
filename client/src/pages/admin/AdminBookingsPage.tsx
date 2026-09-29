import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Receipt, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { canCancelBooking, getBookingTimelineStatus } from '@shared/services/bookingPolicy';
import type { Booking } from '@shared/types/domain';
import { adminApi, bookingApi, queryKeys, type AdminBookingFilter } from '@/api/endpoints';
import { getErrorMessage } from '@/api/httpClient';
import { Pagination, SearchInput } from '@/components/admin/TableControls';
import { TicketStatusBadge } from '@/components/ticket/TicketStatusBadge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/cn';
import { formatCurrency, formatShortDate, formatTime } from '@/lib/format';

const PAGE_SIZE = 10;
const FILTERS: { value: AdminBookingFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'confirmed', label: 'Chưa soát' },
  { value: 'checked-in', label: 'Đã soát' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export function AdminBookingsPage() {
  useDocumentTitle('Quản trị · Đặt vé');
  const queryClient = useQueryClient();
  const now = useNow();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AdminBookingFilter>('all');
  const [page, setPage] = useState(1);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  const query = { search: debouncedSearch || undefined, filter, page, pageSize: PAGE_SIZE };
  const { data, isPending, isFetching } = useQuery({
    queryKey: queryKeys.adminBookings(query),
    queryFn: ({ signal }) => adminApi.bookings(query, signal),
    placeholderData: keepPreviousData,
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => bookingApi.cancel(bookingId),
    onSuccess: ({ booking }) => {
      toast.success(`Đã hủy vé ${booking.code}`);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => setBookingToCancel(null),
  });

  return (
    <section aria-label="Quản lý đặt vé" className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Tìm mã vé, tên, email, phim..."
        />
        <div role="tablist" aria-label="Lọc trạng thái" className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              onClick={() => {
                setFilter(item.value);
                setPage(1);
              }}
              className={cn(
                'h-9 rounded-full px-3.5 text-xs font-semibold ring-1 transition-colors',
                filter === item.value ? 'bg-ink text-canvas ring-ink' : 'text-ink-muted ring-line-strong hover:text-ink',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <PageLoader />
      ) : !data || data.items.length === 0 ? (
        <EmptyState className="mx-5 mb-5" icon={Receipt} title="Không có đơn đặt vé phù hợp" description="Thử từ khóa hoặc bộ lọc khác." />
      ) : (
        <>
          <div className={cn('overflow-x-auto transition-opacity', isFetching && 'opacity-60')}>
            <table className="w-full min-w-[860px] text-sm">
              <thead className="text-left text-xs text-ink-subtle uppercase">
                <tr className="border-y border-line">
                  <th className="px-5 py-2.5 font-semibold">Mã vé</th>
                  <th className="px-5 py-2.5 font-semibold">Phim · Suất chiếu</th>
                  <th className="px-5 py-2.5 font-semibold">Ghế</th>
                  <th className="px-5 py-2.5 font-semibold">Khách hàng</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Tổng tiền</th>
                  <th className="px-5 py-2.5 font-semibold">Trạng thái</th>
                  <th className="px-5 py-2.5">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((booking) => {
                  const status = getBookingTimelineStatus(booking, now);
                  return (
                    <tr key={booking.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <Link to={`/tickets/${booking.id}`} className="font-mono font-bold hover:text-brand">
                          {booking.code}
                        </Link>
                        <p className="text-xs text-ink-subtle">Đặt {formatShortDate(booking.createdAt)}</p>
                      </td>
                      <td className="max-w-60 px-5 py-3">
                        <p className="truncate font-medium">{booking.movieTitle}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {formatTime(booking.startsAt)} {formatShortDate(booking.startsAt)} · {booking.cinemaName}
                        </p>
                      </td>
                      <td className="px-5 py-3 font-semibold">{booking.seats.map((seat) => seat.label).join(', ')}</td>
                      <td className="px-5 py-3">
                        <p>{booking.customer.fullName}</p>
                        <p className="text-xs text-ink-muted">{booking.customer.email}</p>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatCurrency(booking.pricing.total)}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <TicketStatusBadge status={status} />
                          {booking.checkedInAt && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                              <CircleCheck className="size-3.5" aria-hidden /> Đã soát
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {canCancelBooking(booking, now, { isAdmin: true }) && (
                          <Button variant="danger" size="sm" onClick={() => setBookingToCancel(booking)}>
                            <XCircle className="size-4" aria-hidden /> Hủy
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        isOpen={bookingToCancel !== null}
        icon={XCircle}
        tone="danger"
        title="Hủy đơn đặt vé?"
        description={
          bookingToCancel && (
            <>
              Hủy vé <strong className="text-ink">{bookingToCancel.code}</strong> của{' '}
              <strong className="text-ink">{bookingToCancel.customer.fullName}</strong> và hoàn{' '}
              {formatCurrency(bookingToCancel.pricing.total)}. Ghế sẽ được mở bán lại.
            </>
          )
        }
        confirmLabel={cancelMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
        cancelLabel="Không"
        onCancel={() => setBookingToCancel(null)}
        onConfirm={() => {
          if (bookingToCancel && !cancelMutation.isPending) cancelMutation.mutate(bookingToCancel.id);
        }}
      />
    </section>
  );
}
