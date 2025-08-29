-- backend/migrations/006_add_conversation_org_column.sql
-- conversations に organization_id を追加し、employees からバックフィルして整合性を保つ

-- 1) 列を追加（NULL 許容で追加して後で埋める）
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS organization_id INTEGER;

-- 2) 既存レコードを employees からバックフィル
UPDATE conversations c
   SET organization_id = e.organization_id
  FROM employees e
 WHERE c.employee_id = e.id
   AND (c.organization_id IS NULL);

-- 3) FK とインデックスを作成（存在しなければ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'fk_conversations_organization_id'
    ) THEN
        ALTER TABLE conversations
            ADD CONSTRAINT fk_conversations_organization_id
            FOREIGN KEY (organization_id)
            REFERENCES organizations(id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_conversations_organization_id ON conversations (organization_id);

-- 4) NOT NULL 制約を付与（全件バックフィル後）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_name = 'conversations'
           AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE conversations
            ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END $$;

