import { existsSync } from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config/env';
import type { Database } from './db/database';
import { authenticate } from './http/middleware/authentication';
import { errorHandler, notFoundHandler } from './http/middleware/errorHandler';
import { corsForOrigin, requestLogger, requireCsrfHeader } from './http/middleware/security';
import { createAdminRouter } from './modules/admin/adminRouter';
import { createAdminService } from './modules/admin/adminService';
import { createAuthRouter } from './modules/auth/authRouter';
import { createAuthService } from './modules/auth/authService';
import { createLoginThrottle } from './modules/auth/loginThrottle';
import { createSessionService } from './modules/auth/sessionService';
import { createBookingService } from './modules/bookings/bookingService';
import { createBookingsRouter } from './modules/bookings/bookingsRouter';
import { createUserRepository } from './modules/users/userRepository';

export function createServices(db: Database, config: AppConfig) {
  const users = createUserRepository(db);
  const sessions = createSessionService(db);
  return {
    users,
    sessions,
    auth: createAuthService({ users, sessions, throttle: createLoginThrottle() }),
    bookings: createBookingService(db, { simulatedOccupancy: config.simulatedOccupancy }),
    admin: createAdminService(db, sessions),
  };
}

export type Services = ReturnType<typeof createServices>;

export function createApp({ db, config, services = createServices(db, config) }: { db: Database; config: AppConfig; services?: Services }) {
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(helmet({ contentSecurityPolicy: config.env === 'production' ? undefined : false }));
  if (config.env === 'development') app.use(requestLogger);

  const api = express.Router();
  api.use(corsForOrigin(config.clientOrigin));
  api.use(express.json({ limit: '32kb' }));
  api.use(cookieParser());
  api.use(requireCsrfHeader);
  api.use(authenticate({ config, sessions: services.sessions, users: services.users }));

  api.get('/health', (_req, res) => {
    res.json({ status: 'ok', database: db.driver, time: new Date().toISOString() });
  });
  api.use('/auth', createAuthRouter({ config, auth: services.auth }));
  api.use('/admin', createAdminRouter({ admin: services.admin }));
  api.use(createBookingsRouter({ bookings: services.bookings }));
  api.use(notFoundHandler);
  api.use(errorHandler);

  app.use('/api', api);

  // In production the API also serves the built web app (single deployable unit).
  const clientDist = path.resolve(process.cwd(), '../client/dist');
  if (config.env === 'production' && existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
