const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mydb',
  password: 'password',
  port: 5432,
});
pool.query('SELECT * FROM users', (err, res) => {
  console.log(res.rows);
});