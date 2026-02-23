require('dotenv').config();
const { db, run, queryOne } = require('./db');
const crypto = require('crypto');

async function seed() {
    console.log('🌱 Seeding SQLite database with example data...');

    try {
        // Clear existing data safely
        await run('DELETE FROM qa_results');
        await run('DELETE FROM qa_attributes');
        await run('DELETE FROM products');
        await run('DELETE FROM team_members');

        const p1 = crypto.randomUUID();
        const p2 = crypto.randomUUID();
        const p3 = crypto.randomUUID();

        // Create multiple products
        await run(`INSERT INTO products (id, name, description) VALUES (?, ?, ?)`, [p1, 'Widget Pro Max', 'Our flagship premium widget']);
        await run(`INSERT INTO products (id, name, description) VALUES (?, ?, ?)`, [p2, 'SuperCharger 5000', 'High-speed device charger with multiple ports']);
        await run(`INSERT INTO products (id, name, description) VALUES (?, ?, ?)`, [p3, 'CloudSync App', 'Desktop application for seamless cloud syncing']);

        console.log(`✅ Created products`);

        const a1 = crypto.randomUUID();
        const a2 = crypto.randomUUID();
        const a3 = crypto.randomUUID();

        // Create attributes for products
        await run(`INSERT INTO qa_attributes (id, product_id, name, description, priority, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
            [a1, p1, 'Durability Test', 'Drop test from 5 meters', 'high', 1]);
        await run(`INSERT INTO qa_attributes (id, product_id, name, description, priority, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
            [a2, p1, 'Battery Life', 'Continuous usage for 24 hours', 'high', 2]);
        await run(`INSERT INTO qa_attributes (id, product_id, name, description, priority, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
            [a3, p2, 'Charging Speed', '0 to 100 in under 30 minutes', 'high', 1]);

        console.log(`✅ Created attributes`);

        // Create a team member
        await run(`INSERT INTO team_members (id, name, email, role) VALUES (?, ?, ?, ?)`, [crypto.randomUUID(), 'Alice Smith', 'alice@qualitea.com', 'authority']);
        await run(`INSERT INTO team_members (id, name, email, role) VALUES (?, ?, ?, ?)`, [crypto.randomUUID(), 'Bob Jones', 'bob@qualitea.com', 'tester']);

        console.log('✅ Created team members');
        console.log('🎉 Seeding complete!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        db.close();
    }
}

seed();
