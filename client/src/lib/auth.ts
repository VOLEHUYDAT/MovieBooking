import { MIN_PASSWORD_LENGTH } from '@shared/lib/validation';

/** Only allow same-origin relative paths as post-login redirects (prevents open redirects). */
export function sanitizeRedirectPath(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.startsWith('/login') || value.startsWith('/register')) return fallback;
  return value;
}

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  0: '',
  1: 'Yếu',
  2: 'Trung bình',
  3: 'Khá',
  4: 'Mạnh',
};

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 0;
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.max(1, score) as PasswordStrength;
}
