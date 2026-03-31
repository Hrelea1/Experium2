import 'dotenv/config';
import { query } from '../src/db';

async function main() {
  try {
    await query(`ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT false`);
    console.log('Migration completed: Added is_starred to provider_profiles');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
