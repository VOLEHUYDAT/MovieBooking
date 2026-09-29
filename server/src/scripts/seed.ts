import { loadConfig, loadEnvFile } from '../config/env';
import { createDatabase } from '../db/createDatabase';
import { runMigrations } from '../db/migrator';
import { seedDemoData } from '../db/seed/seedDemoData';

loadEnvFile();
const config = loadConfig();
const db = await createDatabase(config.database);
try {
  await runMigrations(db);
  const seeded = await seedDemoData(db);
  console.log(seeded ? 'Demo data seeded.' : 'Skipped: the database already has users.');
} finally {
  await db.close();
}
