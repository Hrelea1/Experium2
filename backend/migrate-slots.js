const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/experium'
});

async function run() {
  try {
    console.log('Connecting to database:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
    
    // Add missing columns to availability_slots
    await pool.query(`
      ALTER TABLE availability_slots 
      ADD COLUMN IF NOT EXISTS provider_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS locked_by TEXT;
    `);
    
    console.log('Successfully synced columns to the availability_slots table!');
  } catch (err) {
    console.error('Migration Error:', err.message);
  } finally {
    pool.end();
  }
}

run();
