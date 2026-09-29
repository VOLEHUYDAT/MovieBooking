import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { getUpcomingDateKeys } from '@shared/lib/date';
import { getShowtimesForMovie, isShowtimeBookable } from '@shared/services/showtimeService';
import type { Showtime, UserRole } from '@shared/types/domain';
import { createApp, createServices } from '../../src/app';
import { loadConfig } from '../../src/config/env';
import type { Database } from '../../src/db/database';
import { runMigrations } from '../../src/db/migrator';
import { createPgliteDatabase } from '../../src/db/pgliteDatabase';
import { hashPassword } from '../../src/modules/auth/passwordHasher';
import { createUserRepository } from '../../src/modules/users/userRepository';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../../src/http/middleware/security';

export const TEST_PASSWORD = 'Password123';

export interface TestContext {
  db: Database;
  app: ReturnType<typeof createApp>;
  close: () => Promise<void>;
}

export async function createTestContext(): Promise<TestContext> {
  const db = await createPgliteDatabase();
  await runMigrations(db);
  const config = loadConfig({ NODE_ENV: 'test', SIMULATED_OCCUPANCY: 'false' });
  const app = createApp({ db, config, services: createServices(db, config) });
  return { db, app, close: () => db.close() };
}

/** A cookie-persisting client that always sends the CSRF header. */
export function createClient(app: TestContext['app']) {
  const agent = request.agent(app);
  return {
    get: (url: string) => agent.get(url),
    post: (url: string, body?: object) => agent.post(url).set(CSRF_HEADER, CSRF_HEADER_VALUE).send(body ?? {}),
    patch: (url: string, body: object) => agent.patch(url).set(CSRF_HEADER, CSRF_HEADER_VALUE).send(body),
    delete: (url: string) => agent.delete(url).set(CSRF_HEADER, CSRF_HEADER_VALUE),
  };
}

export type TestClient = ReturnType<typeof createClient>;

let emailCounter = 0;
export function uniqueEmail(prefix = 'user'): string {
  emailCounter += 1;
  return `${prefix}${emailCounter}-${Date.now()}@example.com`;
}

/** Creates a user directly in the database and returns a signed-in client. */
export async function signInAs(context: TestContext, role: UserRole, overrides: { email?: string } = {}) {
  const email = overrides.email ?? uniqueEmail(role);
  const user = await createUserRepository(context.db).create({
    id: randomUUID(),
    fullName: `Test ${role}`,
    email,
    phone: '0912345678',
    role,
    passwordHash: await hashPassword(TEST_PASSWORD),
  });
  const client = createClient(context.app);
  const response = await client.post('/api/auth/login', { email, password: TEST_PASSWORD });
  if (response.status !== 200) throw new Error(`login failed: ${response.status} ${JSON.stringify(response.body)}`);
  return { client, user };
}

/** A showtime tomorrow (always open for booking). */
export function findBookableShowtime(movieId = 'quy-dao-cuoi'): Showtime {
  const [, tomorrow = ''] = getUpcomingDateKeys(2);
  const showtime = getShowtimesForMovie(movieId, tomorrow).find((candidate) => isShowtimeBookable(candidate));
  if (!showtime) throw new Error('No bookable showtime found for tests');
  return showtime;
}

export const validCustomer = { fullName: 'Nguyễn Văn Test', email: 'test@example.com', phone: '0912345678' };
