-- backend/migrations/005_add_user_employee_links.sql
-- 多対多の割当テーブルを導入し、同一組織内のみ許可する
-- さらに既存 employees.user_id の情報を初期データとして移行

-- 複合参照用ユニーク（既存DBに無い可能性があるため再確認して作成）
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

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'ux_employees_org_id_pair'
    ) THEN
        CREATE UNIQUE INDEX ux_employees_org_id_pair
            ON employees (organization_id, id);
    END IF;
END $$;

-- 中間テーブル（存在しなければ作成）
CREATE TABLE IF NOT EXISTS user_employee_links (
    organization_id  INTEGER NOT NULL,
    user_id          INTEGER NOT NULL,
    employee_id      INTEGER NOT NULL,
    relation         TEXT DEFAULT 'member',
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

-- 既存の employees.user_id を初期割当に流し込む
INSERT INTO user_employee_links (organization_id, user_id, employee_id)
SELECT e.organization_id, e.user_id, e.id
FROM employees e
WHERE e.user_id IS NOT NULL
ON CONFLICT (organization_id, user_id, employee_id) DO NOTHING;
