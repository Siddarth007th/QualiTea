const fs = require('fs');
const path = require('path');
const { db } = require('./db');

function initDb() {
    console.log('🔄 Initializing SQLite database...');

    const schemaPath = path.resolve(__dirname, 'schema.sql');
    let schemaSql;

    try {
        schemaSql = fs.readFileSync(schemaPath, 'utf8');
    } catch (err) {
        console.error('❌ Failed to read schema.sql:', err);
        process.exit(1);
    }

    // Use db.exec() to run multiple SQL statements at once (like table schemas)
    db.exec(schemaSql, (err) => {
        if (err) {
            console.error('❌ Error applying schema:', err.message);
        } else {
            console.log('✅ SQLite database schema initialized successfully');
            console.log(`📂 Database saved at: ${path.resolve(__dirname, 'qualitea.db')}`);
        }
    });
}

initDb();
