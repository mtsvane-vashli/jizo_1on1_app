CREATE TABLE IF NOT EXISTS maintenance_messages (
    id INTEGER PRIMARY KEY DEFAULT 1,
    content TEXT NOT NULL DEFAULT '',
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO maintenance_messages (id, content)
VALUES (1, '')
ON CONFLICT (id) DO NOTHING;
