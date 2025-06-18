const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./jizo_1on1.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the jizo_1on1 database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        theme TEXT,
        engagement TEXT,
        summary TEXT,        -- ★追加
        next_actions TEXT    -- ★追加
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER,
        sender TEXT NOT NULL, -- 'user' or 'ai'
        text TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )`);

    // ★既存のテーブルにカラムを追加するためのALTER TABLE文 (初回のみ実行)
    // アプリを初めて起動する際、またはDBスキーマ変更時に一度実行されます。
    // 既にカラムが存在する場合はエラーになりますが、アプリの動作には影響しません。
    // 運用時にはマイグレーションツールを導入することが推奨されます。
    db.run(`ALTER TABLE conversations ADD COLUMN summary TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Error adding summary column:", err.message);
        }
    });
    db.run(`ALTER TABLE conversations ADD COLUMN next_actions TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Error adding next_actions column:", err.message);
        }
    });
});

module.exports = db;