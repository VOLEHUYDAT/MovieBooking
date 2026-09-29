export interface QueryResult<Row> {
  rows: Row[];
  rowCount: number;
}

/** Minimal query interface shared by the pooled connection and transaction clients. */
export interface Queryable {
  query<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<Row>>;
}

export type DatabaseDriver = 'postgres' | 'pglite';

export interface Database extends Queryable {
  readonly driver: DatabaseDriver;
  /** Runs a multi-statement SQL script (used by migrations). */
  exec(sql: string): Promise<void>;
  /** Runs `work` inside a transaction; rolls back if it throws. */
  transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** Postgres error code for unique constraint violations. */
export const UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION;
}
