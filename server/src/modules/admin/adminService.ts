import type { AdminStatsResponse, UpdateUserRequest } from '@shared/types/api';
import type { User } from '@shared/types/domain';
import { addDays, CINEMA_TIME_ZONE, toDateKey } from '@shared/lib/date';
import type { Database } from '../../db/database';
import { HttpError } from '../../http/httpError';
import type { SessionService } from '../auth/sessionService';
import { createBookingRepository, type AdminBookingQuery } from '../bookings/bookingRepository';
import { createUserRepository, toPublicUser, type UserListQuery } from '../users/userRepository';

const REPORT_DAYS = 7;

export function createAdminService(db: Database, sessions: SessionService) {
  return {
    async getStats(): Promise<AdminStatsResponse> {
      const { rows: totalsRows } = await db.query<AdminStatsResponse['totals']>(`
        select
          coalesce(sum(total) filter (where status = 'confirmed'), 0)::float8 as "revenue",
          (select count(*)::int from booking_seats where is_active) as "ticketsSold",
          count(*) filter (where status = 'confirmed')::int as "confirmedBookings",
          count(*) filter (where status = 'cancelled')::int as "cancelledBookings",
          count(*) filter (where checked_in_at is not null)::int as "checkedInBookings",
          (select count(*)::int from app_users where role = 'customer') as "customers"
        from bookings`);

      const { rows: dayRows } = await db.query<{ date: string; revenue: number; tickets: number }>(
        `select to_char(b.created_at at time zone '${CINEMA_TIME_ZONE}', 'YYYY-MM-DD') as date,
                sum(b.total)::float8 as revenue,
                sum((select count(*) from booking_seats s where s.booking_id = b.id))::int as tickets
           from bookings b
          where b.status = 'confirmed' and b.created_at >= now() - interval '${REPORT_DAYS} days'
          group by 1`,
      );

      const revenueByDate = new Map(dayRows.map((row) => [row.date, row]));
      const revenueByDay = Array.from({ length: REPORT_DAYS }, (_, index) => {
        const date = toDateKey(addDays(new Date(), index - (REPORT_DAYS - 1)));
        const row = revenueByDate.get(date);
        return { date, label: `${date.slice(8, 10)}/${date.slice(5, 7)}`, revenue: row?.revenue ?? 0, tickets: row?.tickets ?? 0 };
      });

      const { rows: movieRows } = await db.query<{ movie_id: string; movie_title: string; revenue: number; tickets: number }>(
        `select b.movie_id, b.movie_title, sum(b.total)::float8 as revenue,
                sum((select count(*) from booking_seats s where s.booking_id = b.id))::int as tickets
           from bookings b
          where b.status = 'confirmed'
          group by b.movie_id, b.movie_title
          order by revenue desc
          limit 8`,
      );

      return {
        totals: totalsRows[0]!,
        revenueByDay,
        revenueByMovie: movieRows.map((row) => ({
          movieId: row.movie_id,
          label: row.movie_title,
          revenue: row.revenue,
          tickets: row.tickets,
        })),
        recentBookings: await createBookingRepository(db).listRecent(6),
      };
    },

    listBookings(query: AdminBookingQuery) {
      return createBookingRepository(db).listForAdmin(query);
    },

    listUsers(query: UserListQuery) {
      return createUserRepository(db).list(query);
    },

    async updateUser(actor: User, userId: string, changes: UpdateUserRequest): Promise<User> {
      if (actor.id === userId) {
        throw HttpError.conflict('Bạn không thể thay đổi quyền hoặc khóa chính tài khoản của mình');
      }

      const updated = await db.transaction(async (tx) => {
        const users = createUserRepository(tx);
        // Serialize admin-role changes so two admins cannot demote each other simultaneously.
        await tx.query(`select pg_advisory_xact_lock(hashtext('admin-roles'))`);
        const target = await users.findById(userId);
        if (!target) throw HttpError.notFound('Không tìm thấy người dùng');

        const losesAdminAccess =
          target.role === 'admin' && !target.isLocked && ((changes.role && changes.role !== 'admin') || changes.isLocked === true);
        if (losesAdminAccess && (await users.countActiveAdmins()) <= 1) {
          throw HttpError.conflict('Hệ thống cần ít nhất 1 quản trị viên đang hoạt động');
        }
        return users.updateAccess(userId, changes);
      });

      // Locked accounts are signed out everywhere immediately.
      if (changes.isLocked) await sessions.revokeAllForUser(userId);
      return toPublicUser(updated);
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
