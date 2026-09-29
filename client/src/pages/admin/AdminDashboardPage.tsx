import { useQuery } from '@tanstack/react-query';
import { ArrowRight, WifiOff } from 'lucide-react';
import { Link } from 'react-router';
import { getBookingTimelineStatus } from '@shared/services/bookingPolicy';
import { adminApi, queryKeys } from '@/api/endpoints';
import { RankedBarList, RevenueColumnChart } from '@/components/admin/charts';
import { TicketStatusBadge } from '@/components/ticket/TicketStatusBadge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCurrency, formatShortDate, formatTime } from '@/lib/format';

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {detail && <p className="mt-1 text-xs text-ink-subtle">{detail}</p>}
    </div>
  );
}

export function AdminDashboardPage() {
  useDocumentTitle('Quản trị · Tổng quan');
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: ({ signal }) => adminApi.stats(signal),
    refetchInterval: 60_000,
  });

  if (isPending) return <PageLoader label="Đang tải số liệu..." />;
  if (isError || !data) {
    return (
      <EmptyState
        icon={WifiOff}
        title="Không tải được số liệu"
        description="Kết nối tới máy chủ gặp sự cố."
        action={<Button onClick={() => void refetch()}>Thử lại</Button>}
      />
    );
  }

  const { totals } = data;
  const averageOrder = totals.confirmedBookings > 0 ? totals.revenue / totals.confirmedBookings : 0;
  const weekRevenue = data.revenueByDay.reduce((sum, point) => sum + point.revenue, 0);

  return (
    <div className="space-y-6">
      <section aria-label="Chỉ số chính" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/15 to-surface p-5 sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-ink-muted">Tổng doanh thu</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{formatCurrency(totals.revenue)}</p>
          <p className="mt-1 text-xs text-ink-subtle">7 ngày qua: {formatCurrency(weekRevenue)}</p>
        </div>
        <StatTile label="Vé đã bán" value={totals.ticketsSold.toLocaleString('vi-VN')} detail={`${totals.confirmedBookings} đơn đang hiệu lực`} />
        <StatTile label="Giá trị đơn trung bình" value={formatCurrency(Math.round(averageOrder))} detail={`${totals.cancelledBookings} đơn đã hủy`} />
        <StatTile label="Khách hàng" value={totals.customers.toLocaleString('vi-VN')} detail={`${totals.checkedInBookings} lượt đã soát vé`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="revenue-by-day">
          <h2 id="revenue-by-day" className="font-bold">
            Doanh thu 7 ngày qua
          </h2>
          <p className="mb-5 text-xs text-ink-subtle">Theo ngày đặt vé · đơn đã xác nhận</p>
          <RevenueColumnChart data={data.revenueByDay} title="Doanh thu theo ngày trong 7 ngày qua" />
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="revenue-by-movie">
          <h2 id="revenue-by-movie" className="font-bold">
            Phim có doanh thu cao nhất
          </h2>
          <p className="mb-5 text-xs text-ink-subtle">Toàn thời gian · đơn đã xác nhận</p>
          {data.revenueByMovie.length > 0 ? (
            <RankedBarList data={data.revenueByMovie} title="Doanh thu theo phim" />
          ) : (
            <p className="text-sm text-ink-subtle">Chưa có dữ liệu.</p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-surface" aria-labelledby="recent-bookings">
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <h2 id="recent-bookings" className="font-bold">
            Đơn đặt vé gần đây
          </h2>
          <Link to="/admin/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            Xem tất cả <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-ink-subtle uppercase">
              <tr className="border-y border-line">
                <th className="px-5 py-2.5 font-semibold">Mã vé</th>
                <th className="px-5 py-2.5 font-semibold">Phim</th>
                <th className="px-5 py-2.5 font-semibold">Khách hàng</th>
                <th className="px-5 py-2.5 font-semibold">Đặt lúc</th>
                <th className="px-5 py-2.5 text-right font-semibold">Tổng tiền</th>
                <th className="px-5 py-2.5 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.recentBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <Link to={`/tickets/${booking.id}`} className="font-mono font-bold hover:text-brand">
                      {booking.code}
                    </Link>
                  </td>
                  <td className="max-w-48 truncate px-5 py-3">{booking.movieTitle}</td>
                  <td className="px-5 py-3 text-ink-muted">{booking.customer.fullName}</td>
                  <td className="px-5 py-3 text-ink-muted tabular-nums">
                    {formatTime(booking.createdAt)} {formatShortDate(booking.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatCurrency(booking.pricing.total)}</td>
                  <td className="px-5 py-3">
                    <TicketStatusBadge status={getBookingTimelineStatus(booking)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
