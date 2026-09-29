import { describe, expect, it } from 'vitest';
import { getHomePath, getMainNav, resolvePostLoginPath } from './navigation';

describe('role navigation', () => {
  it('shows each role only its own pages', () => {
    const labels = (role: Parameters<typeof getMainNav>[0]) => getMainNav(role).map((item) => item.label);
    expect(labels(null)).toEqual(['Phim', 'Rạp chiếu']);
    expect(labels('customer')).toEqual(['Phim', 'Rạp chiếu', 'Vé của tôi']);
    expect(labels('staff')).toEqual(['Soát vé']);
    expect(labels('admin')).toEqual(['Tổng quan', 'Đặt vé', 'Người dùng', 'Soát vé']);
  });

  it('sends each role to its own home after login', () => {
    expect(resolvePostLoginPath('/', 'customer')).toBe('/');
    expect(resolvePostLoginPath('/', 'staff')).toBe(getHomePath('staff'));
    expect(resolvePostLoginPath('/', 'admin')).toBe(getHomePath('admin'));
  });

  it('keeps requested pages that belong to the role', () => {
    expect(resolvePostLoginPath('/booking/abc/seats', 'customer')).toBe('/booking/abc/seats');
    expect(resolvePostLoginPath('/admin/users', 'admin')).toBe('/admin/users');
    expect(resolvePostLoginPath('/tickets/123', 'staff')).toBe('/tickets/123');
  });

  it('redirects requests for another role area to the home page', () => {
    expect(resolvePostLoginPath('/booking/abc/seats', 'admin')).toBe('/admin');
    expect(resolvePostLoginPath('/tickets', 'staff')).toBe('/staff/check-in');
    expect(resolvePostLoginPath('/admin', 'customer')).toBe('/');
    expect(resolvePostLoginPath('/staff/check-in', 'customer')).toBe('/');
  });
});
