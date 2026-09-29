import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Database } from './database';

const MIGRATIONS_TABLE = 'public.schema_migrations';

/** Walks up from `startDir` to find the repository's `supabase/migrations` folder. */
export function findMigrationsDir(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(current, 'supabase', 'migrations');
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) throw new Error(`supabase/migrations not found above ${startDir}`);
    current = parent;
  }
}

/**
 * Applies pending `*.sql` migrations in filename order. Each file runs in its own transaction and
 * is recorded in `schema_migrations`, so running this repeatedly is safe.
 */
export async function runMigrations(db: Database, migrationsDir = findMigrationsDir()): Promise<string[]> {
  await db.exec(`
    create table if not exists ${MIGRATIONS_TABLE} (
      version text primary key,
      applied_at timestamptz not null default now()
    );
    alter table ${MIGRATIONS_TABLE} enable row level security;
  `);

  const { rows } = await db.query<{ version: string }>(`select version from ${MIGRATIONS_TABLE}`);
  const applied = new Set(rows.map((row) => row.version));
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  const newlyApplied: string[] = [];

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (applied.has(version)) continue;
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await db.transaction(async (tx) => {
      // Split on statement boundaries so the same code path works for pg and PGlite transactions.
      for (const statement of splitSqlStatements(sql)) await tx.query(statement);
      await tx.query(`insert into ${MIGRATIONS_TABLE} (version) values ($1)`, [version]);
    });
    newlyApplied.push(version);
  }

  return newlyApplied;
}

/** Splits a SQL script into statements, ignoring `--` comments. Migrations must not use `$$` bodies. */
export function splitSqlStatements(sql: string): string[] {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}
