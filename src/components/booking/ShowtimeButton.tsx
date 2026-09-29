import { Link } from 'react-router';
import { formatTime } from '@/lib/format';
import { isShowtimeBookable } from '@/services/showtimeService';
import type { Showtime } from '@/types/domain';
import { FormatBadge } from '../ui/Badges';

export function ShowtimeButton({ showtime, now }: { showtime: Showtime; now: Date }) {
  const isBookable = isShowtimeBookable(showtime, now);
  const startTime = formatTime(showtime.startsAt);
  const content = (
    <>
      <span className="flex items-center gap-2">
        <span className="text-base font-bold tabular-nums">{startTime}</span>
        {showtime.format !== '2D' && <FormatBadge format={showtime.format} className="h-5 px-1.5 text-[10px]" />}
      </span>
      <span className="text-[11px] text-ink-subtle">
        {isBookable ? `~ ${formatTime(showtime.endsAt)} · ${showtime.auditorium}` : 'Đã hết giờ bán'}
      </span>
    </>
  );

  const baseClassName = 'flex min-w-28 flex-col items-start gap-0.5 rounded-xl px-3.5 py-2.5 ring-1 transition-all';

  if (!isBookable) {
    return (
      <span
        aria-disabled="true"
        title="Suất chiếu đã đóng bán vé trực tuyến"
        className={`${baseClassName} cursor-not-allowed bg-white/[0.02] text-ink-subtle ring-line opacity-60`}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      to={`/booking/${showtime.id}/seats`}
      aria-label={`Suất ${startTime}, ${showtime.format}, ${showtime.auditorium}`}
      className={`${baseClassName} bg-surface-raised ring-line-strong hover:-translate-y-0.5 hover:bg-brand-soft hover:ring-brand/60`}
    >
      {content}
    </Link>
  );
}
