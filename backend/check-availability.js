require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const res = await pool.query("SELECT * FROM availability_slots ORDER BY id DESC LIMIT 10");
  console.log(res.rows);
  pool.end();
}

main().catch(console.error);
