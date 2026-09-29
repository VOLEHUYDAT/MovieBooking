import {
  Building2,
  Clapperboard,
  LayoutDashboard,
  Receipt,
  ScanLine,
  Ticket,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@shared/types/domain';

/**
 * Single source of truth for what each role sees. Each role works in its own area:
 * guests and customers use the storefront, staff the check-in desk, admins the back office.
 */
export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match the path exactly (for index routes). */
  end?: boolean;
  /** Shows the upcoming-ticket counter. */
  showsTicketBadge?: boolean;
}

type Audience = UserRole | 'guest';

const STOREFRONT_NAV: NavItem[] = [
  { to: '/', label: 'Phim', icon: Clapperboard, end: true },
  { to: '/cinemas', label: 'Rạp chiếu', icon: Building2 },
];

const MAIN_NAV: Record<Audience, NavItem[]> = {
  guest: STOREFRONT_NAV,
  customer: [...STOREFRONT_NAV, { to: '/tickets', label: 'Vé của tôi', icon: Ticket, showsTicketBadge: true }],
  staff: [{ to: '/staff/check-in', label: 'Soát vé', icon: ScanLine }],
  admin: [
    { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
    { to: '/admin/bookings', label: 'Đặt vé', icon: Receipt },
    { to: '/admin/users', label: 'Người dùng', icon: Users },
    { to: '/staff/check-in', label: 'Soát vé', icon: ScanLine },
  ],
};

const ACCOUNT_ITEM: NavItem = { to: '/account', label: 'Tài khoản của tôi', icon: UserRound };

const USER_MENU: Record<UserRole, NavItem[]> = {
  customer: [ACCOUNT_ITEM, { to: '/tickets', label: 'Vé của tôi', icon: Ticket }],
  staff: [{ to: '/staff/check-in', label: 'Soát vé', icon: ScanLine }, ACCOUNT_ITEM],
  admin: [{ to: '/admin', label: 'Trang quản trị', icon: LayoutDashboard }, ACCOUNT_ITEM],
};

const HOME_PATH: Record<Audience, string> = {
  guest: '/',
  customer: '/',
  staff: '/staff/check-in',
  admin: '/admin',
};

export function getMainNav(role: UserRole | null): NavItem[] {
  return MAIN_NAV[role ?? 'guest'];
}

export function getUserMenu(role: UserRole): NavItem[] {
  return USER_MENU[role];
}

export function getHomePath(role: UserRole | null): string {
  return HOME_PATH[role ?? 'guest'];
}

/** Roles that browse and buy tickets (guests included). */
export function usesStorefront(role: UserRole | null): boolean {
  return role === null || role === 'customer';
}

const STOREFRONT_PREFIXES = ['/movies', '/cinemas', '/booking', '/tickets'];
const OPERATIONS_PREFIXES = ['/admin', '/staff'];

function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
}

/**
 * Where to go after signing in: honour the requested page when it belongs to the user's area,
 * otherwise land on the role's home. Ticket detail pages are shared by every role.
 */
export function resolvePostLoginPath(requestedPath: string, role: UserRole): string {
  const home = getHomePath(role);
  if (requestedPath === '/' || requestedPath === '') return home;
  if (/^\/tickets\/[^/?#]+/.test(requestedPath)) return requestedPath;
  const isStorefront = matchesPrefix(requestedPath, STOREFRONT_PREFIXES);
  const isOperations = matchesPrefix(requestedPath, OPERATIONS_PREFIXES);
  if (usesStorefront(role) && isOperations) return home;
  if (!usesStorefront(role) && isStorefront) return home;
  return requestedPath;
}
