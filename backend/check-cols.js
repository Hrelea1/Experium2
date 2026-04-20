const { pool } = require('./dist/db.js');
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'experiences'").then(res => {
  console.log(res.rows.map(r => r.column_name).join(', '));
  process.exit(0);
});
