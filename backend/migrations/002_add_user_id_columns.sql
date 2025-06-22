-- employeesテーブルに、どのユーザーが作成したかを記録するカラムを追加
ALTER TABLE employees
ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- conversationsテーブルに、どのユーザーの1on1かを記録するカラムを追加
ALTER TABLE conversations
ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- 既存のデータに仮の所有者を設定する（もしデータがすでにある場合）
-- ここでは、最初の管理者ユーザー(id=1 or 2)に全ての既存データを紐付けます
UPDATE employees SET user_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1) WHERE user_id IS NULL;
UPDATE conversations SET user_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1) WHERE user_id IS NULL;