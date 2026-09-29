import { Router } from 'express';
import { z } from 'zod';
import { USER_ROLES } from '@shared/lib/permissions';
import type { PaginatedResponse, UserResponse } from '@shared/types/api';
import type { Booking, User, UserRole } from '@shared/types/domain';
import { HttpError } from '../../http/httpError';
import { getAuth, requirePermission } from '../../http/middleware/authentication';
import { parseWith } from '../../http/validation';
import type { AdminService } from './adminService';

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
};

const bookingQuerySchema = z.object({
  ...pagination,
  filter: z.enum(['all', 'confirmed', 'cancelled', 'checked-in']).default('all'),
});

const roleSchema = z.enum(USER_ROLES as [UserRole, ...UserRole[]], { error: 'Vai trò không hợp lệ' });

const userQuerySchema = z.object({ ...pagination, role: roleSchema.optional() });

const updateUserSchema = z
  .object({ role: roleSchema.optional(), isLocked: z.boolean().optional() })
  .refine((value) => value.role !== undefined || value.isLocked !== undefined, 'Không có thay đổi nào');

export function createAdminRouter({ admin }: { admin: AdminService }) {
  const router = Router();

  router.get('/stats', requirePermission('report:view'), async (_req, res) => {
    res.json(await admin.getStats());
  });

  router.get('/bookings', requirePermission('booking:view-any'), async (req, res) => {
    const query = parseWith(bookingQuerySchema, req.query);
    const { items, total } = await admin.listBookings(query);
    res.json({ items, total, page: query.page, pageSize: query.pageSize } satisfies PaginatedResponse<Booking>);
  });

  router.get('/users', requirePermission('user:manage'), async (req, res) => {
    const query = parseWith(userQuerySchema, req.query);
    const { items, total } = await admin.listUsers(query);
    res.json({ items, total, page: query.page, pageSize: query.pageSize } satisfies PaginatedResponse<User>);
  });

  router.patch('/users/:userId', requirePermission('user:manage'), async (req, res) => {
    const userId = z.uuid().safeParse(req.params.userId);
    if (!userId.success) throw HttpError.notFound('Không tìm thấy người dùng');
    const changes = parseWith(updateUserSchema, req.body);
    const user = await admin.updateUser(getAuth(req).user, userId.data, changes);
    res.json({ user } satisfies UserResponse);
  });

  return router;
}
