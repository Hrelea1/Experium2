import { Pool } from 'pg';

// Use DATABASE_URL if provided, otherwise build from individual parts
const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      database: process.env.DB_NAME ?? 'experium',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'password',
    };

export const pool = new Pool({
  ...connectionConfig,
  max: 20,              // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('[DB] New client connected');
  }
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

// Helper: run a query with automatic client checkout/release
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB] query (${duration}ms): ${text.substring(0, 80)}`);
  }

  return result.rows as T[];
}

// Helper: get a single row (throws if not found when required)
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

// Test the connection on startup
export async function testConnection(): Promise<void> {
  try {
    await pool.query('SELECT 1');
    console.log('[DB] ✅ Connection successful');
  } catch (err) {
    console.error('[DB] ❌ Connection failed:', err);
    throw err;
  }
}
