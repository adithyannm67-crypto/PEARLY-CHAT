-- Peerly application data cleanup script.
-- Resets all application rows while preserving schema, constraints, indexes,
-- triggers, functions, RLS policies, and relationships.
-- Does NOT touch auth.users (Supabase Auth) or Storage.
-- Run in Supabase SQL Editor as the project owner/service role.

BEGIN;

-- Delete child rows first to respect foreign-key dependencies.
DELETE FROM public.messages;
DELETE FROM public.conversation_participants;
DELETE FROM public.connection_requests;
DELETE FROM public.conversations;
DELETE FROM public.users;

COMMIT;

-- Verification: all application tables should report 0 rows.
SELECT 'messages' AS table_name, COUNT(*) AS row_count FROM public.messages
UNION ALL
SELECT 'conversation_participants', COUNT(*) FROM public.conversation_participants
UNION ALL
SELECT 'connection_requests', COUNT(*) FROM public.connection_requests
UNION ALL
SELECT 'conversations', COUNT(*) FROM public.conversations
UNION ALL
SELECT 'users', COUNT(*) FROM public.users;
