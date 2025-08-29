-- backend/migrations/007_update_messages_columns.sql
-- messages テーブルをコード仕様に合わせて整合
-- 1) message(TEXT) と suggested_questions(JSONB) を追加（なければ）
-- 2) 既存の text 列から backfill
-- 3) text 列を削除（あれば）

-- 1) 列追加
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS message TEXT;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS suggested_questions JSONB;

-- 2) backfill（NULL のものに限る）
UPDATE messages
   SET message = text
 WHERE message IS NULL
   AND text IS NOT NULL;

-- 3) 旧カラムを削除（存在する場合）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'text'
    ) THEN
        ALTER TABLE messages DROP COLUMN text;
    END IF;
END $$;

