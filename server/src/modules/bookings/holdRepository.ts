import type { SeatHold } from '@shared/types/api';
import type { Queryable } from '../../db/database';

interface HoldRow {
  id: string;
  user_id: string;
  showtime_id: string;
  seat_ids: string[];
  expires_at: Date;
}

function toSeatHold(row: HoldRow): SeatHold {
  return {
    id: row.id,
    showtimeId: row.showtime_id,
    seatIds: row.seat_ids,
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

export function createHoldRepository(db: Queryable) {
  return {
    async insert(hold: { id: string; userId: string; showtimeId: string; seatIds: string[]; expiresAt: Date }) {
      const { rows } = await db.query<HoldRow>(
        `insert into seat_holds (id, user_id, showtime_id, seat_ids, expires_at)
         values ($1, $2, $3, $4::jsonb, $5)
         returning id, user_id, showtime_id, seat_ids, expires_at`,
        [hold.id, hold.userId, hold.showtimeId, JSON.stringify(hold.seatIds), hold.expiresAt],
      );
      return toSeatHold(rows[0]!);
    },

    async findActiveForUser(userId: string, showtimeId: string): Promise<SeatHold | null> {
      const { rows } = await db.query<HoldRow>(
        `select id, user_id, showtime_id, seat_ids, expires_at from seat_holds
          where user_id = $1 and showtime_id = $2 and expires_at > now()`,
        [userId, showtimeId],
      );
      return rows[0] ? toSeatHold(rows[0]) : null;
    },

    async findShowtimeId(holdId: string, userId: string): Promise<string | null> {
      const { rows } = await db.query<{ showtime_id: string }>(
        'select showtime_id from seat_holds where id = $1 and user_id = $2',
        [holdId, userId],
      );
      return rows[0]?.showtime_id ?? null;
    },

    /** Returns the hold only if it belongs to the user; locks the row for the rest of the transaction. */
    async findOwnedForUpdate(holdId: string, userId: string): Promise<(SeatHold & { isExpired: boolean }) | null> {
      const { rows } = await db.query<HoldRow & { is_expired: boolean }>(
        `select id, user_id, showtime_id, seat_ids, expires_at, expires_at <= now() as is_expired
           from seat_holds where id = $1 and user_id = $2 for update`,
        [holdId, userId],
      );
      const row = rows[0];
      return row ? { ...toSeatHold(row), isExpired: row.is_expired } : null;
    },

    /** Seat IDs held by other customers (active holds only). */
    async listHeldSeatIds(showtimeId: string, excludeUserId: string | null): Promise<string[]> {
      const { rows } = await db.query<{ seat_ids: string[] }>(
        `select seat_ids from seat_holds
          where showtime_id = $1 and expires_at > now() and ($2::uuid is null or user_id <> $2::uuid)`,
        [showtimeId, excludeUserId],
      );
      return rows.flatMap((row) => row.seat_ids);
    },

    async deleteForUser(userId: string, showtimeId: string): Promise<void> {
      await db.query('delete from seat_holds where user_id = $1 and showtime_id = $2', [userId, showtimeId]);
    },

    async deleteById(holdId: string, userId: string): Promise<boolean> {
      const { rowCount } = await db.query('delete from seat_holds where id = $1 and user_id = $2', [holdId, userId]);
      return rowCount > 0;
    },

    async deleteExpired(): Promise<number> {
      const { rowCount } = await db.query('delete from seat_holds where expires_at <= now()');
      return rowCount;
    },
  };
}

export type HoldRepository = ReturnType<typeof createHoldRepository>;
