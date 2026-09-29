import { LogIn } from 'lucide-react';
import { useMemo } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { ROLE_LABELS } from '@shared/lib/permissions';
import { getBookingTimelineStatus } from '@shared/services/bookingPolicy';
import { getHomePath, getMainNav } from '@/app/navigation';
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

  const role = user?.role ?? null;
  const navItems = isLoading ? [] : getMainNav(role);
  const isWorkspace = role === 'staff' || role === 'admin';
  const loginHref =
    location.pathname === '/' ? '/login' : `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;

  return (
    <header className="print-hidden sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to={getHomePath(role)} className="flex shrink-0 items-center gap-2.5" aria-label="Lumina Cinema - Trang chính">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-brand shadow-glow">
            <svg viewBox="0 0 24 24" className="size-4 fill-white" aria-hidden>
              <path d="M7 4.5v15l12.5-7.5z" />
            </svg>
          </span>
          <span className="hidden text-lg font-black tracking-tight sm:inline">
            Lumina<span className="text-gradient-brand">Cinema</span>
          </span>
          {isWorkspace && (
            <span className="hidden rounded-md bg-white/8 px-2 py-0.5 text-[11px] font-bold tracking-wide text-ink-muted uppercase md:inline">
              {ROLE_LABELS[role]}
            </span>
          )}
        </Link>

        <div className="flex min-w-0 items-center gap-1">
          {navItems.length > 0 && (
            <nav aria-label="Điều hướng chính" className="flex items-center gap-0.5">
              {navItems.map(({ to, label, icon: Icon, end, showsTicketBadge }) => (
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
                  <span className="hidden md:inline">{label}</span>
                  <span className="sr-only md:hidden">{label}</span>
                  {showsTicketBadge && upcomingCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-white md:static"
                      aria-label={`${upcomingCount} vé sắp chiếu`}
                    >
                      {upcomingCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          )}

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
