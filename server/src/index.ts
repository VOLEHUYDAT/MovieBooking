import { createApp, createServices } from './app';
import { loadConfig, loadEnvFile } from './config/env';
import { createDatabase } from './db/createDatabase';
import { runMigrations } from './db/migrator';
import { seedDemoData } from './db/seed/seedDemoData';

const CLEANUP_INTERVAL_MS = 5 * 60_000;

async function main() {
  loadEnvFile();
  const config = loadConfig();
  const db = await createDatabase(config.database);

  const applied = await runMigrations(db);
  if (applied.length > 0) console.log(`[db] applied migrations: ${applied.join(', ')}`);

  if (config.seedDemoData) {
    const seeded = await seedDemoData(db);
    if (seeded) console.log('[db] seeded demo accounts and bookings (see README for credentials)');
  }

  const services = createServices(db, config);
  const app = createApp({ db, config, services });
  const server = app.listen(config.port, () => {
    const target = db.driver === 'postgres' ? 'PostgreSQL (DATABASE_URL)' : `PGlite (${config.database.pgliteDataDir})`;
    console.log(`[api] listening on http://localhost:${config.port} · database: ${target}`);
  });

  const cleanupTimer = setInterval(() => {
    Promise.all([services.sessions.deleteExpired(), services.bookings.cleanupExpiredHolds()]).catch((error) =>
      console.error('[api] cleanup failed', error),
    );
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();

  const shutdown = (signal: string) => {
    console.log(`[api] ${signal} received, shutting down`);
    clearInterval(cleanupTimer);
    server.close(() => {
      db.close().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[api] failed to start', error);
  process.exit(1);
});
