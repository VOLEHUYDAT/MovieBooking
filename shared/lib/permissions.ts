import type { UserRole } from '../types/domain';

/** Fine-grained capabilities; roles are bundles of permissions (checked on both client and server). */
export type Permission =
  | 'booking:create'
  | 'booking:view-any'
  | 'booking:cancel-any'
  | 'ticket:check-in'
  | 'user:manage'
  | 'report:view';

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  customer: ['booking:create'],
  staff: ['booking:create', 'booking:view-any', 'ticket:check-in'],
  admin: ['booking:create', 'booking:view-any', 'booking:cancel-any', 'ticket:check-in', 'user:manage', 'report:view'],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const USER_ROLES: readonly UserRole[] = ['customer', 'staff', 'admin'];

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'Khách hàng',
  staff: 'Nhân viên',
  admin: 'Quản trị viên',
};
