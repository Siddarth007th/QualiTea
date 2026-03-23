const { Pool } = require('pg');

// Connect to PostgreSQL via DATABASE_URL in .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:gushi_2004@localhost:5432/qa_tracker',
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

// Run a SELECT that returns multiple rows
const query = (sql, params = []) => {
  return pool.query(sql, params).then(result => ({ rows: result.rows }));
};

// Run a SELECT that returns a single row
const queryOne = (sql, params = []) => {
  return pool.query(sql, params).then(result => ({ rows: result.rows }));
};

// For INSERT / UPDATE / DELETE — returns { rowCount, lastID }
const run = (sql, params = []) => {
  return pool.query(sql, params).then(result => ({
    rowCount: result.rowCount,
    changes: result.rowCount,          // compat alias
    lastID: result.rows[0]?.id || null // only if RETURNING id
  }));
};

module.exports = { pool, query, queryOne, run };
