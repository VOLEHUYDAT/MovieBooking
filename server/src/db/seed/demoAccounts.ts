import type { UserRole } from '@shared/types/domain';

/**
 * Demo accounts created on first start in development (SEED_DEMO_DATA=true).
 * These credentials are public in the README: never enable seeding on a real deployment.
 */
export interface DemoAccount {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  password: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { fullName: 'Quản Trị Viên', email: 'admin@lumina.example', phone: '0901000001', role: 'admin', password: 'Admin@123' },
  { fullName: 'Nhân Viên Soát Vé', email: 'staff@lumina.example', phone: '0901000002', role: 'staff', password: 'Staff@123' },
  { fullName: 'Nguyễn Minh Anh', email: 'member@lumina.example', phone: '0901000003', role: 'customer', password: 'Member@123' },
];

/** Additional customers that only exist to populate reports; they have random passwords. */
export const DEMO_CUSTOMERS = [
  { fullName: 'Trần Bảo Ngọc', email: 'ngoc.tran@lumina.example', phone: '0912000001' },
  { fullName: 'Lê Quốc Huy', email: 'huy.le@lumina.example', phone: '0912000002' },
  { fullName: 'Phạm Thu Trang', email: 'trang.pham@lumina.example', phone: '0912000003' },
];
