import { LayoutDashboard, Receipt, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { cn } from '@/lib/cn';

const ADMIN_NAV = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Đặt vé', icon: Receipt, end: false },
  { to: '/admin/users', label: 'Người dùng', icon: Users, end: false },
];

export function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">Quản trị</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Lumina Admin</h1>
        </div>
        <nav aria-label="Điều hướng quản trị" className="flex gap-1 rounded-xl bg-surface p-1 ring-1 ring-line">
          {ADMIN_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors',
                  isActive ? 'bg-surface-hover text-ink shadow' : 'text-ink-muted hover:text-ink',
                )
              }
            >
              <Icon className="size-4" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
