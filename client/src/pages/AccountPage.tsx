import { KeyRound, LogOut, Mail, Phone, Save, ShieldCheck, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@shared/lib/permissions';
import { validateFullName, validateNewPassword, validatePhone } from '@shared/lib/validation';
import type { User as AppUser } from '@shared/types/domain';
import { getErrorMessage, isApiError } from '@/api/httpClient';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useChangePassword, useLogout, useUpdateProfile } from '@/hooks/useAuthActions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatShortDate } from '@/lib/format';

function ProfileForm({ user }: { user: AppUser }) {
  const updateProfile = useUpdateProfile();
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const errors = { fullName: validateFullName(fullName), phone: validatePhone(phone) };
  const isDirty = fullName.trim() !== user.fullName || phone !== user.phone;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitted(true);
    if (errors.fullName || errors.phone) return;
    updateProfile.mutate(
      { fullName, phone },
      {
        onSuccess: () => toast.success('Đã cập nhật thông tin tài khoản'),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-bold">
        <User className="size-4.5 text-brand" aria-hidden /> Thông tin cá nhân
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField
          name="fullName"
          label="Họ và tên"
          icon={User}
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={isSubmitted ? (errors.fullName ?? undefined) : undefined}
          className="sm:col-span-2"
        />
        <TextField name="email" label="Email" icon={Mail} value={user.email} disabled isRequired={false} hint="Email dùng để đăng nhập, không thể thay đổi." />
        <TextField
          name="phone"
          label="Số điện thoại"
          icon={Phone}
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={isSubmitted ? (errors.phone ?? undefined) : undefined}
        />
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={!isDirty} isLoading={updateProfile.isPending}>
          {!updateProfile.isPending && <Save className="size-4" aria-hidden />} Lưu thay đổi
        </Button>
      </div>
    </form>
  );
}

function ChangePasswordForm() {
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const errors = {
    currentPassword: serverErrors.currentPassword ?? (currentPassword ? null : 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: serverErrors.newPassword ?? validateNewPassword(newPassword),
    confirmPassword: confirmPassword === newPassword ? null : 'Mật khẩu nhập lại không khớp',
  };
  const show = (message: string | null) => (isSubmitted && message ? message : undefined);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitted(true);
    if (errors.currentPassword || errors.newPassword || errors.confirmPassword) return;
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success('Đổi mật khẩu thành công. Các thiết bị khác đã được đăng xuất.');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setIsSubmitted(false);
        },
        onError: (error) => {
          if (isApiError(error) && Object.keys(error.fields).length > 0) setServerErrors(error.fields);
          else toast.error(getErrorMessage(error));
        },
      },
    );
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-bold">
        <KeyRound className="size-4.5 text-brand" aria-hidden /> Đổi mật khẩu
      </h2>
      <div className="mt-5 grid gap-4">
        <TextField
          name="currentPassword"
          label="Mật khẩu hiện tại"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value);
            setServerErrors({});
          }}
          error={show(errors.currentPassword)}
          revealable
        />
        <div>
          <TextField
            name="newPassword"
            label="Mật khẩu mới"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              setServerErrors({});
            }}
            error={show(errors.newPassword)}
            revealable
          />
          <PasswordStrengthMeter password={newPassword} />
        </div>
        <TextField
          name="confirmPassword"
          label="Nhập lại mật khẩu mới"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={show(errors.confirmPassword)}
          revealable
        />
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" isLoading={changePassword.isPending}>
          Cập nhật mật khẩu
        </Button>
      </div>
    </form>
  );
}

export function AccountPage() {
  useDocumentTitle('Tài khoản của tôi');
  const { user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Tài khoản của tôi</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
              <ShieldCheck className="size-3.5" aria-hidden /> {ROLE_LABELS[user.role]}
            </span>
            Thành viên từ {formatShortDate(user.createdAt)}
          </p>
        </div>
        <Button
          variant="secondary"
          isLoading={logout.isPending}
          onClick={() =>
            logout.mutate(undefined, {
              onSettled: () => {
                toast.success('Đã đăng xuất');
                navigate('/', { replace: true });
              },
            })
          }
        >
          {!logout.isPending && <LogOut className="size-4" aria-hidden />} Đăng xuất
        </Button>
      </div>

      <div className="mt-8 space-y-6">
        <ProfileForm key={`${user.id}-${user.fullName}-${user.phone}`} user={user} />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
