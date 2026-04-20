require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    console.log('Connecting to DB to fix partner_applications table...');
    await pool.query('DROP TABLE IF EXISTS partner_applications CASCADE;');
    await pool.query(`
      CREATE TABLE partner_applications (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name       TEXT NOT NULL,
        business_name   TEXT NOT NULL,
        email           TEXT NOT NULL,
        phone           TEXT NOT NULL,
        city            TEXT NOT NULL,
        experience_type TEXT NOT NULL,
        description     TEXT,
        website         TEXT,
        gdpr_consent    BOOLEAN NOT NULL DEFAULT false,
        terms_accepted  BOOLEAN NOT NULL DEFAULT false,
        status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'approved', 'rejected')),
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      );
    `);
    console.log('Successfully recreated partner_applications schema!');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

run();
