import { Outlet, useLocation } from 'react-router';

const PAGE_HEADINGS: Record<string, { title: string; description: string }> = {
  '/admin': { title: 'Tổng quan', description: 'Doanh thu, vé bán và hoạt động đặt vé gần đây.' },
  '/admin/bookings': { title: 'Quản lý đặt vé', description: 'Tra cứu, lọc và hủy đơn đặt vé của khách hàng.' },
  '/admin/users': { title: 'Quản lý người dùng', description: 'Phân quyền và khóa/mở khóa tài khoản.' },
};

/** Back-office shell; section navigation lives in the header for admins. */
export function AdminLayout() {
  const { pathname } = useLocation();
  const heading = PAGE_HEADINGS[pathname.replace(/\/$/, '')] ?? PAGE_HEADINGS['/admin']!;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">Quản trị</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">{heading.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{heading.description}</p>
      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
