import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, createTestContext, signInAs, TEST_PASSWORD, uniqueEmail, type TestContext } from './helpers/testContext';

let context: TestContext;

beforeAll(async () => {
  context = await createTestContext();
});

afterAll(async () => {
  await context.close();
});

const registration = (email: string) => ({
  fullName: 'Trần Thị Bình',
  email,
  phone: '0987 654 321',
  password: 'Secret123',
});

describe('registration', () => {
  it('creates a customer account and signs the user in', async () => {
    const client = createClient(context.app);
    const email = uniqueEmail('Register');

    const response = await client.post('/api/auth/register', registration(email));
    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ email: email.toLowerCase(), role: 'customer', phone: '0987654321' });
    expect(response.body.user).not.toHaveProperty('passwordHash');

    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const me = await client.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email.toLowerCase());
  });

  it('rejects duplicate emails regardless of case', async () => {
    const email = uniqueEmail('dup');
    await createClient(context.app).post('/api/auth/register', registration(email));
    const response = await createClient(context.app).post('/api/auth/register', registration(email.toUpperCase()));
    expect(response.status).toBe(409);
    expect(response.body.error.fields.email).toBeDefined();
  });

  it('returns field errors for invalid input', async () => {
    const response = await createClient(context.app).post('/api/auth/register', {
      fullName: 'A',
      email: 'not-an-email',
      phone: '123',
      password: 'short',
    });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(response.body.error.fields).sort()).toEqual(['email', 'fullName', 'password', 'phone']);
  });
});

describe('login and sessions', () => {
  it('rejects wrong passwords with a generic message', async () => {
    const { user } = await signInAs(context, 'customer');
    const response = await createClient(context.app).post('/api/auth/login', { email: user.email, password: 'Wrong1234' });
    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Email hoặc mật khẩu không đúng');
  });

  it('temporarily locks an account after repeated failures', async () => {
    const { user } = await signInAs(context, 'customer');
    const client = createClient(context.app);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await client.post('/api/auth/login', { email: user.email, password: 'Wrong1234' });
    }
    const response = await client.post('/api/auth/login', { email: user.email, password: TEST_PASSWORD });
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('TOO_MANY_ATTEMPTS');
  });

  it('logs out and invalidates the session server-side', async () => {
    const { client } = await signInAs(context, 'customer');
    expect((await client.post('/api/auth/logout')).status).toBe(204);
    expect((await client.get('/api/auth/me')).status).toBe(401);
  });

  it('requires the CSRF header on state-changing requests', async () => {
    const response = await request(context.app).post('/api/auth/login').send({ email: 'a@b.cd', password: 'x' });
    expect(response.status).toBe(403);
  });

  it('changes the password and signs out other devices', async () => {
    const { client, user } = await signInAs(context, 'customer');
    const otherDevice = createClient(context.app);
    await otherDevice.post('/api/auth/login', { email: user.email, password: TEST_PASSWORD });

    const wrongCurrent = await client.post('/api/auth/change-password', { currentPassword: 'Nope12345', newPassword: 'NewPass123' });
    expect(wrongCurrent.status).toBe(422);

    const response = await client.post('/api/auth/change-password', { currentPassword: TEST_PASSWORD, newPassword: 'NewPass123' });
    expect(response.status).toBe(204);
    expect((await client.get('/api/auth/me')).status).toBe(200);
    expect((await otherDevice.get('/api/auth/me')).status).toBe(401);

    const relogin = await createClient(context.app).post('/api/auth/login', { email: user.email, password: 'NewPass123' });
    expect(relogin.status).toBe(200);
  });

  it('updates the profile', async () => {
    const { client } = await signInAs(context, 'customer');
    const response = await client.patch('/api/auth/me', { fullName: 'Tên Mới', phone: '+84912000111' });
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ fullName: 'Tên Mới', phone: '+84912000111' });
  });
});
