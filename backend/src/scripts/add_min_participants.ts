import { query } from '../db';

async function main() {
  try {
    await query(`ALTER TABLE experiences ADD COLUMN min_participants INTEGER DEFAULT 1`);
    console.log("Success");
  } catch (err: any) {
    if (err.message.includes('already exists')) {
      console.log('Column already exists');
    } else {
      console.error(err);
    }
  }
}

main().then(() => process.exit(0));
