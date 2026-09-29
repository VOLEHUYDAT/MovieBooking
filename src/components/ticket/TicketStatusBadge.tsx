import { cn } from '@/lib/cn';
import type { BookingTimelineStatus } from '@/services/bookingService';

const STATUS_CONFIG: Record<BookingTimelineStatus, { label: string; className: string }> = {
  upcoming: { label: 'Sắp chiếu', className: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
  watched: { label: 'Đã xem', className: 'bg-white/8 text-ink-muted ring-line-strong' },
  cancelled: { label: 'Đã hủy', className: 'bg-red-500/15 text-red-300 ring-red-500/30' },
};

export function TicketStatusBadge({ status, className }: { status: BookingTimelineStatus; className?: string }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ring-1', config.className, className)}>
      {config.label}
    </span>
  );
}
