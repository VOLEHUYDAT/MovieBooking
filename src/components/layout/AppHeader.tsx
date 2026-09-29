import { Building2, Clapperboard, Ticket } from 'lucide-react';
import { useMemo } from 'react';
import { Link, NavLink } from 'react-router';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/cn';
import { getBookingTimelineStatus } from '@/services/bookingService';
import { useBookingHistoryStore } from '@/store/bookingHistoryStore';

const NAV_ITEMS = [
  { to: '/', label: 'Phim', icon: Clapperboard, end: true },
  { to: '/cinemas', label: 'Rạp chiếu', icon: Building2, end: false },
  { to: '/tickets', label: 'Vé của tôi', icon: Ticket, end: false },
] as const;

export function AppHeader() {
  const bookings = useBookingHistoryStore((state) => state.bookings);
  const now = useNow(60_000);
  const upcomingCount = useMemo(
    () => bookings.filter((booking) => getBookingTimelineStatus(booking, now) === 'upcoming').length,
    [bookings, now],
  );

  return (
    <header className="print-hidden sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Lumina Cinema - Trang chủ">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-brand shadow-glow">
            <svg viewBox="0 0 24 24" className="size-4 fill-white" aria-hidden>
              <path d="M7 4.5v15l12.5-7.5z" />
            </svg>
          </span>
          <span className="text-lg font-black tracking-tight">
            Lumina<span className="text-gradient-brand">Cinema</span>
          </span>
        </Link>

        <nav aria-label="Điều hướng chính" className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors',
                  isActive ? 'bg-white/8 text-ink' : 'text-ink-muted hover:bg-white/5 hover:text-ink',
                )
              }
            >
              <Icon className="size-4.5" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
              <span className="sr-only sm:hidden">{label}</span>
              {to === '/tickets' && upcomingCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-white sm:static sm:size-5"
                  aria-label={`${upcomingCount} vé sắp chiếu`}
                >
                  {upcomingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
