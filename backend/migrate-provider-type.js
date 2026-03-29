const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/experium'
});

async function runMigration() {
  try {
    console.log('Adding provider_type column to experiences table...');
    await pool.query(`
      ALTER TABLE experiences 
      ADD COLUMN IF NOT EXISTS provider_type TEXT NOT NULL DEFAULT 'service' 
      CHECK (provider_type IN ('accommodation', 'service'));
    `);
    console.log('✅ Migration applied successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
