-- backend/migrations/003_add_transcript_column.sql
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS transcript TEXT;