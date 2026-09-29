import { loadConfig, loadEnvFile } from '../config/env';
import { createDatabase } from '../db/createDatabase';
import { runMigrations } from '../db/migrator';

loadEnvFile();
const config = loadConfig();
const db = await createDatabase(config.database);
try {
  const applied = await runMigrations(db);
  console.log(applied.length > 0 ? `Applied: ${applied.join(', ')}` : 'Database schema is up to date.');
} finally {
  await db.close();
}
