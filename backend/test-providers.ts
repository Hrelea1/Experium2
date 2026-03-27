import { pool } from './src/db';

async function run() {
  try {
    const resProviders = await pool.query("SELECT u.id, u.email, u.role, p.full_name FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.role = 'provider'");
    console.log("PROVIDERS:");
    console.table(resProviders.rows);
    
    const resAll = await pool.query("SELECT u.id, u.email, u.role, p.full_name FROM users u LEFT JOIN profiles p ON p.id = u.id LIMIT 10");
    console.log("ALL USERS (Sample):");
    console.table(resAll.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
