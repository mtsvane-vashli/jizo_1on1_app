-- backend/migrations/schema.sql (マルチテナント対応版)

-- どの企業が存在するかを管理するテーブル
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザーがどの企業に所属するかを定義
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- ★追加
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- ★役割(admin/user)を追加
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, username) -- ★ユーザー名は企業内でユニーク
);

-- 部下がどの企業に所属するかを定義
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- ★追加
    name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, name) -- ★部下名も企業内でユニーク
);

-- 会話がどの企業に属するかを定義
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- ★追加
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE, -- ★必須に変更 & CASCADE追加
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    theme TEXT,
    engagement TEXT,
    summary TEXT,
    next_actions TEXT
);

-- 以下のテーブルは conversations に紐づくため、間接的に保護されます
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL,
    text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS keywords (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL
);-- backend/migrations/schema.sql (マルチテナント対応・機能改修版)

-- どの企業が存在するかを管理するテーブル
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザーがどの企業に所属するかを定義
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, username)
);

-- 部下がどの企業に所属するかを定義
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, name)
);

-- 会話がどの企業に属するかを定義
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    theme TEXT,
    engagement TEXT,
    summary TEXT,
    next_actions TEXT,
    transcript TEXT,
    memo TEXT,
    mind_map_data JSONB
);

-- 会話のメッセージを保存するテーブル
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL, -- 'user', 'employee', or 'ai'
    message TEXT NOT NULL,
    suggested_questions JSONB, -- ★ AIが生成した質問候補をJSON形式で保存
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 会話のキーワードを保存するテーブル
CREATE TABLE IF NOT EXISTS keywords (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL
);

-- 会話の感情分析結果を保存するテーブル
CREATE TABLE IF NOT EXISTS sentiments (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    overall_sentiment TEXT NOT NULL,
    positive_score REAL,
    negative_score REAL,
    neutral_score REAL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS sentiments (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    overall_sentiment TEXT NOT NULL,
    positive_score REAL,
    negative_score REAL,
    neutral_score REAL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);