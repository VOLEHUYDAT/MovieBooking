import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import { hasPermission, type Permission } from '@shared/lib/permissions';
import type { AppConfig } from '../../config/env';
import type { SessionService } from '../../modules/auth/sessionService';
import { toPublicUser, type UserRepository } from '../../modules/users/userRepository';
import { HttpError } from '../httpError';

export function sessionCookieOptions(config: AppConfig, expiresAt?: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: config.session.secureCookie,
    sameSite: 'lax',
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export function clearSessionCookie(res: Response, config: AppConfig): void {
  res.clearCookie(config.session.cookieName, sessionCookieOptions(config));
}

/**
 * Resolves the session cookie to the current user and attaches it to `req.auth`.
 * Never rejects the request: unauthenticated access is decided by `requireAuth`.
 */
export function authenticate(deps: { config: AppConfig; sessions: SessionService; users: UserRepository }): RequestHandler {
  return async (req, res, next) => {
    const token: unknown = req.cookies?.[deps.config.session.cookieName];
    if (typeof token !== 'string' || token.length === 0) {
      next();
      return;
    }

    const session = await deps.sessions.resolve(token);
    const user = session ? await deps.users.findById(session.userId) : null;

    if (!session || !user || user.isLocked) {
      if (session) await deps.sessions.revoke(session.sessionId);
      clearSessionCookie(res, deps.config);
      next();
      return;
    }

    req.auth = { user: toPublicUser(user), sessionId: session.sessionId };
    next();
  };
}

export function getAuth(req: Request): NonNullable<Request['auth']> {
  if (!req.auth) throw HttpError.unauthenticated();
  return req.auth;
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  next(req.auth ? undefined : HttpError.unauthenticated());
};

export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) next(HttpError.unauthenticated());
    else if (!hasPermission(req.auth.user.role, permission)) next(HttpError.forbidden());
    else next();
  };
}
