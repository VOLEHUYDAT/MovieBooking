import { Lock, Mail, Phone, User, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { validateEmail, validateFullName, validateNewPassword, validatePhone } from '@shared/lib/validation';
import { getErrorMessage, isApiError } from '@/api/httpClient';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useRegister } from '@/hooks/useAuthActions';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { resolvePostLoginPath } from '@/app/navigation';
import { sanitizeRedirectPath } from '@/lib/auth';
import { cn } from '@/lib/cn';

interface RegisterForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

type FieldName = keyof RegisterForm;
const FIELD_ORDER: FieldName[] = ['fullName', 'email', 'phone', 'password', 'confirmPassword'];

function validate(form: RegisterForm): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  const checks: [FieldName, string | null][] = [
    ['fullName', validateFullName(form.fullName)],
    ['email', validateEmail(form.email)],
    ['phone', validatePhone(form.phone)],
    ['password', validateNewPassword(form.password)],
    ['confirmPassword', !form.confirmPassword ? 'Vui lòng nhập lại mật khẩu' : form.confirmPassword !== form.password ? 'Mật khẩu nhập lại không khớp' : null],
  ];
  for (const [field, message] of checks) if (message) errors[field] = message;
  return errors;
}

export function RegisterPage() {
  useDocumentTitle('Đăng ký');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const register = useRegister();
  const redirect = sanitizeRedirectPath(searchParams.get('redirect'));

  const [form, setForm] = useState<RegisterForm>({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<FieldName, string>>>({});

  const errors = validate(form);
  for (const field of FIELD_ORDER) {
    const serverError = serverErrors[field];
    if (serverError) errors[field] = serverError;
  }
  const visibleError = (field: FieldName) => ((isSubmitted || touched[field]) ? errors[field] : undefined);

  const update = (field: FieldName) => (event: { target: { value: string } }) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setServerErrors((current) => ({ ...current, [field]: undefined }));
  };
  const markTouched = (field: FieldName) => () => setTouched((current) => ({ ...current, [field]: true }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);
    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      event.currentTarget.querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    if (!hasAcceptedTerms) {
      toast.error('Vui lòng đồng ý với điều khoản sử dụng');
      return;
    }

    register.mutate(
      { fullName: form.fullName, email: form.email, phone: form.phone, password: form.password },
      {
        onSuccess: ({ user }) => {
          toast.success(`Tạo tài khoản thành công. Xin chào ${user.fullName}!`);
          navigate(resolvePostLoginPath(redirect, user.role), { replace: true });
        },
        onError: (error) => {
          if (isApiError(error) && Object.keys(error.fields).length > 0) setServerErrors(error.fields);
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  return (
    <AuthLayout
      title="Tạo tài khoản"
      description="Đăng ký miễn phí để đặt vé, lưu vé điện tử và nhận ưu đãi."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to={`/login${searchParams.toString() ? `?${searchParams}` : ''}`} className="font-semibold text-brand hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <TextField
          name="fullName"
          label="Họ và tên"
          icon={User}
          autoComplete="name"
          placeholder="Nguyễn Văn A"
          value={form.fullName}
          onChange={update('fullName')}
          onBlur={markTouched('fullName')}
          error={visibleError('fullName')}
          autoFocus
        />
        <TextField
          name="email"
          label="Email"
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="ban@example.com"
          value={form.email}
          onChange={update('email')}
          onBlur={markTouched('email')}
          error={visibleError('email')}
        />
        <TextField
          name="phone"
          label="Số điện thoại"
          icon={Phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0912 345 678"
          value={form.phone}
          onChange={update('phone')}
          onBlur={markTouched('phone')}
          error={visibleError('phone')}
        />
        <div>
          <TextField
            name="password"
            label="Mật khẩu"
            icon={Lock}
            type="password"
            autoComplete="new-password"
            placeholder="Tối thiểu 8 ký tự, gồm chữ và số"
            value={form.password}
            onChange={update('password')}
            onBlur={markTouched('password')}
            error={visibleError('password')}
            revealable
          />
          <PasswordStrengthMeter password={form.password} />
        </div>
        <TextField
          name="confirmPassword"
          label="Nhập lại mật khẩu"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          placeholder="Nhập lại mật khẩu"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          onBlur={markTouched('confirmPassword')}
          error={visibleError('confirmPassword')}
          revealable
        />
        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-sm">
          <input
            type="checkbox"
            checked={hasAcceptedTerms}
            onChange={(event) => setHasAcceptedTerms(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-brand"
          />
          <span className={cn(isSubmitted && !hasAcceptedTerms ? 'text-red-300' : 'text-ink-muted')}>
            Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật của Lumina Cinema.
          </span>
        </label>
        <Button type="submit" size="lg" fullWidth isLoading={register.isPending}>
          {!register.isPending && <UserPlus className="size-4.5" aria-hidden />}
          Tạo tài khoản
        </Button>
      </form>
    </AuthLayout>
  );
}
