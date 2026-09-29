import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, createTestContext, findBookableShowtime, signInAs, TEST_PASSWORD, validCustomer, type TestContext } from './helpers/testContext';

let context: TestContext;

beforeAll(async () => {
  context = await createTestContext();
});

afterAll(async () => {
  await context.close();
});

describe('admin access control', () => {
  it('only lets admins read reports and manage users', async () => {
    const customer = await signInAs(context, 'customer');
    const staff = await signInAs(context, 'staff');
    const admin = await signInAs(context, 'admin');

    expect((await customer.client.get('/api/admin/stats')).status).toBe(403);
    expect((await staff.client.get('/api/admin/stats')).status).toBe(403);
    expect((await staff.client.get('/api/admin/users')).status).toBe(403);
    expect((await staff.client.get('/api/admin/bookings')).status).toBe(200);
    expect((await admin.client.get('/api/admin/stats')).status).toBe(200);
  });
});

describe('admin reports', () => {
  it('aggregates revenue from confirmed bookings', async () => {
    const admin = await signInAs(context, 'admin');
    const customer = await signInAs(context, 'customer');
    const showtime = findBookableShowtime('chan-troi-lua');

    const hold = await customer.client.post('/api/holds', { showtimeId: showtime.id, seatIds: ['E6', 'E7'] });
    const created = await customer.client.post('/api/bookings', {
      holdId: hold.body.hold.id,
      concessions: {},
      promoCode: null,
      customer: validCustomer,
      paymentMethod: 'card',
    });
    expect(created.status).toBe(201);

    const stats = await admin.client.get('/api/admin/stats');
    expect(stats.body.totals.revenue).toBe(created.body.booking.pricing.total);
    expect(stats.body.totals.ticketsSold).toBe(2);
    expect(stats.body.revenueByDay).toHaveLength(7);
    expect(stats.body.revenueByDay.at(-1).revenue).toBe(created.body.booking.pricing.total);
    expect(stats.body.revenueByMovie[0]).toMatchObject({ movieId: 'chan-troi-lua', tickets: 2 });

    const list = await admin.client.get(`/api/admin/bookings?search=${created.body.booking.code}`);
    expect(list.body).toMatchObject({ total: 1, page: 1 });

    // Admins can cancel any customer's booking.
    const cancelled = await admin.client.post(`/api/bookings/${created.body.booking.id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.booking.cancelledBy).toBe(admin.user.id);
  });
});

describe('user management', () => {
  it('changes roles and locks accounts, signing locked users out', async () => {
    const admin = await signInAs(context, 'admin');
    const target = await signInAs(context, 'customer');

    const promoted = await admin.client.patch(`/api/admin/users/${target.user.id}`, { role: 'staff' });
    expect(promoted.status).toBe(200);
    expect(promoted.body.user.role).toBe('staff');
    expect((await target.client.get('/api/auth/me')).body.user.role).toBe('staff');

    const locked = await admin.client.patch(`/api/admin/users/${target.user.id}`, { isLocked: true });
    expect(locked.body.user.isLocked).toBe(true);
    expect((await target.client.get('/api/auth/me')).body.user).toBeNull();

    const login = await createClient(context.app).post('/api/auth/login', { email: target.user.email, password: TEST_PASSWORD });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('prevents admins from changing their own access or removing the last admin', async () => {
    const context2 = await createTestContext();
    try {
      const onlyAdmin = await signInAs(context2, 'admin');
      const self = await onlyAdmin.client.patch(`/api/admin/users/${onlyAdmin.user.id}`, { role: 'customer' });
      expect(self.status).toBe(409);

      const secondAdmin = await signInAs(context2, 'admin');
      expect((await secondAdmin.client.patch(`/api/admin/users/${onlyAdmin.user.id}`, { isLocked: true })).status).toBe(200);
      // Self-demotion is always refused, so an admin can never lock the whole team out.
      expect((await secondAdmin.client.patch(`/api/admin/users/${secondAdmin.user.id}`, { role: 'staff' })).status).toBe(409);
    } finally {
      await context2.close();
    }
  });

  it('searches users', async () => {
    const admin = await signInAs(context, 'admin');
    const response = await admin.client.get('/api/admin/users?role=admin&pageSize=50');
    expect(response.status).toBe(200);
    expect(response.body.items.every((user: { role: string }) => user.role === 'admin')).toBe(true);
    expect(response.body.items[0]).not.toHaveProperty('passwordHash');
  });
});
