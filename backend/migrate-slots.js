const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/experium'
});

async function runMigration() {
  try {
    console.log('Applying migration to add provider_user_id to availability_slots...');
    await pool.query(`
      ALTER TABLE availability_slots 
      ADD COLUMN IF NOT EXISTS provider_user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    `);
    console.log('✅ Migration applied successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
