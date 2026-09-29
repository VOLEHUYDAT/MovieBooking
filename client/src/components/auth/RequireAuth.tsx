import { ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { hasPermission, type Permission } from '@shared/lib/permissions';
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
          title="Bạn không có quyền truy cập"
          description="Trang này chỉ dành cho tài khoản có quyền phù hợp. Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ quản trị viên."
          action={<ButtonLink to="/">Về trang chủ</ButtonLink>}
        />
      </div>
    );
  }

  return children;
}

/** Login/register pages: signed-in users are sent back to where they came from. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useCurrentUser();
  const location = useLocation();
  if (isLoading) return <PageLoader />;
  if (user) {
    const redirect = sanitizeRedirectPath(new URLSearchParams(location.search).get('redirect'));
    return <Navigate to={redirect} replace />;
  }
  return children;
}
