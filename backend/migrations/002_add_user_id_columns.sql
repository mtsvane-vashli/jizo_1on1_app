-- backend/migrations/002_add_user_id_columns.sql
-- 後方互換のため employees / conversations に user_id を追加（存在しなければ）

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- 既存データの仮紐付け（admin がいれば初期オーナーとして流し込む）
DO $$
DECLARE
    admin_id INTEGER;
BEGIN
    SELECT id INTO admin_id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1;

    IF admin_id IS NOT NULL THEN
        UPDATE employees    SET user_id = admin_id WHERE user_id IS NULL;
        UPDATE conversations SET user_id = admin_id WHERE user_id IS NULL;
    END IF;
END $$;
