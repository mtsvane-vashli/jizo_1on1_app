-- backend/migrations/012_allow_duplicate_employee_emails.sql
-- 目的: 同一組織内で同じメールアドレス(ID)を持つ部下を登録できるようにする

-- 1) 既存のユニークインデックスを削除
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname = 'ux_employees_org_email'
    ) THEN
        DROP INDEX ux_employees_org_email;
    END IF;
END $$;

-- 2) メールアドレス検索用の非ユニークインデックスを作成（NULL は除外）
CREATE INDEX IF NOT EXISTS ix_employees_org_email
    ON employees (organization_id, email)
    WHERE email IS NOT NULL;
