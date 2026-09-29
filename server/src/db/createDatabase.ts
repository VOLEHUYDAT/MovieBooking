import type { AppConfig } from '../config/env';
import type { Database } from './database';
import { createPgliteDatabase } from './pgliteDatabase';
import { createPostgresDatabase } from './postgresDatabase';

export async function createDatabase(config: AppConfig['database']): Promise<Database> {
  if (config.url) {
    return createPostgresDatabase({ connectionString: config.url, ssl: config.ssl });
  }
  return createPgliteDatabase(config.pgliteDataDir ?? undefined);
}
