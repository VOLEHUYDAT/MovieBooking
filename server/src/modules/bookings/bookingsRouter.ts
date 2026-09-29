import { Router } from 'express';
import { z } from 'zod';
import { PAYMENT_METHODS } from '@shared/data/paymentMethods';
import { validateEmail, validateFullName, validatePhone } from '@shared/lib/validation';
import type { BookingListResponse, BookingResponse, HoldResponse } from '@shared/types/api';
import { HttpError } from '../../http/httpError';
import { getAuth, requireAuth, requirePermission } from '../../http/middleware/authentication';
import { parseWith, validatedString } from '../../http/validation';
import type { BookingService } from './bookingService';

const uuidSchema = z.uuid();

/** Rejects malformed IDs with 404 instead of letting them reach Postgres as invalid uuids. */
function parseId(value: unknown, notFoundMessage: string): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) throw HttpError.notFound(notFoundMessage);
  return result.data;
}

const createHoldSchema = z.object({
  showtimeId: z.string().min(1).max(200),
  seatIds: z.array(z.string().regex(/^[A-Z]\d{1,2}$/, 'Mã ghế không hợp lệ')).min(1, 'Vui lòng chọn ít nhất 1 ghế').max(20),
});

const paymentMethods = PAYMENT_METHODS.map((option) => option.value) as [string, ...string[]];

const createBookingSchema = z.object({
  holdId: z.uuid('Phiên giữ ghế không hợp lệ'),
  concessions: z.record(z.string().max(50), z.number().int()).default({}),
  promoCode: z.string().trim().max(30).nullable().default(null),
  customer: z.object({
    fullName: validatedString(validateFullName),
    email: validatedString(validateEmail),
    phone: validatedString(validatePhone),
  }),
  paymentMethod: z.enum(paymentMethods as ['card', 'e-wallet', 'bank-transfer'], { error: 'Phương thức thanh toán không hợp lệ' }),
});

export function createBookingsRouter({ bookings }: { bookings: BookingService }) {
  const router = Router();
  const canBook = requirePermission('booking:create');
  const canCheckIn = requirePermission('ticket:check-in');

  // Seat availability is public so guests can browse the seat map before signing in.
  router.get('/showtimes/:showtimeId/seats', async (req, res) => {
    res.json(await bookings.getSeatAvailability(req.params.showtimeId, req.auth?.user ?? null));
  });

  router.post('/holds', canBook, async (req, res) => {
    const input = parseWith(createHoldSchema, req.body);
    const hold = await bookings.createHold(getAuth(req).user, input);
    res.status(201).json({ hold } satisfies HoldResponse);
  });

  router.delete('/holds/:holdId', canBook, async (req, res) => {
    const holdId = parseId(req.params.holdId, 'Không tìm thấy phiên giữ ghế');
    await bookings.releaseHold(getAuth(req).user, holdId);
    res.status(204).end();
  });

  router.post('/bookings', canBook, async (req, res) => {
    const input = parseWith(createBookingSchema, req.body);
    const booking = await bookings.createBooking(getAuth(req).user, input);
    res.status(201).json({ booking } satisfies BookingResponse);
  });

  router.get('/bookings/mine', canBook, async (req, res) => {
    res.json({ bookings: await bookings.listMine(getAuth(req).user) } satisfies BookingListResponse);
  });

  // Owners, staff and admins may read a booking; the service enforces who sees what.
  router.get('/bookings/:bookingId', requireAuth, async (req, res) => {
    const bookingId = parseId(req.params.bookingId, 'Không tìm thấy vé');
    res.json({ booking: await bookings.getForActor(getAuth(req).user, bookingId) } satisfies BookingResponse);
  });

  // Owners (within the policy window) and admins may cancel; the service enforces both rules.
  router.post('/bookings/:bookingId/cancel', requireAuth, async (req, res) => {
    const bookingId = parseId(req.params.bookingId, 'Không tìm thấy vé');
    res.json({ booking: await bookings.cancel(getAuth(req).user, bookingId) } satisfies BookingResponse);
  });

  // ---- Staff: ticket check-in ----------------------------------------------------------------
  router.get('/staff/bookings/lookup', canCheckIn, async (req, res) => {
    const code = parseWith(z.string().trim().min(4, 'Vui lòng nhập mã đặt vé').max(20), req.query.code);
    res.json({ booking: await bookings.findByCode(code) } satisfies BookingResponse);
  });

  router.post('/staff/bookings/:bookingId/check-in', canCheckIn, async (req, res) => {
    const bookingId = parseId(req.params.bookingId, 'Không tìm thấy vé');
    res.json({ booking: await bookings.checkIn(getAuth(req).user, bookingId) } satisfies BookingResponse);
  });

  return router;
}
