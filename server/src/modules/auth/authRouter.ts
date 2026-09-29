import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { SessionResponse, UserResponse } from '@shared/types/api';
import { validateEmail, validateFullName, validateNewPassword, validatePhone } from '@shared/lib/validation';
import type { AppConfig } from '../../config/env';
import { HttpError } from '../../http/httpError';
import { clearSessionCookie, getAuth, requireAuth, sessionCookieOptions } from '../../http/middleware/authentication';
import { parseWith, validatedString } from '../../http/validation';
import type { AuthService } from './authService';

const registerSchema = z.object({
  fullName: validatedString(validateFullName),
  email: validatedString(validateEmail),
  phone: validatedString(validatePhone),
  password: validatedString(validateNewPassword),
});

const loginSchema = z.object({
  email: z.string({ error: 'Vui lòng nhập email' }).trim().min(1, 'Vui lòng nhập email').max(254),
  password: z.string({ error: 'Vui lòng nhập mật khẩu' }).min(1, 'Vui lòng nhập mật khẩu').max(200),
  rememberMe: z.boolean().default(false),
});

const updateProfileSchema = z.object({
  fullName: validatedString(validateFullName),
  phone: validatedString(validatePhone),
});

const changePasswordSchema = z.object({
  currentPassword: z.string({ error: 'Vui lòng nhập mật khẩu hiện tại' }).min(1, 'Vui lòng nhập mật khẩu hiện tại').max(200),
  newPassword: validatedString(validateNewPassword),
});

export function createAuthRouter({ config, auth }: { config: AppConfig; auth: AuthService }) {
  const router = Router();

  const credentialLimiter = rateLimit({
    windowMs: 10 * 60_000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => !config.rateLimitEnabled,
    handler: (_req, _res, next) =>
      next(new HttpError(429, 'TOO_MANY_ATTEMPTS', 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút')),
  });

  const setSessionCookie = (res: Response, session: { token: string; expiresAt: Date; persistent: boolean }) => {
    // Non-persistent sessions use a browser-session cookie; the server-side expiry still applies.
    res.cookie(config.session.cookieName, session.token, sessionCookieOptions(config, session.persistent ? session.expiresAt : undefined));
  };

  router.post('/register', credentialLimiter, async (req, res) => {
    const input = parseWith(registerSchema, req.body);
    const { user, session } = await auth.register(input, req.get('user-agent'));
    setSessionCookie(res, session);
    res.status(201).json({ user } satisfies UserResponse);
  });

  router.post('/login', credentialLimiter, async (req, res) => {
    const input = parseWith(loginSchema, req.body);
    const { user, session } = await auth.login(input, req.get('user-agent'));
    setSessionCookie(res, session);
    res.json({ user } satisfies UserResponse);
  });

  router.post('/logout', async (req, res) => {
    if (req.auth) await auth.logout(req.auth.sessionId);
    clearSessionCookie(res, config);
    res.status(204).end();
  });

  router.get('/me', (req, res) => {
    res.json({ user: req.auth?.user ?? null } satisfies SessionResponse);
  });

  router.patch('/me', requireAuth, async (req, res) => {
    const input = parseWith(updateProfileSchema, req.body);
    const user = await auth.updateProfile(getAuth(req).user.id, input);
    res.json({ user } satisfies UserResponse);
  });

  router.post('/change-password', requireAuth, async (req, res) => {
    const input = parseWith(changePasswordSchema, req.body);
    const { user, sessionId } = getAuth(req);
    await auth.changePassword(user.id, sessionId, input);
    res.status(204).end();
  });

  return router;
}
