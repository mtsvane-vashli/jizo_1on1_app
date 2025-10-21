-- backend/migrations/015_create_one_on_one_reminder_statuses.sql
-- 部下との1on1リマインダー送信状況を保持するテーブル

CREATE TABLE IF NOT EXISTS one_on_one_reminder_statuses (
    organization_id                INTEGER NOT NULL,
    user_id                        INTEGER NOT NULL,
    employee_id                    INTEGER NOT NULL,
    last_notified_conversation_id  INTEGER,
    last_notified_at               TIMESTAMPTZ,
    PRIMARY KEY (organization_id, user_id, employee_id),
    FOREIGN KEY (organization_id, user_id)
        REFERENCES users (organization_id, id)
        ON DELETE CASCADE,
    FOREIGN KEY (organization_id, employee_id)
        REFERENCES employees (organization_id, id)
        ON DELETE CASCADE,
    FOREIGN KEY (last_notified_conversation_id)
        REFERENCES conversations (id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_one_on_one_reminder_conversation
    ON one_on_one_reminder_statuses (last_notified_conversation_id);
