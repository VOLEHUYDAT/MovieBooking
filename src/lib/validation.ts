import type { CustomerInfo } from '@/types/domain';

export type CustomerInfoErrors = Partial<Record<keyof CustomerInfo, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Vietnamese mobile numbers: 0xxxxxxxxx or +84xxxxxxxxx with a valid carrier prefix. */
const VIETNAMESE_PHONE_PATTERN = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

export function validateCustomerInfo(customer: CustomerInfo): CustomerInfoErrors {
  const errors: CustomerInfoErrors = {};
  const fullName = customer.fullName.trim();
  const email = customer.email.trim();
  const phone = customer.phone.replace(/[\s.-]/g, '');

  if (!fullName) errors.fullName = 'Vui lòng nhập họ và tên';
  else if (fullName.length < 2) errors.fullName = 'Họ và tên quá ngắn';
  else if (/\d/.test(fullName)) errors.fullName = 'Họ và tên không được chứa chữ số';

  if (!phone) errors.phone = 'Vui lòng nhập số điện thoại';
  else if (!VIETNAMESE_PHONE_PATTERN.test(phone)) errors.phone = 'Số điện thoại không hợp lệ (VD: 0912345678)';

  if (!email) errors.email = 'Vui lòng nhập email';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Email không hợp lệ';

  return errors;
}
