import 'dotenv/config';
import { query } from '../src/db';

async function main() {
  try {
    await query(`ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT false`);
    
    // Ensure existing providers have a profile row
    await query(`
      INSERT INTO provider_profiles (user_id, mode, is_starred)
      SELECT id, 'instant', false
      FROM users WHERE role = 'provider'
      ON CONFLICT (user_id) DO NOTHING
    `);
    
    console.log('Migration completed: Added is_starred to provider_profiles and initialized legacy providers');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
