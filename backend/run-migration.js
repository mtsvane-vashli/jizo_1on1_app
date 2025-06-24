// backend/run-migration.js

const fs = require('fs');
const path = require('path');

// ★★★ 最初に.envファイルを読み込むように順序を変更 ★★★
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ★★★ .env読み込み後に、データベース接続を初期化する ★★★
const pool = require('./database'); 

const runMigration = async () => {
    // コマンドラインの3番目の引数としてファイルパスを受け取る
    const filePath = process.argv[2]; 
    
    if (!filePath) {
        console.error('🔴 Error: Please provide a path to the SQL migration file.');
        process.exit(1);
    }

    const fullPath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`🔴 Error: File not found at ${fullPath}`);
        process.exit(1);
    }

    console.log(`🔵 Running migration from file: ${filePath}`);
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(fullPath, 'utf8');
        await client.query(sql);
        console.log('✅ Migration successful!');
    } catch (err) {
        console.error('🔴 Error running migration:', err);
    } finally {
        await client.release();
        await pool.end();
    }
};

runMigration();