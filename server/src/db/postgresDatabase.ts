import pg from 'pg';
import type { Database, Queryable, QueryResult } from './database';

export interface PostgresOptions {
  connectionString: string;
  ssl: boolean;
  maxConnections?: number;
}

/** Removes `sslmode` so the explicit `ssl` option below is the single source of truth. */
function stripSslMode(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  return url.toString();
}

/**
 * PostgreSQL adapter (Supabase in production). Supabase requires TLS; its pooler presents a
 * certificate chain that is not in Node's default trust store, hence `rejectUnauthorized: false`.
 */
export function createPostgresDatabase({ connectionString, ssl, maxConnections = 10 }: PostgresOptions): Database {
  const pool = new pg.Pool({
    connectionString: stripSslMode(connectionString),
    ssl: ssl ? { rejectUnauthorized: false } : false,
    max: maxConnections,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on('error', (error) => console.error('[db] idle client error', error));

  const toResult = <Row>(result: pg.QueryResult): QueryResult<Row> => ({
    rows: result.rows as Row[],
    rowCount: result.rowCount ?? 0,
  });

  return {
    driver: 'postgres',

    async query<Row>(sql: string, params: unknown[] = []) {
      return toResult<Row>(await pool.query(sql, params));
    },

    async exec(sql: string) {
      await pool.query(sql);
    },

    async transaction<T>(work: (tx: Queryable) => Promise<T>) {
      const client = await pool.connect();
      const tx: Queryable = {
        query: async <Row>(sql: string, params: unknown[] = []) => toResult<Row>(await client.query(sql, params)),
      };
      try {
        await client.query('BEGIN');
        const result = await work(tx);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },

    async close() {
      await pool.end();
    },
  };
}
