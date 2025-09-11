-- backend/migrations/010_allow_duplicate_employee_names.sql
-- 目的: 同一組織内でも部下名の重複を許可する
-- 手順: 既存のユニークインデックスを削除し、検索用の非ユニークインデックスを作成

-- 1) ユニークインデックスを削除（存在する場合）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname = 'ux_employees_org_name_lower'
    ) THEN
        DROP INDEX ux_employees_org_name_lower;
    END IF;
END $$;

-- 2) 非ユニークインデックスを作成（存在しなければ）
CREATE INDEX IF NOT EXISTS ix_employees_org_name_lower
    ON employees (organization_id, LOWER(name));

