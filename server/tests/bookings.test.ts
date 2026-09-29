import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSeatPrice } from '@shared/services/pricingService';
import type { Showtime } from '@shared/types/domain';
import { createTestContext, findBookableShowtime, signInAs, validCustomer, type TestClient, type TestContext } from './helpers/testContext';

let context: TestContext;
let showtime: Showtime;

beforeAll(async () => {
  context = await createTestContext();
  showtime = findBookableShowtime();
});

afterAll(async () => {
  await context.close();
});

async function holdSeats(client: TestClient, seatIds: string[], showtimeId = showtime.id) {
  return client.post('/api/holds', { showtimeId, seatIds });
}

async function book(client: TestClient, seatIds: string[], extra: Record<string, unknown> = {}) {
  const hold = await holdSeats(client, seatIds);
  expect(hold.status).toBe(201);
  return client.post('/api/bookings', {
    holdId: hold.body.hold.id,
    concessions: {},
    promoCode: null,
    customer: validCustomer,
    paymentMethod: 'e-wallet',
    ...extra,
  });
}

describe('seat availability and holds', () => {
  it('lets guests read availability but not hold seats', async () => {
    const availability = await request(context.app).get(`/api/showtimes/${showtime.id}/seats`);
    expect(availability.status).toBe(200);
    expect(availability.body).toMatchObject({ showtimeId: showtime.id, myHold: null });

    const hold = await request(context.app)
      .post('/api/holds')
      .set('x-requested-with', 'lumina-web')
      .send({ showtimeId: showtime.id, seatIds: ['A1'] });
    expect(hold.status).toBe(401);
  });

  it('blocks seats held by another customer', async () => {
    const alice = await signInAs(context, 'customer');
    const bob = await signInAs(context, 'customer');

    const aliceHold = await holdSeats(alice.client, ['C6', 'C7']);
    expect(aliceHold.status).toBe(201);

    const bobView = await bob.client.get(`/api/showtimes/${showtime.id}/seats`);
    expect(bobView.body.unavailableSeatIds).toEqual(expect.arrayContaining(['C6', 'C7']));

    const aliceView = await alice.client.get(`/api/showtimes/${showtime.id}/seats`);
    expect(aliceView.body.unavailableSeatIds).not.toContain('C6');
    expect(aliceView.body.myHold.seatIds).toEqual(['C6', 'C7']);

    const bobHold = await holdSeats(bob.client, ['C7', 'C8']);
    expect(bobHold.status).toBe(409);
    expect(bobHold.body.error.code).toBe('SEATS_UNAVAILABLE');

    // Releasing the hold frees the seats.
    expect((await alice.client.delete(`/api/holds/${aliceHold.body.hold.id}`)).status).toBe(204);
    expect((await holdSeats(bob.client, ['C7', 'C8'])).status).toBe(201);
  });

  it('enforces the stranded-seat rule on the server', async () => {
    const { client } = await signInAs(context, 'customer');
    const response = await holdSeats(client, ['B5']); // strands B4 against the aisle
    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain('B4');
  });

  it('rejects unknown seats and too many seats', async () => {
    const { client } = await signInAs(context, 'customer');
    expect((await holdSeats(client, ['Z1'])).status).toBe(422);
    const nine = ['E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'F4'];
    expect((await holdSeats(client, nine)).status).toBe(422);
  });
});

describe('bookings', () => {
  it('creates a booking with server-side pricing and promotions', async () => {
    const { client, user } = await signInAs(context, 'customer');
    const response = await book(client, ['D6', 'D7'], {
      concessions: { 'combo-couple': 1 },
      promoCode: 'lumina10',
    });

    expect(response.status).toBe(201);
    const { booking } = response.body;
    const ticketSubtotal = getSeatPrice('vip', showtime) * 2;
    const subtotal = ticketSubtotal + 119_000;
    const discount = Math.min(Math.round(subtotal * 0.1), 50_000);
    expect(booking).toMatchObject({
      userId: user.id,
      status: 'confirmed',
      promoCode: 'LUMINA10',
      pricing: { ticketSubtotal, concessionSubtotal: 119_000, discount, total: subtotal - discount },
    });
    expect(booking.code).toMatch(/^LMN[A-Z2-9]{7}$/);
    expect(booking.seats.map((seat: { label: string }) => seat.label)).toEqual(['D6', 'D7']);

    // Booked seats are unavailable to everyone and the hold is consumed.
    const availability = await client.get(`/api/showtimes/${showtime.id}/seats`);
    expect(availability.body.unavailableSeatIds).toEqual(expect.arrayContaining(['D6', 'D7']));
    expect(availability.body.myHold).toBeNull();

    const mine = await client.get('/api/bookings/mine');
    expect(mine.body.bookings).toHaveLength(1);
  });

  it('rejects invalid promotions', async () => {
    const { client } = await signInAs(context, 'customer');
    const response = await book(client, ['G4', 'G5'], { promoCode: 'COMBO30' });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('PROMOTION_INVALID');
  });

  it('rejects expired holds', async () => {
    const { client } = await signInAs(context, 'customer');
    const hold = await holdSeats(client, ['H4', 'H5']);
    await context.db.query(`update seat_holds set expires_at = now() - interval '1 second' where id = $1`, [hold.body.hold.id]);

    const response = await client.post('/api/bookings', {
      holdId: hold.body.hold.id,
      concessions: {},
      promoCode: null,
      customer: validCustomer,
      paymentMethod: 'card',
    });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('HOLD_EXPIRED');
  });

  it('hides bookings from other customers but not from staff', async () => {
    const owner = await signInAs(context, 'customer');
    const stranger = await signInAs(context, 'customer');
    const staff = await signInAs(context, 'staff');
    const { booking } = (await book(owner.client, ['I6', 'I7'])).body;

    expect((await stranger.client.get(`/api/bookings/${booking.id}`)).status).toBe(404);
    expect((await staff.client.get(`/api/bookings/${booking.id}`)).status).toBe(200);
    expect((await owner.client.get('/api/bookings/not-a-uuid')).status).toBe(404);
  });

  it('cancels a booking and releases its seats', async () => {
    const { client } = await signInAs(context, 'customer');
    const { booking } = (await book(client, ['F6', 'F7'])).body;

    const cancelled = await client.post(`/api/bookings/${booking.id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.booking.status).toBe('cancelled');
    expect((await client.post(`/api/bookings/${booking.id}/cancel`)).status).toBe(409);

    const other = await signInAs(context, 'customer');
    expect((await holdSeats(other.client, ['F6', 'F7'])).status).toBe(201);
  });
});

describe('ticket check-in', () => {
  it('is restricted to staff and enforces the check-in window', async () => {
    const customer = await signInAs(context, 'customer');
    const staff = await signInAs(context, 'staff');
    const { booking } = (await book(customer.client, ['E8', 'E9'])).body;

    expect((await customer.client.get(`/api/staff/bookings/lookup?code=${booking.code}`)).status).toBe(403);

    const lookup = await staff.client.get(`/api/staff/bookings/lookup?code=${booking.code.toLowerCase()}`);
    expect(lookup.status).toBe(200);
    expect(lookup.body.booking.id).toBe(booking.id);

    // Tomorrow's screening: too early to check in.
    const tooEarly = await staff.client.post(`/api/staff/bookings/${booking.id}/check-in`);
    expect(tooEarly.status).toBe(409);

    await context.db.query(
      `update bookings set starts_at = now() + interval '30 minutes', ends_at = now() + interval '150 minutes' where id = $1`,
      [booking.id],
    );
    const checkedIn = await staff.client.post(`/api/staff/bookings/${booking.id}/check-in`);
    expect(checkedIn.status).toBe(200);
    expect(checkedIn.body.booking.checkedInAt).not.toBeNull();

    expect((await staff.client.post(`/api/staff/bookings/${booking.id}/check-in`)).status).toBe(409);
    // Checked-in tickets cannot be cancelled.
    expect((await customer.client.post(`/api/bookings/${booking.id}/cancel`)).status).toBe(409);
  });
});
