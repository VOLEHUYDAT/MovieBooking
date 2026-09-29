import type {
  BookedConcession,
  BookedSeat,
  Booking,
  BookingStatus,
  PaymentMethod,
  ScreenFormat,
} from '@shared/types/domain';
import type { Queryable } from '../../db/database';

interface BookingRow {
  id: string;
  code: string;
  user_id: string | null;
  showtime_id: string;
  movie_id: string;
  cinema_id: string;
  movie_title: string;
  cinema_name: string;
  cinema_address: string;
  auditorium: string;
  format: ScreenFormat;
  starts_at: Date;
  ends_at: Date;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_method: PaymentMethod;
  promo_code: string | null;
  ticket_subtotal: number;
  concession_subtotal: number;
  discount: number;
  total: number;
  status: BookingStatus;
  created_at: Date;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  checked_in_at: Date | null;
  checked_in_by: string | null;
  seats: BookedSeat[] | null;
  concessions: BookedConcession[] | null;
}

const BOOKING_SELECT = `
  select b.*,
    (select json_agg(json_build_object('id', s.seat_id, 'label', s.seat_label, 'type', s.seat_type, 'price', s.price))
       from booking_seats s where s.booking_id = b.id) as seats,
    (select json_agg(json_build_object('id', c.item_id, 'name', c.item_name, 'quantity', c.quantity, 'unitPrice', c.unit_price))
       from booking_concessions c where c.booking_id = b.id) as concessions
  from bookings b`;

const toIso = (value: Date | null) => (value ? new Date(value).toISOString() : null);

function compareSeatLabels(a: BookedSeat, b: BookedSeat): number {
  return a.label.charAt(0).localeCompare(b.label.charAt(0)) || Number(a.label.slice(1)) - Number(b.label.slice(1));
}

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    code: row.code,
    userId: row.user_id,
    showtimeId: row.showtime_id,
    movieId: row.movie_id,
    cinemaId: row.cinema_id,
    movieTitle: row.movie_title,
    cinemaName: row.cinema_name,
    cinemaAddress: row.cinema_address,
    auditorium: row.auditorium,
    format: row.format,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    seats: [...(row.seats ?? [])].sort(compareSeatLabels),
    concessions: [...(row.concessions ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    customer: { fullName: row.customer_name, email: row.customer_email, phone: row.customer_phone },
    paymentMethod: row.payment_method,
    promoCode: row.promo_code,
    pricing: {
      ticketSubtotal: row.ticket_subtotal,
      concessionSubtotal: row.concession_subtotal,
      discount: row.discount,
      total: row.total,
    },
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    cancelledAt: toIso(row.cancelled_at),
    cancelledBy: row.cancelled_by,
    checkedInAt: toIso(row.checked_in_at),
    checkedInBy: row.checked_in_by,
  };
}

export type AdminBookingFilter = 'all' | 'confirmed' | 'cancelled' | 'checked-in';

export interface AdminBookingQuery {
  search?: string;
  filter: AdminBookingFilter;
  page: number;
  pageSize: number;
}

export function createBookingRepository(db: Queryable) {
  return {
    async insert(booking: Booking): Promise<void> {
      await db.query(
        `insert into bookings (
           id, code, user_id, showtime_id, movie_id, cinema_id, movie_title, cinema_name, cinema_address,
           auditorium, format, starts_at, ends_at, customer_name, customer_email, customer_phone,
           payment_method, promo_code, ticket_subtotal, concession_subtotal, discount, total,
           status, created_at, cancelled_at, cancelled_by, checked_in_at, checked_in_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)`,
        [
          booking.id,
          booking.code,
          booking.userId,
          booking.showtimeId,
          booking.movieId,
          booking.cinemaId,
          booking.movieTitle,
          booking.cinemaName,
          booking.cinemaAddress,
          booking.auditorium,
          booking.format,
          booking.startsAt,
          booking.endsAt,
          booking.customer.fullName,
          booking.customer.email,
          booking.customer.phone,
          booking.paymentMethod,
          booking.promoCode,
          booking.pricing.ticketSubtotal,
          booking.pricing.concessionSubtotal,
          booking.pricing.discount,
          booking.pricing.total,
          booking.status,
          booking.createdAt,
          booking.cancelledAt,
          booking.cancelledBy,
          booking.checkedInAt,
          booking.checkedInBy,
        ],
      );

      for (const seat of booking.seats) {
        await db.query(
          `insert into booking_seats (booking_id, showtime_id, seat_id, seat_label, seat_type, price, is_active)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [booking.id, booking.showtimeId, seat.id, seat.label, seat.type, seat.price, booking.status === 'confirmed'],
        );
      }

      for (const item of booking.concessions) {
        await db.query(
          `insert into booking_concessions (booking_id, item_id, item_name, quantity, unit_price)
           values ($1, $2, $3, $4, $5)`,
          [booking.id, item.id, item.name, item.quantity, item.unitPrice],
        );
      }
    },

    async codeExists(code: string): Promise<boolean> {
      const { rows } = await db.query('select 1 from bookings where code = $1', [code]);
      return rows.length > 0;
    },

    async findById(id: string, options: { forUpdate?: boolean } = {}): Promise<Booking | null> {
      if (options.forUpdate) await db.query('select id from bookings where id = $1 for update', [id]);
      const { rows } = await db.query<BookingRow>(`${BOOKING_SELECT} where b.id = $1`, [id]);
      return rows[0] ? toBooking(rows[0]) : null;
    },

    async findByCode(code: string): Promise<Booking | null> {
      const { rows } = await db.query<BookingRow>(`${BOOKING_SELECT} where b.code = $1`, [code]);
      return rows[0] ? toBooking(rows[0]) : null;
    },

    async listByUser(userId: string): Promise<Booking[]> {
      const { rows } = await db.query<BookingRow>(`${BOOKING_SELECT} where b.user_id = $1 order by b.starts_at desc`, [
        userId,
      ]);
      return rows.map(toBooking);
    },

    async listRecent(limit: number): Promise<Booking[]> {
      const { rows } = await db.query<BookingRow>(`${BOOKING_SELECT} order by b.created_at desc limit $1`, [limit]);
      return rows.map(toBooking);
    },

    async listForAdmin(query: AdminBookingQuery): Promise<{ items: Booking[]; total: number }> {
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (query.search) {
        params.push(`%${query.search}%`);
        const p = `$${params.length}`;
        conditions.push(`(b.code ilike ${p} or b.customer_name ilike ${p} or b.customer_email ilike ${p} or b.movie_title ilike ${p})`);
      }
      if (query.filter === 'confirmed') conditions.push(`b.status = 'confirmed' and b.checked_in_at is null`);
      if (query.filter === 'cancelled') conditions.push(`b.status = 'cancelled'`);
      if (query.filter === 'checked-in') conditions.push('b.checked_in_at is not null');
      const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';

      const { rows: countRows } = await db.query<{ total: number }>(
        `select count(*)::int as total from bookings b ${where}`,
        params,
      );
      const { rows } = await db.query<BookingRow>(
        `${BOOKING_SELECT} ${where} order by b.created_at desc limit $${params.length + 1} offset $${params.length + 2}`,
        [...params, query.pageSize, (query.page - 1) * query.pageSize],
      );
      return { items: rows.map(toBooking), total: countRows[0]?.total ?? 0 };
    },

    async markCancelled(id: string, actorId: string): Promise<void> {
      await db.query(
        `update bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = $2 where id = $1`,
        [id, actorId],
      );
      await db.query('update booking_seats set is_active = false where booking_id = $1', [id]);
    },

    async markCheckedIn(id: string, actorId: string): Promise<void> {
      await db.query('update bookings set checked_in_at = now(), checked_in_by = $2 where id = $1', [id, actorId]);
    },

    async listActiveSeatIds(showtimeId: string): Promise<string[]> {
      const { rows } = await db.query<{ seat_id: string }>(
        'select seat_id from booking_seats where showtime_id = $1 and is_active',
        [showtimeId],
      );
      return rows.map((row) => row.seat_id);
    },
  };
}

export type BookingRepository = ReturnType<typeof createBookingRepository>;
