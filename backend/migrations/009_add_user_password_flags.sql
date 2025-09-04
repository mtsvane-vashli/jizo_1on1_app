-- backend/migrations/009_add_user_password_flags.sql
-- Add flags for enforcing password change and audit timestamp

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'must_change_password'
    ) THEN
        ALTER TABLE users
        ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password_changed_at'
    ) THEN
        ALTER TABLE users
        ADD COLUMN password_changed_at TIMESTAMPTZ;
    END IF;
END $$;

