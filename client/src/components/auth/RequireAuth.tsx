import { ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { hasPermission, type Permission } from '@shared/lib/permissions';
import { getHomePath, resolvePostLoginPath, usesStorefront } from '@/app/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { sanitizeRedirectPath } from '@/lib/auth';
import { ButtonLink } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { PageLoader } from '../ui/PageLoader';

interface RequireAuthProps {
  /** When set, the user must also hold this permission. */
  permission?: Permission;
  children: ReactNode;
}

/** Route guard: sends guests to login (returning afterwards) and blocks users without permission. */
export function RequireAuth({ permission, children }: RequireAuthProps) {
  const { user, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!user) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (permission && !hasPermission(user.role, permission)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={ShieldAlert}
          title="Trang này không dành cho tài khoản của bạn"
          description="Tài khoản của bạn không có quyền truy cập trang này. Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ quản trị viên."
          action={<ButtonLink to={getHomePath(user.role)}>Về trang làm việc của bạn</ButtonLink>}
        />
      </div>
    );
  }

  return children;
}

/**
 * Storefront pages (movies, cinemas, booking, my tickets) are for guests and customers only.
 * Staff and admins are sent to their own workspace instead.
 */
export function StorefrontOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useCurrentUser();
  if (isLoading) return <PageLoader />;
  if (user && !usesStorefront(user.role)) return <Navigate to={getHomePath(user.role)} replace />;
  return children;
}

/** Login/register pages: signed-in users go to the requested page if it is theirs, else their home. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useCurrentUser();
  const location = useLocation();
  if (isLoading) return <PageLoader />;
  if (user) {
    const requested = sanitizeRedirectPath(new URLSearchParams(location.search).get('redirect'));
    return <Navigate to={resolvePostLoginPath(requested, user.role)} replace />;
  }
  return children;
}
