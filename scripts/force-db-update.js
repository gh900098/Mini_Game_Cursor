const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'minigame',
    password: 'postgres',
    port: 5432,
});

async function forceUpdate() {
    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Force Add Column
        console.log('Ensuring "level" column exists...');
        await client.query('ALTER TABLE roles ADD COLUMN IF NOT EXISTS level integer DEFAULT 1');
        console.log('Column check done.');

        // 2. Force Update Data
        const updates = [
            { slug: 'super_admin', level: 100 },
            { slug: 'company_admin', level: 80 },
            { slug: 'staff', level: 10 },
            { slug: 'player', level: 1 }
        ];

        for (const role of updates) {
            const res = await client.query('UPDATE roles SET level = $1 WHERE slug = $2', [role.level, role.slug]);
            console.log(`Updated ${role.slug} to level ${role.level}. Rows affected: ${res.rowCount}`);
        }

        // 3. Verify
        const res = await client.query('SELECT name, slug, level FROM roles');
        console.table(res.rows);

        await client.end();
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

forceUpdate();
