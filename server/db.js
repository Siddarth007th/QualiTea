const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to a local SQLite database file, or a persistent disk path if provided
const dbPath = process.env.DATABASE_STORAGE_PATH || path.resolve(__dirname, 'qualitea.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to SQLite database:', err.message);
  } else {
    // Enable foreign key constraints in SQLite
    db.run('PRAGMA foreign_keys = ON;');
  }
});

// Helper function to turn typical sqlite methods into awaitable promises
// This way we can keep a similar async/await mental model in the route handlers
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve({ rows });
      }
    });
  });
};

// For INSERT/UPDATE/DELETE where we might only need the lastID or changes
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          lastID: this.lastID,
          changes: this.changes
        });
      }
    });
  });
};

// For fetching a single row
const queryOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve({ rows: row ? [row] : [] });
      }
    });
  });
};

module.exports = {
  db,
  query,
  queryOne,
  run
};
