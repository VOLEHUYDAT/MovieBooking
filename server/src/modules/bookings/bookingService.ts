import { randomInt, randomUUID } from 'node:crypto';
import { getCinemaById } from '@shared/data/cinemas';
import { getConcessionById, MAX_CONCESSION_QUANTITY } from '@shared/data/concessions';
import { getMovieById } from '@shared/data/movies';
import { findPromotion } from '@shared/data/promotions';
import { hasPermission } from '@shared/lib/permissions';
import { normalizeEmail, normalizePhone } from '@shared/lib/validation';
import {
  canCancelBooking,
  CANCELLATION_WINDOW_HOURS,
  getCheckInEligibility,
  SEAT_HOLD_DURATION_MS,
} from '@shared/services/bookingPolicy';
import { calculatePriceBreakdown, evaluatePromotion, getSeatPrice } from '@shared/services/pricingService';
import { buildSeatMap, getSeatById } from '@shared/services/seatMapService';
import { findStrandedSeats, MAX_SEATS_PER_BOOKING } from '@shared/services/seatSelectionRules';
import { getShowtimeById, isShowtimeBookable } from '@shared/services/showtimeService';
import type { CreateBookingRequest, CreateHoldRequest, SeatAvailabilityResponse, SeatHold } from '@shared/types/api';
import type { Booking, Seat, Showtime, User } from '@shared/types/domain';
import type { Database, Queryable } from '../../db/database';
import { HttpError } from '../../http/httpError';
import { createBookingRepository } from './bookingRepository';
import { createHoldRepository } from './holdRepository';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface BookingServiceOptions {
  /** Treat deterministic "walk-in" sales as occupied seats (demo realism). */
  simulatedOccupancy: boolean;
}

function requireShowtime(showtimeId: string): Showtime {
  const showtime = getShowtimeById(showtimeId);
  if (!showtime) throw HttpError.notFound('Không tìm thấy suất chiếu');
  return showtime;
}

function assertBookable(showtime: Showtime): void {
  if (!isShowtimeBookable(showtime)) {
    throw HttpError.conflict('Suất chiếu đã đóng bán vé trực tuyến', 'SHOWTIME_CLOSED');
  }
}

/** Serializes all seat-changing work for one showtime (holds and bookings) within a transaction. */
async function lockShowtime(tx: Queryable, showtimeId: string): Promise<void> {
  await tx.query('select pg_advisory_xact_lock(hashtext($1))', [showtimeId]);
}

function generateBookingCode(): string {
  return `LMN${Array.from({ length: 7 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')}`;
}

export function createBookingService(db: Database, options: BookingServiceOptions) {
  async function getUnavailableSeatIds(tx: Queryable, showtimeId: string, excludeUserId: string | null) {
    const unavailable = new Set<string>(options.simulatedOccupancy ? buildSeatMap(showtimeId).occupiedSeatIds : []);
    for (const seatId of await createBookingRepository(tx).listActiveSeatIds(showtimeId)) unavailable.add(seatId);
    for (const seatId of await createHoldRepository(tx).listHeldSeatIds(showtimeId, excludeUserId)) unavailable.add(seatId);
    return unavailable;
  }

  function canView(actor: User, booking: Booking): boolean {
    return booking.userId === actor.id || hasPermission(actor.role, 'booking:view-any');
  }

  return {
    async getSeatAvailability(showtimeId: string, viewer: User | null): Promise<SeatAvailabilityResponse> {
      requireShowtime(showtimeId);
      const unavailable = await getUnavailableSeatIds(db, showtimeId, viewer?.id ?? null);
      const myHold = viewer ? await createHoldRepository(db).findActiveForUser(viewer.id, showtimeId) : null;
      return { showtimeId, unavailableSeatIds: [...unavailable].sort(), myHold };
    },

    async createHold(user: User, input: CreateHoldRequest): Promise<SeatHold> {
      const showtime = requireShowtime(input.showtimeId);
      assertBookable(showtime);

      const seatIds = [...new Set(input.seatIds)];
      if (seatIds.length === 0) throw HttpError.badRequest('Vui lòng chọn ít nhất 1 ghế');
      if (seatIds.length > MAX_SEATS_PER_BOOKING) {
        throw HttpError.badRequest(`Chỉ được chọn tối đa ${MAX_SEATS_PER_BOOKING} ghế cho mỗi lần đặt`);
      }
      const unknownSeat = seatIds.find((seatId) => !getSeatById(seatId));
      if (unknownSeat) throw HttpError.badRequest(`Ghế ${unknownSeat} không tồn tại`);

      return db.transaction(async (tx) => {
        await lockShowtime(tx, showtime.id);
        const holds = createHoldRepository(tx);
        await holds.deleteForUser(user.id, showtime.id);

        const unavailable = await getUnavailableSeatIds(tx, showtime.id, user.id);
        const taken = seatIds.filter((seatId) => unavailable.has(seatId));
        if (taken.length > 0) {
          throw HttpError.conflict(`Ghế ${taken.join(', ')} vừa có người khác chọn. Vui lòng chọn ghế khác`, 'SEATS_UNAVAILABLE');
        }

        const stranded = findStrandedSeats({ ...buildSeatMap(showtime.id), occupiedSeatIds: unavailable }, new Set(seatIds));
        if (stranded.length > 0) {
          throw HttpError.badRequest(`Không được để trống ghế lẻ: ${stranded.map((seat) => seat.label).join(', ')}`);
        }

        return holds.insert({
          id: randomUUID(),
          userId: user.id,
          showtimeId: showtime.id,
          seatIds,
          expiresAt: new Date(Date.now() + SEAT_HOLD_DURATION_MS),
        });
      });
    },

    async releaseHold(user: User, holdId: string): Promise<void> {
      await createHoldRepository(db).deleteById(holdId, user.id);
    },

    async createBooking(user: User, input: CreateBookingRequest): Promise<Booking> {
      for (const [itemId, quantity] of Object.entries(input.concessions)) {
        if (!getConcessionById(itemId)) throw HttpError.badRequest(`Món ${itemId} không tồn tại`);
        if (quantity < 1 || quantity > MAX_CONCESSION_QUANTITY) {
          throw HttpError.badRequest(`Số lượng mỗi món từ 1 đến ${MAX_CONCESSION_QUANTITY}`);
        }
      }

      return db.transaction(async (tx) => {
        const holds = createHoldRepository(tx);
        const bookings = createBookingRepository(tx);

        const holdExpired = () => HttpError.conflict('Hết thời gian giữ ghế. Vui lòng chọn lại ghế', 'HOLD_EXPIRED');

        // Take the showtime lock before row locks (same order as createHold) to avoid deadlocks.
        const heldShowtimeId = await holds.findShowtimeId(input.holdId, user.id);
        if (!heldShowtimeId) throw holdExpired();
        await lockShowtime(tx, heldShowtimeId);

        const hold = await holds.findOwnedForUpdate(input.holdId, user.id);
        if (!hold || hold.isExpired) {
          if (hold) await holds.deleteById(hold.id, user.id);
          throw holdExpired();
        }

        const showtime = requireShowtime(hold.showtimeId);
        assertBookable(showtime);

        const movie = getMovieById(showtime.movieId);
        const cinema = getCinemaById(showtime.cinemaId);
        if (!movie || !cinema) throw HttpError.notFound('Không tìm thấy suất chiếu');

        const seats = hold.seatIds.map(getSeatById).filter((seat): seat is Seat => seat !== undefined);
        const promotion = input.promoCode ? findPromotion(input.promoCode) : undefined;
        if (input.promoCode && !promotion) {
          throw new HttpError(422, 'PROMOTION_INVALID', 'Mã khuyến mãi không tồn tại hoặc đã hết hạn');
        }

        const pricing = calculatePriceBreakdown({
          seats,
          showtime,
          concessionQuantities: input.concessions,
          promotion: promotion ?? null,
        });
        if (promotion) {
          const evaluation = evaluatePromotion(promotion, pricing);
          if (!evaluation.isValid) throw new HttpError(422, 'PROMOTION_INVALID', evaluation.reason);
        }

        let code = generateBookingCode();
        while (await bookings.codeExists(code)) code = generateBookingCode();

        const booking: Booking = {
          id: randomUUID(),
          code,
          userId: user.id,
          showtimeId: showtime.id,
          movieId: movie.id,
          cinemaId: cinema.id,
          movieTitle: movie.title,
          cinemaName: cinema.name,
          cinemaAddress: cinema.address,
          auditorium: showtime.auditorium,
          format: showtime.format,
          startsAt: showtime.startsAt,
          endsAt: showtime.endsAt,
          seats: seats.map((seat) => ({ id: seat.id, label: seat.label, type: seat.type, price: getSeatPrice(seat.type, showtime) })),
          concessions: Object.entries(input.concessions).map(([itemId, quantity]) => {
            const item = getConcessionById(itemId)!;
            return { id: item.id, name: item.name, quantity, unitPrice: item.price };
          }),
          customer: {
            fullName: input.customer.fullName.trim(),
            email: normalizeEmail(input.customer.email),
            phone: normalizePhone(input.customer.phone),
          },
          paymentMethod: input.paymentMethod,
          promoCode: pricing.discount > 0 && promotion ? promotion.code : null,
          pricing,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          cancelledAt: null,
          cancelledBy: null,
          checkedInAt: null,
          checkedInBy: null,
        };

        // The partial unique index on booking_seats is the final guard against double booking.
        await bookings.insert(booking);
        await holds.deleteById(hold.id, user.id);
        return booking;
      });
    },

    async listMine(user: User): Promise<Booking[]> {
      return createBookingRepository(db).listByUser(user.id);
    },

    async getForActor(actor: User, bookingId: string): Promise<Booking> {
      const booking = await createBookingRepository(db).findById(bookingId);
      // Respond 404 (not 403) so booking IDs of other customers cannot be probed.
      if (!booking || !canView(actor, booking)) throw HttpError.notFound('Không tìm thấy vé');
      return booking;
    },

    async cancel(actor: User, bookingId: string): Promise<Booking> {
      return db.transaction(async (tx) => {
        const bookings = createBookingRepository(tx);
        const booking = await bookings.findById(bookingId, { forUpdate: true });
        const isAdmin = hasPermission(actor.role, 'booking:cancel-any');
        if (!booking || (booking.userId !== actor.id && !isAdmin)) throw HttpError.notFound('Không tìm thấy vé');

        if (!canCancelBooking(booking, new Date(), { isAdmin })) {
          const reason =
            booking.status === 'cancelled'
              ? 'Vé đã được hủy trước đó'
              : booking.checkedInAt
                ? 'Vé đã soát không thể hủy'
                : isAdmin
                  ? 'Suất chiếu đã bắt đầu, không thể hủy vé'
                  : `Chỉ có thể hủy vé trước giờ chiếu ${CANCELLATION_WINDOW_HOURS} tiếng`;
          throw HttpError.conflict(reason);
        }

        await bookings.markCancelled(booking.id, actor.id);
        return (await bookings.findById(booking.id))!;
      });
    },

    async findByCode(code: string): Promise<Booking> {
      const booking = await createBookingRepository(db).findByCode(code.trim().toUpperCase());
      if (!booking) throw HttpError.notFound(`Không tìm thấy vé với mã ${code.trim().toUpperCase()}`);
      return booking;
    },

    async checkIn(actor: User, bookingId: string): Promise<Booking> {
      return db.transaction(async (tx) => {
        const bookings = createBookingRepository(tx);
        const booking = await bookings.findById(bookingId, { forUpdate: true });
        if (!booking) throw HttpError.notFound('Không tìm thấy vé');

        const eligibility = getCheckInEligibility(booking);
        if (!eligibility.canCheckIn) throw HttpError.conflict(eligibility.reason);

        await bookings.markCheckedIn(booking.id, actor.id);
        return (await bookings.findById(booking.id))!;
      });
    },

    async cleanupExpiredHolds(): Promise<number> {
      return createHoldRepository(db).deleteExpired();
    },
  };
}

export type BookingService = ReturnType<typeof createBookingService>;
