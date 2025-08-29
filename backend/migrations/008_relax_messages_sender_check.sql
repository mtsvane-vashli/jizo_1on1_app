-- backend/migrations/008_relax_messages_sender_check.sql
-- messages.sender の CHECK 制約を 'user'|'ai' から 'user'|'ai'|'employee' に拡張

ALTER TABLE messages
    DROP CONSTRAINT IF EXISTS messages_sender_check;

ALTER TABLE messages
    ADD CONSTRAINT messages_sender_check
    CHECK (sender IN ('user', 'ai', 'employee'));

