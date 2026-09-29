import type { PaymentMethod } from '@/types/domain';

export interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  description: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    value: 'card',
    label: 'Thẻ ngân hàng',
    description: 'Thẻ ATM nội địa, Visa, Mastercard, JCB',
  },
  {
    value: 'e-wallet',
    label: 'Ví điện tử',
    description: 'Xác nhận thanh toán ngay trên ứng dụng ví',
  },
  {
    value: 'bank-transfer',
    label: 'Chuyển khoản QR',
    description: 'Quét mã VietQR bằng ứng dụng ngân hàng',
  },
];

export function getPaymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((option) => option.value === method)?.label ?? method;
}
