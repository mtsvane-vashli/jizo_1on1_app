// backend/database.js (最終修正版)

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // ★★★ RenderのDBに接続する際は、ローカルからでも本番からでもSSLが必須です。
    // ★★★ そのため、isProductionの判定を削除し、常にSSLを有効にします。
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;