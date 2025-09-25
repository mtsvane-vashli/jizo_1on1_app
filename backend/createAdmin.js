// createAdmin.js (デバッグログ追加版)
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const readline = require('readline');
const path = require('path');

// .envファイルのパスをプロジェクトルートに修正
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// デバッグ用: DATABASE_URLが正しく読み込まれているか確認
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const maskedDbUrl = dbUrl.replace(/:([^:@]+)@/, ':********@'); // パスワード部分をマスク
  console.log(`[DEBUG] DATABASE_URL loaded: ${maskedDbUrl}`);
} else {
  console.log('[DEBUG] DATABASE_URL is not set in .env file.');
}


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // 本番環境のDBに接続するためのSSL設定を再追加
  ssl: {
    rejectUnauthorized: false
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdmin() {
  try {
    const organizationName = await new Promise(resolve => {
      rl.question('Enter the organization name for the new admin: ', resolve);
    });

    const username = await new Promise(resolve => {
      rl.question('Enter the username for the new admin: ', resolve);
    });

    const email = await new Promise(resolve => {
      rl.question('Enter the email for the new admin (optional): ', resolve);
    });

    const password = await new Promise(resolve => {
      rl.question('Enter the password for the new admin: ', (p) => {
        if (process.stdout.isTTY) {
            const len = p.length;
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write('Enter the password for the new admin: ' + '*'.repeat(len) + '\n');
        }
        resolve(p);
      });
    });

    rl.close();

    // 1. 組織IDを取得
    const orgRes = await pool.query('SELECT id FROM organizations WHERE name = $1', [organizationName]);
    if (orgRes.rows.length === 0) {
      console.error(`Error: Organization "${organizationName}" not found.`);
      return;
    }
    const organizationId = orgRes.rows[0].id;

    // 2. パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. ユーザーをDBに挿入
    const userRes = await pool.query(
      `INSERT INTO users (organization_id, username, email, password, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [organizationId, username, email || null, hashedPassword, 'admin']
    );

    console.log(`✅ Admin user "${username}" created successfully for organization "${organizationName}" with ID: ${userRes.rows[0].id}`);

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdmin();
