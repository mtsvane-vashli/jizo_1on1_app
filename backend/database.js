// backend/database.js (PostgreSQL版)

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// アプリケーション全体でこの pool を使ってクエリを実行する
module.exports = {
    query: (text, params) => pool.query(text, params),
};