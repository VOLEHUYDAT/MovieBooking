import { Lock, LogIn, Mail, TriangleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@shared/lib/permissions';
import type { UserRole } from '@shared/types/domain';
import { getErrorMessage } from '@/api/httpClient';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useLogin } from '@/hooks/useAuthActions';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { sanitizeRedirectPath } from '@/lib/auth';

/** Seeded demo accounts (see server/src/db/seed/demoAccounts.ts). Only bundled in development. */
const DEMO_ACCOUNTS: { role: UserRole; email: string; password: string }[] = import.meta.env.DEV
  ? [
      { role: 'customer', email: 'member@lumina.example', password: 'Member@123' },
      { role: 'staff', email: 'staff@lumina.example', password: 'Staff@123' },
      { role: 'admin', email: 'admin@lumina.example', password: 'Admin@123' },
    ]
  : [];

export function LoginPage() {
  useDocumentTitle('Đăng nhập');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useLogin();
  const redirect = sanitizeRedirectPath(searchParams.get('redirect'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setFormError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setFormError(null);
    login.mutate(
      { email: email.trim(), password, rememberMe },
      {
        onSuccess: ({ user }) => {
          toast.success(`Chào mừng trở lại, ${user.fullName}!`);
          navigate(redirect, { replace: true });
        },
        onError: (error) => setFormError(getErrorMessage(error)),
      },
    );
  };

  return (
    <AuthLayout
      title="Đăng nhập"
      description={redirect.startsWith('/booking') ? 'Đăng nhập để tiếp tục đặt vé cho suất chiếu bạn đã chọn.' : 'Chào mừng bạn quay lại Lumina Cinema.'}
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to={`/register${searchParams.toString() ? `?${searchParams}` : ''}`} className="font-semibold text-brand hover:underline">
            Đăng ký ngay
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div role="alert" className="flex gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-300 ring-1 ring-red-500/30">
            <TriangleAlert className="size-4.5 shrink-0" aria-hidden />
            {formError}
          </div>
        )}
        <TextField
          name="email"
          label="Email"
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="ban@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoFocus
        />
        <TextField
          name="password"
          label="Mật khẩu"
          icon={Lock}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          revealable
        />
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="size-4 accent-brand"
          />
          Ghi nhớ đăng nhập trong 30 ngày
        </label>
        <Button type="submit" size="lg" fullWidth isLoading={login.isPending}>
          {!login.isPending && <LogIn className="size-4.5" aria-hidden />}
          Đăng nhập
        </Button>
      </form>

      {DEMO_ACCOUNTS.length > 0 && (
        <div className="mt-6 border-t border-dashed border-line-strong pt-5">
          <p className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">Tài khoản demo (chỉ môi trường dev)</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                  setFormError(null);
                }}
                className="rounded-xl border border-line-strong px-2 py-2.5 text-xs font-semibold text-ink-muted transition-colors hover:border-brand hover:text-ink"
              >
                {ROLE_LABELS[account.role]}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
