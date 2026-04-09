import 'dotenv/config';
import { pool } from '../db';

async function main() {
  try {
    const q = `ALTER TABLE experiences ADD COLUMN IF NOT EXISTS google_maps_url TEXT;`;
    await pool.query(q);
    console.log('✅ ALTER TABLE successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
