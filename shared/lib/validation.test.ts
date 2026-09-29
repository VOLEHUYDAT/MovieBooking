import { describe, expect, it } from 'vitest';
import { validateCustomerInfo } from './validation';

describe('validateCustomerInfo', () => {
  it('accepts valid Vietnamese contact details', () => {
    expect(validateCustomerInfo({ fullName: 'Nguyễn Văn An', phone: '0912 345 678', email: 'an@example.com' })).toEqual({});
    expect(validateCustomerInfo({ fullName: 'Lê Bình', phone: '+84987654321', email: 'binh@mail.vn' })).toEqual({});
  });

  it('reports every missing field', () => {
    expect(Object.keys(validateCustomerInfo({ fullName: ' ', phone: '', email: '' }))).toEqual(['fullName', 'phone', 'email']);
  });

  it('rejects invalid phone numbers and emails', () => {
    const errors = validateCustomerInfo({ fullName: 'An', phone: '0123456789', email: 'an@example' });
    expect(errors.phone).toBeDefined();
    expect(errors.email).toBeDefined();
  });
});
