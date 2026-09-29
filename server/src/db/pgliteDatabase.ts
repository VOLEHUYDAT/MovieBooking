import { PGlite, type Transaction } from '@electric-sql/pglite';
import type { Database, Queryable, QueryResult } from './database';

/**
 * Embedded PostgreSQL (WASM) used for local development without Supabase credentials and for
 * tests. `dataDir` persists to disk; omit it for an in-memory database.
 */
export async function createPgliteDatabase(dataDir?: string): Promise<Database> {
  const client = dataDir ? await PGlite.create(dataDir) : await PGlite.create();

  const run = async <Row>(executor: PGlite | Transaction, sql: string, params: unknown[] = []): Promise<QueryResult<Row>> => {
    const result = await executor.query<Row>(sql, params);
    return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
  };

  // PGlite is single-connection: serialize transactions so they never interleave.
  let queue: Promise<unknown> = Promise.resolve();

  return {
    driver: 'pglite',

    query: <Row>(sql: string, params?: unknown[]) => run<Row>(client, sql, params),

    async exec(sql: string) {
      await client.exec(sql);
    },

    transaction<T>(work: (tx: Queryable) => Promise<T>) {
      const next = queue.then(() =>
        client.transaction((tx) => work({ query: <Row>(sql: string, params?: unknown[]) => run<Row>(tx, sql, params) })),
      );
      queue = next.catch(() => undefined);
      return next;
    },

    async close() {
      await client.close();
    },
  };
}
