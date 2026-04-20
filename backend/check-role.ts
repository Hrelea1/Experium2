import { query } from './src/db';
query('SELECT email, role FROM users LIMIT 10').then(console.log).finally(() => process.exit(0));
