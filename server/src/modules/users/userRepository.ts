import type { User, UserRole } from '@shared/types/domain';
import type { Queryable } from '../../db/database';

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  password_hash: string;
  is_locked: boolean;
  created_at: Date;
}

export interface UserRecord extends User {
  passwordHash: string;
}

const USER_COLUMNS = 'id, full_name, email, phone, role, password_hash, is_locked, created_at';

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isLocked: row.is_locked,
    createdAt: new Date(row.created_at).toISOString(),
    passwordHash: row.password_hash,
  };
}

/** Strips credential material before a user leaves the server. */
export function toPublicUser(record: UserRecord): User {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...user } = record;
  return user;
}

export interface NewUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  passwordHash: string;
  createdAt?: string;
}

export interface UserListQuery {
  search?: string;
  role?: UserRole;
  page: number;
  pageSize: number;
}

export function createUserRepository(db: Queryable) {
  return {
    async findById(id: string): Promise<UserRecord | null> {
      const { rows } = await db.query<UserRow>(`select ${USER_COLUMNS} from app_users where id = $1`, [id]);
      return rows[0] ? toUserRecord(rows[0]) : null;
    },

    async findByEmail(email: string): Promise<UserRecord | null> {
      const { rows } = await db.query<UserRow>(`select ${USER_COLUMNS} from app_users where email = $1`, [email]);
      return rows[0] ? toUserRecord(rows[0]) : null;
    },

    async create(user: NewUser): Promise<UserRecord> {
      const { rows } = await db.query<UserRow>(
        `insert into app_users (id, full_name, email, phone, role, password_hash, created_at)
         values ($1, $2, $3, $4, $5, $6, coalesce($7::timestamptz, now()))
         returning ${USER_COLUMNS}`,
        [user.id, user.fullName, user.email, user.phone, user.role, user.passwordHash, user.createdAt ?? null],
      );
      return toUserRecord(rows[0]!);
    },

    async updateProfile(id: string, profile: { fullName: string; phone: string }): Promise<UserRecord> {
      const { rows } = await db.query<UserRow>(
        `update app_users set full_name = $2, phone = $3, updated_at = now() where id = $1 returning ${USER_COLUMNS}`,
        [id, profile.fullName, profile.phone],
      );
      return toUserRecord(rows[0]!);
    },

    async updatePassword(id: string, passwordHash: string): Promise<void> {
      await db.query('update app_users set password_hash = $2, updated_at = now() where id = $1', [id, passwordHash]);
    },

    async updateAccess(id: string, changes: { role?: UserRole; isLocked?: boolean }): Promise<UserRecord> {
      const { rows } = await db.query<UserRow>(
        `update app_users
            set role = coalesce($2, role),
                is_locked = coalesce($3, is_locked),
                updated_at = now()
          where id = $1
          returning ${USER_COLUMNS}`,
        [id, changes.role ?? null, changes.isLocked ?? null],
      );
      return toUserRecord(rows[0]!);
    },

    async countActiveAdmins(): Promise<number> {
      const { rows } = await db.query<{ count: number }>(
        `select count(*)::int as count from app_users where role = 'admin' and not is_locked`,
      );
      return rows[0]?.count ?? 0;
    },

    async count(): Promise<number> {
      const { rows } = await db.query<{ count: number }>('select count(*)::int as count from app_users');
      return rows[0]?.count ?? 0;
    },

    async list(query: UserListQuery): Promise<{ items: User[]; total: number }> {
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (query.search) {
        params.push(`%${query.search}%`);
        conditions.push(`(full_name ilike $${params.length} or email ilike $${params.length} or phone ilike $${params.length})`);
      }
      if (query.role) {
        params.push(query.role);
        conditions.push(`role = $${params.length}`);
      }
      const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';

      const { rows: countRows } = await db.query<{ total: number }>(
        `select count(*)::int as total from app_users ${where}`,
        params,
      );
      const { rows } = await db.query<UserRow>(
        `select ${USER_COLUMNS} from app_users ${where}
          order by created_at desc
          limit $${params.length + 1} offset $${params.length + 2}`,
        [...params, query.pageSize, (query.page - 1) * query.pageSize],
      );
      return { items: rows.map((row) => toPublicUser(toUserRecord(row))), total: countRows[0]?.total ?? 0 };
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
