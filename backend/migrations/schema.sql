-- backend/migrations/schema.sql
-- 組織・ユーザー・部下（従業員）・会話と、そのアクセス制御の基盤スキーマ
-- ポイント:
--  1) users.role = 'admin' | 'user'
--  2) 多対多割当: user_employee_links（同一組織内のみを強制）
--  3) conversations は (employee_id, user_id) に紐づく（user_id は会話を行った上司）

-- =========================
-- organizations
-- =========================
CREATE TABLE IF NOT EXISTS organizations (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- users
-- =========================
CREATE TABLE IF NOT EXISTS users (
    id               SERIAL PRIMARY KEY,
    organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    username         TEXT NOT NULL,
    password         TEXT NOT NULL,
    role             TEXT NOT NULL DEFAULT 'user',  -- 'admin' or 'user'
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 組織内 username 大小無視ユニーク
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'ux_users_org_username_lower'
    ) THEN
        CREATE UNIQUE INDEX ux_users_org_username_lower
            ON users (organization_id, LOWER(username));
    END IF;
END $$;

-- 複合参照用（organization_id, id）ユニーク
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'ux_users_org_id_pair'
    ) THEN
        CREATE UNIQUE INDEX ux_users_org_id_pair
            ON users (organization_id, id);
    END IF;
END $$;

-- =========================
-- employees（部下）
-- =========================
CREATE TABLE IF NOT EXISTS employees (
    id               SERIAL PRIMARY KEY,
    organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL, -- 後方互換: "作成者/初期オーナー"
    name             TEXT NOT NULL,
    email            TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 組織内 name 大小無視ユニーク
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'ux_employees_org_name_lower'
    ) THEN
        CREATE UNIQUE INDEX ux_employees_org_name_lower
            ON employees (organization_id, LOWER(name));
    END IF;
END $$;

-- 組織内 email ユニーク（NULL は許容）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'ux_employees_org_email'
    ) THEN
        CREATE UNIQUE INDEX ux_employees_org_email
            ON employees (organization_id, email)
            WHERE email IS NOT NULL;
    END IF;
END $$;

-- 複合参照用（organization_id, id）ユニーク
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'ux_employees_org_id_pair'
    ) THEN
        CREATE UNIQUE INDEX ux_employees_org_id_pair
            ON employees (organization_id, id);
    END IF;
END $$;

-- =========================
-- user_employee_links（上司⇄部下の割当: 多対多）
--  同一 organization_id 内のみ関連付け可能（複合FKで強制）
-- =========================
CREATE TABLE IF NOT EXISTS user_employee_links (
    organization_id  INTEGER NOT NULL,
    user_id          INTEGER NOT NULL,
    employee_id      INTEGER NOT NULL,
    relation         TEXT DEFAULT 'member',  -- 将来拡張用（viewer/owner など）。現状 'member' 固定でOK
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id, employee_id),
    FOREIGN KEY (organization_id, user_id)
        REFERENCES users (organization_id, id)
        ON DELETE CASCADE,
    FOREIGN KEY (organization_id, employee_id)
        REFERENCES employees (organization_id, id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_uel_user ON user_employee_links (user_id, organization_id);
CREATE INDEX IF NOT EXISTS ix_uel_employee ON user_employee_links (employee_id, organization_id);

-- =========================
-- conversations
--  user_id: 会話を行った上司（admin も可）
-- =========================
CREATE TABLE IF NOT EXISTS conversations (
    id               SERIAL PRIMARY KEY,
    employee_id      INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
    theme            TEXT,
    engagement       TEXT,
    summary          TEXT,
    next_actions     TEXT,
    transcript       TEXT,
    memo             TEXT,
    mind_map_data    JSONB,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_conversations_employee_id ON conversations (employee_id);
CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations (user_id);

-- =========================
-- messages
-- =========================
CREATE TABLE IF NOT EXISTS messages (
    id               SERIAL PRIMARY KEY,
    conversation_id  INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender           TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
    text             TEXT NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages (conversation_id);

-- =========================
-- keywords
-- =========================
CREATE TABLE IF NOT EXISTS keywords (
    id               SERIAL PRIMARY KEY,
    conversation_id  INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    keyword          TEXT NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_keywords_conversation_id ON keywords (conversation_id);

-- =========================
-- sentiments
-- =========================
CREATE TABLE IF NOT EXISTS sentiments (
    id                 SERIAL PRIMARY KEY,
    conversation_id    INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    overall_sentiment  TEXT NOT NULL,
    positive_score     REAL,
    negative_score     REAL,
    neutral_score      REAL,
    timestamp          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_sentiments_conversation_id ON sentiments (conversation_id);
