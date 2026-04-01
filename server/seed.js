require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:gushi_2004@localhost:5432/qa_tracker',
});

const generateData = () => {
    const products = [];
    const attributes = [];
    const teamMembers = [];
    const results = [];

    const difficulties = ['Easy', 'Medium', 'Hard'];
    const statuses = ['Pass', 'Fail', 'Semi-Pass', 'Blocked', 'In Review'];
    const priorities = ['low', 'medium', 'high'];

    // 1. Team Members
    const roles = ['tester', 'tester', 'authority', 'tester', 'tester'];
    for(let i=1; i<=5; i++) {
        teamMembers.push({
            id: crypto.randomUUID(),
            name: `User ${i}`,
            email: `user${i}@qualitea.com`,
            role: roles[i-1]
        });
    }

    // 2. Products
    const productNames = [
        'Widget Pro Max', 'SuperCharger 5000', 'CloudSync Desktop'
    ];

    productNames.forEach((name, i) => {
        const product_id = crypto.randomUUID();
        products.push({
            id: product_id,
            name: name,
            description: `A highly advanced and premium version of ${name}. Built with top tier materials.`
        });

        // 3. Attributes for each product
        for(let j=1; j<=3; j++) {
            const attr_id = crypto.randomUUID();
            attributes.push({
                id: attr_id,
                product_id: product_id,
                name: `${name} - Auto Test ${j}`,
                description: `Testing specification ${j} for the latest iteration of the product to ensure compliance.`,
                priority: priorities[Math.floor(Math.random() * priorities.length)],
                sort_order: j
            });

            // 4. QA Results for each attribute (let's do 1 result per attribute)
            const tester = teamMembers[Math.floor(Math.random() * teamMembers.length)];
            results.push({
                id: crypto.randomUUID(),
                attribute_id: attr_id,
                product_id: product_id,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
                notes: `Randomized test outcome. Tested thoroughly by ${tester.name}. Validation was performed according to QA guidelines.`,
                tested_by: tester.name
            });
        }
    });

    return { products, attributes, teamMembers, results };
};

async function seed() {
    console.log('🌱 Seeding PostgreSQL database with massive data...');
    try {
        // ── Clear existing data ───────────────────────────────
        await pool.query('DELETE FROM qa_results');
        await pool.query('DELETE FROM qa_attributes');
        await pool.query('DELETE FROM products');
        await pool.query('DELETE FROM team_members');

        const data = generateData();

        for (const p of data.products) {
            await pool.query(
                `INSERT INTO products (id, name, description) VALUES ($1,$2,$3)`,
                [p.id, p.name, p.description]
            );
        }
        console.log(`✅ ${data.products.length} Products created`);

        for (const a of data.attributes) {
            await pool.query(
                `INSERT INTO qa_attributes (id, product_id, name, description, priority, sort_order) VALUES ($1,$2,$3,$4,$5,$6)`,
                [a.id, a.product_id, a.name, a.description, a.priority, a.sort_order]
            );
        }
        console.log(`✅ ${data.attributes.length} Attributes created`);

        for(const tm of data.teamMembers) {
            await pool.query(`INSERT INTO team_members (id, name, email, role) VALUES ($1,$2,$3,$4)`,
                [tm.id, tm.name, tm.email, tm.role]);
        }
        console.log(`✅ ${data.teamMembers.length} Team members created`);

        for (const r of data.results) {
            await pool.query(
                `INSERT INTO qa_results (id, attribute_id, product_id, status, difficulty, notes, tested_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [r.id, r.attribute_id, r.product_id, r.status, r.difficulty, r.notes, r.tested_by]
            );
        }
        console.log(`✅ ${data.results.length} QA results created`);

        console.log('\n🎉 Massive Seeding complete! Open PGAdmin and QualiTea to verify.');
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        throw err;
    } finally {
        await pool.end();
    }
}

seed();
