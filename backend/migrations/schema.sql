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