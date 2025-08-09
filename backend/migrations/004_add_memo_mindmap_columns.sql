-- backend/migrations/004_add_memo_mindmap_columns.sql
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS memo TEXT,
ADD COLUMN IF NOT EXISTS mind_map_data JSONB;
