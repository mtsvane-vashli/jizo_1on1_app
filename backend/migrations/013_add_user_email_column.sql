-- backend/migrations/013_add_user_email_column.sql
-- 目的: パスワードリセット通知用にユーザーへメールアドレス列を追加する

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email TEXT;

-- 組織内でメールアドレスの重複を避ける（大文字小文字は無視、NULL は許容）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname = 'ux_users_org_email_lower'
    ) THEN
        CREATE UNIQUE INDEX ux_users_org_email_lower
            ON users (organization_id, LOWER(email))
            WHERE email IS NOT NULL;
    END IF;
END $$;
