import type { CustomerInfo } from '../types/domain';

export type CustomerInfoErrors = Partial<Record<keyof CustomerInfo, string>>;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;
export const MAX_NAME_LENGTH = 80;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Vietnamese mobile numbers: 0xxxxxxxxx or +84xxxxxxxxx with a valid carrier prefix. */
const VIETNAMESE_PHONE_PATTERN = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s.-]/g, '');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateFullName(value: string): string | null {
  const fullName = value.trim();
  if (!fullName) return 'Vui lòng nhập họ và tên';
  if (fullName.length < 2) return 'Họ và tên quá ngắn';
  if (fullName.length > MAX_NAME_LENGTH) return `Họ và tên tối đa ${MAX_NAME_LENGTH} ký tự`;
  if (/\d/.test(fullName)) return 'Họ và tên không được chứa chữ số';
  return null;
}

export function validatePhone(value: string): string | null {
  const phone = normalizePhone(value);
  if (!phone) return 'Vui lòng nhập số điện thoại';
  if (!VIETNAMESE_PHONE_PATTERN.test(phone)) return 'Số điện thoại không hợp lệ (VD: 0912345678)';
  return null;
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Vui lòng nhập email';
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Email không hợp lệ';
  return null;
}

export function validateNewPassword(password: string): string | null {
  if (!password) return 'Vui lòng nhập mật khẩu';
  if (password.length < MIN_PASSWORD_LENGTH) return `Mật khẩu cần tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Mật khẩu tối đa ${MAX_PASSWORD_LENGTH} ký tự`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Mật khẩu cần có cả chữ và số';
  return null;
}

export function validateCustomerInfo(customer: CustomerInfo): CustomerInfoErrors {
  const errors: CustomerInfoErrors = {};
  const fullNameError = validateFullName(customer.fullName);
  const phoneError = validatePhone(customer.phone);
  const emailError = validateEmail(customer.email);
  if (fullNameError) errors.fullName = fullNameError;
  if (phoneError) errors.phone = phoneError;
  if (emailError) errors.email = emailError;
  return errors;
}
