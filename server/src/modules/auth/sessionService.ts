import { createHash, randomBytes } from 'node:crypto';
import type { Queryable } from '../../db/database';

export const SESSION_TTL_MS = 24 * 3_600_000;
export const REMEMBERED_SESSION_TTL_MS = 30 * 24 * 3_600_000;

/** Only the SHA-256 digest of a token is stored, so a database leak cannot be replayed as sessions. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  expiresAt: Date;
}

export function createSessionService(db: Queryable) {
  return {
    async create(userId: string, options: { rememberMe: boolean; userAgent?: string }) {
      const token = randomBytes(32).toString('base64url');
      const ttl = options.rememberMe ? REMEMBERED_SESSION_TTL_MS : SESSION_TTL_MS;
      const expiresAt = new Date(Date.now() + ttl);
      await db.query('insert into user_sessions (id, user_id, expires_at, user_agent) values ($1, $2, $3, $4)', [
        hashToken(token),
        userId,
        expiresAt,
        options.userAgent?.slice(0, 255) ?? null,
      ]);
      return { token, expiresAt, persistent: options.rememberMe };
    },

    async resolve(token: string): Promise<ActiveSession | null> {
      const { rows } = await db.query<{ id: string; user_id: string; expires_at: Date }>(
        'select id, user_id, expires_at from user_sessions where id = $1 and expires_at > now()',
        [hashToken(token)],
      );
      const row = rows[0];
      return row ? { sessionId: row.id, userId: row.user_id, expiresAt: new Date(row.expires_at) } : null;
    },

    async revoke(sessionId: string): Promise<void> {
      await db.query('delete from user_sessions where id = $1', [sessionId]);
    },

    async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
      await db.query('delete from user_sessions where user_id = $1 and id <> coalesce($2, \'\')', [
        userId,
        exceptSessionId ?? null,
      ]);
    },

    async deleteExpired(): Promise<number> {
      const { rowCount } = await db.query('delete from user_sessions where expires_at <= now()');
      return rowCount;
    },
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
