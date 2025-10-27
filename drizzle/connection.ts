import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { env } from '@/lib/env';

// Create connection pool
// Determine whether to enable SSL. By default we only enable SSL in production,
// but also respect explicit ssl/sslmode query params in DATABASE_URL so a
// developer can force SSL for e.g. remote DBs without flipping NODE_ENV.
let useSsl = false;
try {
  const url = new URL(env.DATABASE_URL);
  const sslParam = (url.searchParams.get('sslmode') || url.searchParams.get('ssl') || '').toLowerCase();
  if (env.NODE_ENV === 'production' || sslParam === 'require' || sslParam === 'true') {
    useSsl = true;
  }
} catch (err) {
  // If DATABASE_URL isn't a full URL for some reason, fall back to NODE_ENV check
  console.warn('Failed to parse DATABASE_URL, falling back to NODE_ENV for SSL determination:', err);
  useSsl = env.NODE_ENV === 'production';
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

export type DbConnection = typeof db;