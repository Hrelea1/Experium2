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
    
    // Auto-migrate newly added columns so Railway DB stays in sync
    console.log('[DB] Running schema auto-migrations...');
    await pool.query(`
      ALTER TABLE experiences 
      ADD COLUMN IF NOT EXISTS short_description TEXT,
      ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS child_price DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS child_price_description TEXT,
      ADD COLUMN IF NOT EXISTS includes TEXT[] DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS provider_type TEXT NOT NULL DEFAULT 'service' CHECK (provider_type IN ('accommodation', 'service')),
      ADD COLUMN IF NOT EXISTS pricing_tiers JSONB DEFAULT '[]'::jsonb;
      
      ALTER TABLE availability_slots 
      ADD COLUMN IF NOT EXISTS provider_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS locked_by TEXT;

      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS participant_details JSONB DEFAULT '[]'::jsonb;

      ALTER TABLE cart_items
      ADD COLUMN IF NOT EXISTS selected_tiers JSONB DEFAULT '[]'::jsonb;
      
      ALTER TABLE provider_profiles
      ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;
    `);
    
    // Fix existing slots with NULL values that prevent them from showing up
    await pool.query(`
      UPDATE availability_slots
      SET is_locked = false WHERE is_locked IS NULL;
      
      UPDATE availability_slots
      SET booked_count = 0 WHERE booked_count IS NULL;
    `);
    console.log('[DB] ✅ Migrations completed');

  } catch (err) {
    console.error('[DB] ❌ Connection or Migration failed:', err);
    throw err;
  }
}
