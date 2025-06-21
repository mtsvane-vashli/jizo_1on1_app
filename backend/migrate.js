// backend/migrate.js

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const runMigration = async () => {
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(path.resolve(__dirname, 'migrations/schema.sql'), 'utf8');
        await client.query(sql);
        console.log('Database migration successful!');
    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        client.release();
        await pool.end();
    }
};

runMigration();