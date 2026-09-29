import { randomBytes, randomUUID } from 'node:crypto';
import { getCinemaById } from '@shared/data/cinemas';
import { CONCESSIONS } from '@shared/data/concessions';
import { MOVIES } from '@shared/data/movies';
import { PAYMENT_METHODS } from '@shared/data/paymentMethods';
import { addDays, toDateKey } from '@shared/lib/date';
import { createSeededRandom, generateReadableCode } from '@shared/lib/random';
import { calculatePriceBreakdown, getSeatPrice } from '@shared/services/pricingService';
import { buildSeatMap } from '@shared/services/seatMapService';
import { getShowtimesForMovie } from '@shared/services/showtimeService';
import type { Booking, Seat, Showtime } from '@shared/types/domain';
import { hashPassword } from '../../modules/auth/passwordHasher';
import { createBookingRepository } from '../../modules/bookings/bookingRepository';
import { createUserRepository, type UserRecord } from '../../modules/users/userRepository';
import type { Database } from '../database';
import { DEMO_ACCOUNTS, DEMO_CUSTOMERS } from './demoAccounts';

const PAST_DAYS = 6;
const HOUR_MS = 3_600_000;

/**
 * Seeds demo accounts plus a realistic spread of bookings (past, upcoming, cancelled, checked in)
 * so every role has something to look at. Runs only when the database has no users.
 */
export async function seedDemoData(db: Database): Promise<boolean> {
  if ((await createUserRepository(db).count()) > 0) return false;

  await db.transaction(async (tx) => {
    const users = createUserRepository(tx);
    const bookings = createBookingRepository(tx);
    const random = createSeededRandom('lumina-demo-seed');
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
    const now = Date.now();

    const accounts: UserRecord[] = [];
    for (const account of DEMO_ACCOUNTS) {
      accounts.push(
        await users.create({
          id: randomUUID(),
          fullName: account.fullName,
          email: account.email,
          phone: account.phone,
          role: account.role,
          passwordHash: await hashPassword(account.password),
          createdAt: new Date(now - 30 * 24 * HOUR_MS).toISOString(),
        }),
      );
    }
    for (const customer of DEMO_CUSTOMERS) {
      accounts.push(
        await users.create({
          id: randomUUID(),
          ...customer,
          role: 'customer',
          passwordHash: await hashPassword(randomBytes(24).toString('base64url')),
          createdAt: new Date(now - Math.floor(random() * 20 + 5) * 24 * HOUR_MS).toISOString(),
        }),
      );
    }

    const staff = accounts.find((account) => account.role === 'staff')!;
    const customers = accounts.filter((account) => account.role === 'customer');
    const member = customers[0]!;
    const usedSeats = new Map<string, Set<string>>();
    const nowShowing = MOVIES.filter((movie) => movie.status === 'now-showing');

    const pickSeats = (showtime: Showtime, count: number): Seat[] => {
      const seatMap = buildSeatMap(showtime.id);
      const used = usedSeats.get(showtime.id) ?? new Set<string>();
      const rows = seatMap.rows.filter((row) => row.label !== 'J');
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const row = pick(rows);
        const start = Math.floor(random() * (row.seats.length - count));
        const candidate = row.seats.slice(start, start + count);
        const sameBlock = candidate.every((seat) => seat.blockIndex === candidate[0]!.blockIndex);
        const free = candidate.every((seat) => !seatMap.occupiedSeatIds.has(seat.id) && !used.has(seat.id));
        if (candidate.length === count && sameBlock && free) {
          candidate.forEach((seat) => used.add(seat.id));
          usedSeats.set(showtime.id, used);
          return candidate;
        }
      }
      return [];
    };

    const createBooking = async (dayOffset: number, owner: UserRecord) => {
      const dateKey = toDateKey(addDays(new Date(now), dayOffset));
      const movie = pick(nowShowing);
      const showtimes = getShowtimesForMovie(movie.id, dateKey).filter((showtime) =>
        dayOffset < 0 ? true : new Date(showtime.startsAt).getTime() > now + 3 * HOUR_MS,
      );
      if (showtimes.length === 0) return;

      const showtime = pick(showtimes);
      const cinema = getCinemaById(showtime.cinemaId)!;
      const seats = pickSeats(showtime, 1 + Math.floor(random() * 3));
      if (seats.length === 0) return;

      const concessionQuantities: Record<string, number> = {};
      if (random() < 0.6) concessionQuantities[pick(CONCESSIONS).id] = 1 + Math.floor(random() * 2);

      const startsAt = new Date(showtime.startsAt).getTime();
      const createdAt = Math.min(now - HOUR_MS, startsAt - (2 + Math.floor(random() * 40)) * HOUR_MS);
      const isPast = new Date(showtime.endsAt).getTime() < now;
      const isCancelled = random() < 0.12;
      const pricing = calculatePriceBreakdown({ seats, showtime, concessionQuantities, promotion: null });

      const booking: Booking = {
        id: randomUUID(),
        code: `LMN${generateReadableCode(7)}`,
        userId: owner.id,
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
        concessions: Object.entries(concessionQuantities).map(([itemId, quantity]) => {
          const item = CONCESSIONS.find((concession) => concession.id === itemId)!;
          return { id: item.id, name: item.name, quantity, unitPrice: item.price };
        }),
        customer: { fullName: owner.fullName, email: owner.email, phone: owner.phone },
        paymentMethod: pick(PAYMENT_METHODS).value,
        promoCode: null,
        pricing,
        status: isCancelled ? 'cancelled' : 'confirmed',
        createdAt: new Date(createdAt).toISOString(),
        cancelledAt: isCancelled ? new Date(createdAt + HOUR_MS).toISOString() : null,
        cancelledBy: isCancelled ? owner.id : null,
        checkedInAt: !isCancelled && isPast ? new Date(startsAt - 15 * 60_000).toISOString() : null,
        checkedInBy: !isCancelled && isPast ? staff.id : null,
      };
      await bookings.insert(booking);
    };

    for (let dayOffset = -PAST_DAYS; dayOffset <= 2; dayOffset += 1) {
      const bookingsToday = dayOffset <= 0 ? 3 + Math.floor(random() * 4) : 2;
      for (let index = 0; index < bookingsToday; index += 1) await createBooking(dayOffset, pick(customers));
    }
    // Guarantee the member account has upcoming and past tickets to explore.
    await createBooking(1, member);
    await createBooking(2, member);
    await createBooking(-2, member);
  });

  return true;
}
