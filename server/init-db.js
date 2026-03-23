require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:gushi_2004@localhost:5432/qa_tracker',
});

async function initDb() {
    console.log('🔧 Initialising PostgreSQL schema...');
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    try {
        await pool.query(sql);
        console.log('✅ Schema created / verified.');
    } catch (err) {
        console.error('❌ Schema init failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

initDb();
