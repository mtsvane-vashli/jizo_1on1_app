const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./jizo_1on1.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the jizo_1on1 database.');
});

db.serialize(() => {
    // conversations テーブルの作成（既に存在する場合は何もしない）
    db.run(`CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        theme TEXT,
        engagement TEXT,
        summary TEXT,
        next_actions TEXT,
        employee_id INTEGER -- ★employee_id カラムは後で ALTER TABLE で追加される
    )`);

    // messages テーブルの作成（既に存在する場合は何もしない）
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER,
        sender TEXT NOT NULL, -- 'user' or 'ai'
        text TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )`);

    // keywords テーブルの作成（既に存在する場合は何もしない）
    db.run(`CREATE TABLE IF NOT EXISTS keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        keyword TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 1, -- SQLiteではDEFAULT 1は通常ないが、概念的に
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )`);

    // sentiments テーブルの作成（既に存在する場合は何もしない）
    db.run(`CREATE TABLE IF NOT EXISTS sentiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        overall_sentiment TEXT NOT NULL,
        positive_score REAL,
        negative_score REAL,
        neutral_score REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )`);

    // ★追加: employees テーブルの作成
    db.run(`CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE, -- 部下の名前 (ユニークにする)
        email TEXT UNIQUE,         -- 部下のメールアドレス (任意、ユニークにする)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // users テーブルの作成
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE, -- ユーザー名 (ログイン用、ユニーク)
        password TEXT NOT NULL,       -- ハッシュ化されたパスワード
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ★修正/追加: conversations テーブルに employee_id カラムを追加
    // まず、カラムが存在しないか確認し、存在しない場合のみ追加
    // ★修正: db.run を db.all に変更
    db.all(`PRAGMA table_info(conversations);`, (err, tableInfo) => { // tableInfo は rows を受け取る
        if (err) {
            console.error("Error getting table info for conversations:", err.message);
            return;
        }
        // tableInfo が配列であることを確認（空の配列の場合もある）
        const hasEmployeeId = tableInfo.some(col => col.name === 'employee_id');
        if (!hasEmployeeId) {
            db.run(`ALTER TABLE conversations ADD COLUMN employee_id INTEGER`, (alterErr) => {
                if (alterErr) console.error("Error adding employee_id column:", alterErr.message);
                else console.log("Added 'employee_id' column to 'conversations' table.");
            });
        }
    });

    // 既存のALTER TABLE文も保持 (summary, next_actions)
    // ★修正: db.run を db.all に変更
    db.all(`PRAGMA table_info(conversations);`, (err, tableInfo) => {
        if (err) {
            console.error("Error getting table info:", err.message);
            return;
        }
        const hasSummary = tableInfo.some(col => col.name === 'summary');
        if (!hasSummary) {
            db.run(`ALTER TABLE conversations ADD COLUMN summary TEXT`, (alterErr) => {
                if (alterErr) console.error("Error adding summary column:", alterErr.message);
                else console.log("Added 'summary' column to 'conversations' table.");
            });
        }
    });

    // ★修正: db.run を db.all に変更
    db.all(`PRAGMA table_info(conversations);`, (err, tableInfo) => {
        if (err) {
            console.error("Error getting table info:", err.message);
            return;
        }
        const hasNextActions = tableInfo.some(col => col.name === 'next_actions');
        if (!hasNextActions) {
            db.run(`ALTER TABLE conversations ADD COLUMN next_actions TEXT`, (alterErr) => {
                if (alterErr) console.error("Error adding next_actions column:", alterErr.message);
                else console.log("Added 'next_actions' column to 'conversations' table.");
            });
        }
    });
});

module.exports = db;