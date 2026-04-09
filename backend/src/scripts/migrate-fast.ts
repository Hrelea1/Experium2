import fs from 'fs';
import path from 'path';
import { pool } from '../db'; // src/db.ts
import 'dotenv/config';

async function main() {
  try {
    const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Temporary migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
