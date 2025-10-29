import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { env } from '@/lib/env';

// Create connection pool
// Determine whether to enable SSL. By default we only enable SSL in production,
// but also respect explicit ssl/sslmode query params in DATABASE_URL, or the
// PGSSLMODE environment variable so a developer can force SSL on/off for e.g.
// remote DBs or local development without flipping NODE_ENV.
let useSsl = false;
try {
  const url = new URL(env.DATABASE_URL);
  const sslParam = (url.searchParams.get('sslmode') || url.searchParams.get('ssl') || '').toLowerCase();
  const pgSslMode = (process.env.PGSSLMODE || '').toLowerCase();

  // Check PGSSLMODE environment variable first (explicit override)
  if (pgSslMode === 'disable' || pgSslMode === 'allow') {
    useSsl = false;
  } else if (pgSslMode === 'require' || pgSslMode === 'verify-ca' || pgSslMode === 'verify-full') {
    useSsl = true;
  }
  // Then check URL parameters
  else if (sslParam === 'disable' || sslParam === 'false') {
    useSsl = false;
  } else if (sslParam === 'require' || sslParam === 'true') {
    useSsl = true;
  }
  // Finally fall back to NODE_ENV
  else if (env.NODE_ENV === 'production') {
    useSsl = true;
  }
} catch (err) {
  // If DATABASE_URL isn't a full URL for some reason, fall back to PGSSLMODE or NODE_ENV check
  console.warn('Failed to parse DATABASE_URL, falling back to PGSSLMODE/NODE_ENV for SSL determination:', err);
  const pgSslMode = (process.env.PGSSLMODE || '').toLowerCase();
  if (pgSslMode === 'disable' || pgSslMode === 'allow') {
    useSsl = false;
  } else if (pgSslMode === 'require' || pgSslMode === 'verify-ca' || pgSslMode === 'verify-full') {
    useSsl = true;
  } else {
    useSsl = env.NODE_ENV === 'production';
  }
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

export type DbConnection = typeof db;