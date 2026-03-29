const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/experium'
});

async function run() {
  try {
    console.log('Connecting to database:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
    
    // Add missing columns to experiences if they don't exist
    await pool.query(`
      ALTER TABLE experiences 
      ADD COLUMN IF NOT EXISTS short_description TEXT,
      ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS provider_type TEXT NOT NULL DEFAULT 'service' CHECK (provider_type IN ('accommodation', 'service'));
    `);
    
    console.log('Successfully synced columns to the experiences table!');
  } catch (err) {
    console.error('Migration Error:', err.message);
  } finally {
    pool.end();
  }
}

run();
