import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  /** Supabase Postgres connection string. When empty, an embedded PGlite database is used. */
  DATABASE_URL: z.string().trim().optional(),
  DATABASE_SSL: z.enum(['auto', 'true', 'false']).default('auto'),
  PGLITE_DATA_DIR: z.string().default('.pglite'),
  /** Origin allowed to call the API with credentials (only needed when not using the Vite proxy). */
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  SESSION_COOKIE_NAME: z.string().default('lumina_session'),
  COOKIE_SECURE: booleanString.optional(),
  TRUST_PROXY: booleanString.default(false),
  SEED_DEMO_DATA: booleanString.optional(),
  /** Simulate walk-in/partner sales so seat maps look realistic in the demo. */
  SIMULATED_OCCUPANCY: booleanString.default(true),
  RATE_LIMIT_ENABLED: booleanString.optional(),
});

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  database: { url: string | null; ssl: boolean; pgliteDataDir: string | null };
  clientOrigin: string;
  session: { cookieName: string; secureCookie: boolean };
  trustProxy: boolean;
  seedDemoData: boolean;
  simulatedOccupancy: boolean;
  rateLimitEnabled: boolean;
}

function isLocalHost(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  const env = parsed.data;
  const databaseUrl = env.DATABASE_URL ? env.DATABASE_URL : null;
  const isProduction = env.NODE_ENV === 'production';

  if (isProduction && !databaseUrl) {
    throw new Error('DATABASE_URL is required in production (Supabase connection string).');
  }

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    database: {
      url: databaseUrl,
      ssl: databaseUrl ? (env.DATABASE_SSL === 'auto' ? !isLocalHost(databaseUrl) : env.DATABASE_SSL === 'true') : false,
      pgliteDataDir: env.NODE_ENV === 'test' ? null : path.resolve(env.PGLITE_DATA_DIR),
    },
    clientOrigin: env.CLIENT_ORIGIN,
    session: { cookieName: env.SESSION_COOKIE_NAME, secureCookie: env.COOKIE_SECURE ?? isProduction },
    trustProxy: env.TRUST_PROXY,
    seedDemoData: env.SEED_DEMO_DATA ?? !isProduction,
    simulatedOccupancy: env.SIMULATED_OCCUPANCY,
    rateLimitEnabled: env.RATE_LIMIT_ENABLED ?? env.NODE_ENV !== 'test',
  };
}

/** Loads `.env` from the working directory when present (Node's built-in loader, no dotenv needed). */
export function loadEnvFile(file = '.env'): void {
  if (existsSync(file)) process.loadEnvFile(file);
}
