import { ChevronDown, LayoutDashboard, LogOut, ScanLine, Ticket, UserRound } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { hasPermission, ROLE_LABELS } from '@shared/lib/permissions';
import type { User } from '@shared/types/domain';
import { useLogout } from '@/hooks/useAuthActions';
import { cn } from '@/lib/cn';

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return ((parts.at(-2)?.[0] ?? '') + (parts.at(-1)?.[0] ?? '')).toUpperCase() || '?';
}

export function UserMenu({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const navigate = useNavigate();
  const logout = useLogout();

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const items = [
    { to: '/account', label: 'Tài khoản của tôi', icon: UserRound, visible: true },
    { to: '/tickets', label: 'Vé của tôi', icon: Ticket, visible: true },
    { to: '/staff/check-in', label: 'Soát vé', icon: ScanLine, visible: hasPermission(user.role, 'ticket:check-in') },
    { to: '/admin', label: 'Trang quản trị', icon: LayoutDashboard, visible: hasPermission(user.role, 'report:view') },
  ].filter((item) => item.visible);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        className="flex h-10 items-center gap-2 rounded-xl pr-2 pl-1 transition-colors hover:bg-white/5"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-gradient-brand text-xs font-bold text-white">
          {getInitials(user.fullName)}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-semibold md:inline">{user.fullName}</span>
        <ChevronDown className={cn('size-4 text-ink-subtle transition-transform', isOpen && 'rotate-180')} aria-hidden />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 mt-2 w-64 animate-slide-up overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
            <span className="mt-2 inline-flex rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
              {ROLE_LABELS[user.role]}
            </span>
          </div>
          <div className="p-1.5">
            {items.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-white/5 hover:text-ink"
              >
                <Icon className="size-4.5" aria-hidden /> {label}
              </Link>
            ))}
            <button
              type="button"
              role="menuitem"
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, {
                  onSettled: () => {
                    setIsOpen(false);
                    toast.success('Đã đăng xuất');
                    navigate('/', { replace: true });
                  },
                })
              }
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="size-4.5" aria-hidden /> Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
