import { randomUUID } from 'node:crypto';
import type { ChangePasswordRequest, LoginRequest, RegisterRequest, UpdateProfileRequest } from '@shared/types/api';
import type { User } from '@shared/types/domain';
import { normalizeEmail, normalizePhone } from '@shared/lib/validation';
import { isUniqueViolation } from '../../db/database';
import { HttpError } from '../../http/httpError';
import { toPublicUser, type UserRepository } from '../users/userRepository';
import type { LoginThrottle } from './loginThrottle';
import { getDummyPasswordHash, hashPassword, verifyPassword } from './passwordHasher';
import type { SessionService } from './sessionService';

const INVALID_CREDENTIALS = 'Email hoặc mật khẩu không đúng';

interface AuthServiceDeps {
  users: UserRepository;
  sessions: SessionService;
  throttle: LoginThrottle;
}

export function createAuthService({ users, sessions, throttle }: AuthServiceDeps) {
  return {
    async register(input: RegisterRequest, userAgent?: string) {
      const email = normalizeEmail(input.email);
      if (await users.findByEmail(email)) {
        throw new HttpError(409, 'CONFLICT', 'Email đã được sử dụng', { email: 'Email đã được sử dụng' });
      }

      try {
        const user = await users.create({
          id: randomUUID(),
          fullName: input.fullName.trim(),
          email,
          phone: normalizePhone(input.phone),
          role: 'customer',
          passwordHash: await hashPassword(input.password),
        });
        const session = await sessions.create(user.id, { rememberMe: false, userAgent });
        return { user: toPublicUser(user), session };
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new HttpError(409, 'CONFLICT', 'Email đã được sử dụng', { email: 'Email đã được sử dụng' });
        }
        throw error;
      }
    },

    async login(input: LoginRequest, userAgent?: string) {
      const email = normalizeEmail(input.email);
      const lockRemainingMs = throttle.getLockRemainingMs(email);
      if (lockRemainingMs > 0) {
        throw new HttpError(
          429,
          'TOO_MANY_ATTEMPTS',
          `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(lockRemainingMs / 1000)} giây`,
        );
      }

      const user = await users.findByEmail(email);
      // Always run a hash comparison so response time does not reveal whether the email exists.
      const isValid = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyPasswordHash()));

      if (!user || !isValid) {
        throttle.recordFailure(email);
        throw new HttpError(401, 'UNAUTHENTICATED', INVALID_CREDENTIALS);
      }
      if (user.isLocked) {
        throw new HttpError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên');
      }

      throttle.reset(email);
      const session = await sessions.create(user.id, { rememberMe: input.rememberMe, userAgent });
      return { user: toPublicUser(user), session };
    },

    async logout(sessionId: string) {
      await sessions.revoke(sessionId);
    },

    async updateProfile(userId: string, input: UpdateProfileRequest): Promise<User> {
      const user = await users.updateProfile(userId, {
        fullName: input.fullName.trim(),
        phone: normalizePhone(input.phone),
      });
      return toPublicUser(user);
    },

    async changePassword(userId: string, sessionId: string, input: ChangePasswordRequest) {
      const user = await users.findById(userId);
      if (!user) throw HttpError.unauthenticated();
      if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
        throw HttpError.badRequest('Mật khẩu hiện tại không đúng', { currentPassword: 'Mật khẩu hiện tại không đúng' });
      }
      if (input.currentPassword === input.newPassword) {
        throw HttpError.badRequest('Mật khẩu mới phải khác mật khẩu hiện tại', {
          newPassword: 'Mật khẩu mới phải khác mật khẩu hiện tại',
        });
      }
      await users.updatePassword(userId, await hashPassword(input.newPassword));
      // Sign out every other device after a password change.
      await sessions.revokeAllForUser(userId, sessionId);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
