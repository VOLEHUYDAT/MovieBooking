import { Building2, Clapperboard, LayoutDashboard, LogIn, ScanLine, Ticket } from 'lucide-react';
import { useMemo } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { hasPermission } from '@shared/lib/permissions';
import { getBookingTimelineStatus } from '@shared/services/bookingPolicy';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMyBookings } from '@/hooks/useMyBookings';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/cn';
import { ButtonLink } from '../ui/Button';
import { UserMenu } from './UserMenu';

export function AppHeader() {
  const { user, isLoading } = useCurrentUser();
  const { data: bookings } = useMyBookings();
  const location = useLocation();
  const now = useNow(60_000);

  const upcomingCount = useMemo(
    () => (bookings ?? []).filter((booking) => getBookingTimelineStatus(booking, now) === 'upcoming').length,
    [bookings, now],
  );

  const navItems = [
    { to: '/', label: 'Phim', icon: Clapperboard, end: true, visible: true },
    { to: '/cinemas', label: 'Rạp chiếu', icon: Building2, end: false, visible: true },
    { to: '/tickets', label: 'Vé của tôi', icon: Ticket, end: false, visible: user !== null },
    { to: '/staff/check-in', label: 'Soát vé', icon: ScanLine, end: false, visible: !!user && hasPermission(user.role, 'ticket:check-in') },
    { to: '/admin', label: 'Quản trị', icon: LayoutDashboard, end: false, visible: !!user && hasPermission(user.role, 'report:view') },
  ].filter((item) => item.visible);

  const loginHref = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;

  return (
    <header className="print-hidden sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Lumina Cinema - Trang chủ">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-brand shadow-glow">
            <svg viewBox="0 0 24 24" className="size-4 fill-white" aria-hidden>
              <path d="M7 4.5v15l12.5-7.5z" />
            </svg>
          </span>
          <span className="hidden text-lg font-black tracking-tight sm:inline">
            Lumina<span className="text-gradient-brand">Cinema</span>
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-1">
          <nav aria-label="Điều hướng chính" className="flex items-center gap-0.5">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                className={({ isActive }) =>
                  cn(
                    'relative inline-flex h-10 items-center gap-2 rounded-xl px-2.5 text-sm font-semibold transition-colors lg:px-3',
                    isActive ? 'bg-white/8 text-ink' : 'text-ink-muted hover:bg-white/5 hover:text-ink',
                  )
                }
              >
                <Icon className="size-4.5" aria-hidden />
                <span className="hidden lg:inline">{label}</span>
                <span className="sr-only lg:hidden">{label}</span>
                {to === '/tickets' && upcomingCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-white lg:static"
                    aria-label={`${upcomingCount} vé sắp chiếu`}
                  >
                    {upcomingCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-1 flex items-center border-l border-line pl-2">
            {isLoading ? (
              <span className="size-10 animate-pulse rounded-xl bg-white/5" aria-hidden />
            ) : user ? (
              <UserMenu user={user} />
            ) : (
              <ButtonLink to={loginHref} size="sm">
                <LogIn className="size-4" aria-hidden /> Đăng nhập
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
