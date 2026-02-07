const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function cleanup() {
    const client = await pool.connect();
    try {
        console.log('Starting database cleanup...');

        // 1. Get all tenant schemas
        const schemaRes = await client.query(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name LIKE 'tenant_%'
        `);

        const schemas = schemaRes.rows.map(r => r.schema_name);

        for (const schema of schemas) {
            console.log(`Dropping schema: ${schema}`);
            await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        }

        // 2. Truncate public tables
        console.log('Truncating public tables...');
        await client.query('TRUNCATE public.roles, public.users, public.tenants CASCADE');

        console.log('✓ Database cleaned successfully!');
    } catch (err) {
        console.error('✗ Cleanup failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanup();
